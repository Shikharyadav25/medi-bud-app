import re
import io
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader

# Magic byte signatures
FILE_SIGNATURES = {
    "pdf": b"%PDF-",
    "png": b"\x89PNG\r\n\x1a\n",
    "jpg": b"\xff\xd8\xff",
}

CANONICAL_ALIASES: Dict[str, List[str]] = {
    "hemoglobin": ["hemoglobin", "hgb", "hb"],
    "wbc_count": [
        "total leukocyte count",
        "total wbc count",
        "leukocyte count",
        "wbc",
        "tlc",
    ],
    "platelet_count": ["platelet count", "platelets", "plt"],
    "rbc_count": ["rbc count", "total rbc", "red blood cell count", "rbc"],
    "pcv": ["packed cell volume", "pcv", "hematocrit", "hct"],
    "fasting_blood_sugar": [
        "fasting blood sugar",
        "fasting glucose",
        "fbs",
        "glucose fasting",
    ],
    "post_prandial_blood_sugar": [
        "post prandial blood glucose",
        "post prandial blood sugar",
        "ppbs",
    ],
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

    raise ValueError(
        "Invalid file signature: Only valid PDF, PNG, and JPEG documents are permitted."
    )


def extract_text_from_pdf(content: bytes, max_pages: int = 20) -> List[Tuple[int, str]]:
    """Extracts text per page using pypdf with page limits."""
    try:
        reader = PdfReader(io.BytesIO(content))
        if len(reader.pages) > max_pages:
            raise ValueError(
                f"PDF exceeds maximum page limit of {max_pages} pages (has {len(reader.pages)})."
            )

        pages = []
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages.append((idx + 1, text))
        return pages
    except ValueError:
        raise
    except Exception:
        # Gracefully handle unreadable or malformed PDF streams
        raise ValueError("The PDF could not be read. Upload an unlocked, valid PDF.")


def parse_line_observations(line: str, page_num: int = 1) -> List[Dict[str, Any]]:
    """
    Identifies demonstrated lab tests on a line, extracts numeric/comparator values,
    and checks against explicitly stated biological reference intervals.
    """
    # Match the most specific label first. Consume the number after that label,
    # never a number embedded in HbA1c or an earlier column/patient identifier.
    matches = []
    for canonical, aliases in CANONICAL_ALIASES.items():
        for alias in aliases:
            for match in re.finditer(
                r"\b" + re.escape(alias) + r"\b", line, re.IGNORECASE
            ):
                matches.append(
                    (match.start(), -len(alias), match.end(), canonical, match.group())
                )
    matches.sort()
    selected = []
    for start, _, end, canonical, label in matches:
        if any(start < item[1] and end > item[0] for item in selected):
            continue
        selected.append((start, end, canonical, label))
    selected.sort()
    observations = []
    for index, (start, end, canonical, label) in enumerate(selected):
        tail = line[
            end : selected[index + 1][0] if index + 1 < len(selected) else len(line)
        ]
        tail = re.sub(r"^\s*\([^)]{1,30}\)\s*", "", tail)
        value = re.match(r"\s*[:|()]?\s*([<>]=?|≤|≥)?\s*(-?\d[\d,]*(?:\.\d+)?)", tail)
        if not value:
            continue
        comparator = value.group(1)
        numeric = float(value.group(2).replace(",", ""))
        remainder = tail[value.end() :]
        unit_match = re.match(
            r"\s*(g/dL|mg/dL|mg/L|mmol/L|/cumm|/uL|mil/uL|%|10\^?3/µL|10\^?9/L)",
            remainder,
            re.IGNORECASE,
        )
        unit = unit_match.group(1) if unit_match else ""
        reference = remainder[unit_match.end() :] if unit_match else remainder
        interval = re.search(r"(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)", reference)
        bound = re.search(r"([<>]=?|≤|≥)\s*(-?\d+(?:\.\d+)?)", reference)
        low = high = outside = ref = None
        if interval:
            low, high = map(float, interval.groups())
            if low <= high:
                ref = interval.group()
                if not comparator:
                    outside = numeric < low or numeric > high
        elif bound:
            op, limit = bound.group(1), float(bound.group(2))
            ref = bound.group()
            if "<" in op or op == "≤":
                high = limit
                if not comparator:
                    outside = numeric > limit if op in ("<=", "≤") else numeric >= limit
            else:
                low = limit
                if not comparator:
                    outside = numeric < limit if op in (">=", "≥") else numeric <= limit
        observations.append(
            {
                "original_label": label,
                "canonical_test": canonical,
                "value_text": value.group(2),
                "numeric_value": numeric,
                "comparator": comparator,
                "unit": unit,
                "reference_text": ref,
                "bounds_low": low,
                "bounds_high": high,
                "is_outside_stated_interval": outside,
                "page": page_num,
                "source_span": line.strip(),
                "status": "proposed",
            }
        )
    return observations


def extract_observations_from_text(
    pages: List[Tuple[int, str]],
) -> List[Dict[str, Any]]:
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
                key = (
                    page_num,
                    item["canonical_test"],
                    item["value_text"],
                    item["source_span"],
                )
                if key not in seen_tests:
                    seen_tests.add(key)
                    all_observations.append(item)

    return all_observations
