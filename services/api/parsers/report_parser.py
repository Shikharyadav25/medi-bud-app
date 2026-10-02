import re
import io
from typing import List, Dict, Any, Optional, Tuple
from pypdf import PdfReader

# Magic byte signatures
FILE_SIGNATURES = {
    "pdf": b"%PDF-",
    "png": b"\x89PNG\r\n\x1a\n",
    "jpg": b"\xff\xd8\xff",
}

CANONICAL_ALIASES: Dict[str, List[str]] = {
    "hemoglobin": ["hemoglobin", "hgb", "hb"],
    "wbc_count": ["total leukocyte count", "total wbc count", "leukocyte count", "wbc", "tlc"],
    "platelet_count": ["platelet count", "platelets", "plt"],
    "rbc_count": ["rbc count", "total rbc", "red blood cell count", "rbc"],
    "pcv": ["packed cell volume", "pcv", "hematocrit", "hct"],
    "fasting_blood_sugar": ["fasting blood sugar", "fasting glucose", "fbs", "glucose fasting"],
    "post_prandial_blood_sugar": ["post prandial blood glucose", "post prandial blood sugar", "ppbs"],
    "hba1c": ["hba1c", "glycated hemoglobin", "glycosylated hemoglobin", "a1c"],
    "hdl_cholesterol": ["hdl cholesterol", "high density lipoprotein", "hdl"],
    "ldl_cholesterol": ["ldl cholesterol", "low density lipoprotein", "ldl"],
    "vldl_cholesterol": ["vldl cholesterol", "vldl"],
    "total_cholesterol": ["total cholesterol", "serum cholesterol", "cholesterol"],
    "hs_crp": ["hs-crp", "high sensitivity crp", "hs crp"],
    "urine_microalbumin": ["urine microalbumin", "microalbumin"],
}

def validate_file_signature(content: bytes) -> str:
    """Checks raw magic bytes. Raises ValueError if unsupported."""
    if len(content) > 10 * 1024 * 1024:
        raise ValueError("File exceeds maximum allowable size of 10 MB")
    
    if content.startswith(FILE_SIGNATURES["pdf"]):
        return "application/pdf"
    if content.startswith(FILE_SIGNATURES["png"]):
        return "image/png"
    if content.startswith(FILE_SIGNATURES["jpg"]):
        return "image/jpeg"
    
    raise ValueError("Invalid file signature: Only valid PDF, PNG, and JPEG documents are permitted.")

def extract_text_from_pdf(content: bytes, max_pages: int = 20) -> List[Tuple[int, str]]:
    """Extracts text per page using pypdf with page limits."""
    try:
        reader = PdfReader(io.BytesIO(content))
        if len(reader.pages) > max_pages:
            raise ValueError(f"PDF exceeds maximum page limit of {max_pages} pages (has {len(reader.pages)}).")
        
        pages = []
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages.append((idx + 1, text))
        return pages
    except ValueError:
        raise
    except Exception:
        # Gracefully handle unreadable or malformed PDF streams
        return [(1, "")]

def parse_line_observations(line: str, page_num: int = 1) -> List[Dict[str, Any]]:
    """
    Identifies demonstrated lab tests on a line, extracts numeric/comparator values,
    and checks against explicitly stated biological reference intervals.
    """
    line_lower = line.lower()
    observations = []

    for canonical, aliases in CANONICAL_ALIASES.items():
        matched_alias = None
        for alias in aliases:
            # Match whole-word boundary for alias
            pattern = r'\b' + re.escape(alias) + r'\b'
            if re.search(pattern, line_lower):
                matched_alias = alias
                break
        
        if not matched_alias:
            continue

        # Extract value and optional comparator (<, >, <=, >=)
        val_match = re.search(r'([<>]=?)\s*([0-9]+(?:\.[0-9]+)?)|\b([0-9]+(?:\.[0-9]+)?)\b', line)
        if not val_match:
            continue

        comparator = val_match.group(1) or None
        numeric_val_str = val_match.group(2) if comparator else val_match.group(3)
        if not numeric_val_str:
            continue

        try:
            numeric_val = float(numeric_val_str)
        except ValueError:
            numeric_val = None

        value_text = f"{comparator} {numeric_val_str}".strip() if comparator else numeric_val_str

        # Extract standard unit if present
        unit_match = re.search(r'\b(g/dL|mg/dL|mg/L|/cumm|/uL|mil/uL|%)\b', line, re.IGNORECASE)
        unit = unit_match.group(1) if unit_match else ""

        # Extract explicit reference interval: e.g. "13.0 - 17.0" or "Ref: < 200" or "[70 - 99]"
        # Must appear after a reference keyword, brackets, or after the value has been consumed
        ref_text = None
        bounds_low = None
        bounds_high = None
        is_outside = None

        # Check for explicit range after a keyword like Reference, Interval, Ref, or inside brackets
        ref_section_match = re.search(r'(?:Reference|Interval|Ref|Normal|Biological)\s*:?\s*([^\n\r]+)|\[([0-9\s\.\-<>=]+)\]|\(([0-9\s\.\-<>=]+)\)', line, re.IGNORECASE)
        ref_target = ""
        if ref_section_match:
            ref_target = ref_section_match.group(1) or ref_section_match.group(2) or ref_section_match.group(3) or ""
        else:
            # Check if there are two numbers on the line where the second is a range
            # e.g. "Hemoglobin 14.5 g/dL 13.0 - 17.0"
            parts = line.split(val_match.group(0), 1)
            if len(parts) > 1:
                ref_target = parts[1]

        range_match = re.search(r'\b([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)\b', ref_target)
        less_match = re.search(r'(?:<|less than)\s*([0-9]+(?:\.[0-9]+)?)', ref_target, re.IGNORECASE)
        greater_match = re.search(r'(?:>|greater than)\s*([0-9]+(?:\.[0-9]+)?)', ref_target, re.IGNORECASE)

        if range_match:
            bounds_low = float(range_match.group(1))
            bounds_high = float(range_match.group(2))
            ref_text = f"{bounds_low} - {bounds_high}"
            if numeric_val is not None:
                is_outside = (numeric_val < bounds_low) or (numeric_val > bounds_high)
        elif less_match:
            bounds_high = float(less_match.group(1))
            ref_text = f"< {bounds_high}"
            if numeric_val is not None:
                is_outside = numeric_val >= bounds_high
        elif greater_match:
            bounds_low = float(greater_match.group(1))
            ref_text = f"> {bounds_low}"
            if numeric_val is not None:
                is_outside = numeric_val <= bounds_low

        observations.append({
            "original_label": line.strip()[:100],
            "canonical_test": canonical,
            "value_text": value_text,
            "numeric_value": numeric_val,
            "comparator": comparator,
            "unit": unit,
            "reference_text": ref_text,
            "bounds_low": bounds_low,
            "bounds_high": bounds_high,
            "is_outside_stated_interval": is_outside,
            "page": page_num,
            "source_span": line.strip(),
            "status": "proposed"
        })
        break

    return observations

def extract_observations_from_text(pages: List[Tuple[int, str]]) -> List[Dict[str, Any]]:
    """Runs line-by-line normalizer over all extracted document pages."""
    all_observations = []
    seen_tests = set()

    for page_num, text in pages:
        lines = text.split("\n")
        for line in lines:
            if not line.strip():
                continue
            obs = parse_line_observations(line, page_num=page_num)
            for item in obs:
                # Deduplicate by canonical test name per report
                if item["canonical_test"] not in seen_tests:
                    seen_tests.add(item["canonical_test"])
                    all_observations.append(item)

    return all_observations
