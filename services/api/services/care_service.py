import math
import time
from typing import Any, Dict, List, Optional

import httpx


_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 900
OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
)


class CareProviderUnavailable(RuntimeError):
    """Raised when no OpenStreetMap Overpass provider can answer the query."""


def get_cached_care(cache_key: str) -> Optional[List[Dict[str, Any]]]:
    entry = _CACHE.get(cache_key)
    if entry and (time.time() - entry["timestamp"]) < CACHE_TTL_SECONDS:
        return entry["data"]
    return None


def set_cached_care(cache_key: str, data: List[Dict[str, Any]]) -> None:
    _CACHE[cache_key] = {"timestamp": time.time(), "data": data}
    if len(_CACHE) > 100:
        oldest_key = min(_CACHE, key=lambda key: _CACHE[key]["timestamp"])
        del _CACHE[oldest_key]


def _distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Great-circle distance between two coordinates."""
    earth_radius_m = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return round(earth_radius_m * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def _facility_type(tags: Dict[str, str]) -> Optional[str]:
    for raw_value in (tags.get("amenity"), tags.get("healthcare")):
        raw_type = (raw_value or "").lower()
        if raw_type == "hospital":
            return "hospital"
        if raw_type == "pharmacy":
            return "pharmacy"
        if raw_type in {"clinic", "doctor", "doctors", "centre", "center", "health_centre"}:
            return "clinic"
    return None


def _address(tags: Dict[str, str]) -> str:
    parts = []
    street = " ".join(
        part for part in (tags.get("addr:housenumber"), tags.get("addr:street")) if part
    )
    if street:
        parts.append(street)
    for key in ("addr:suburb", "addr:city", "addr:postcode"):
        value = tags.get(key)
        if value and value not in parts:
            parts.append(value)
    return ", ".join(parts) or "Address not listed in OpenStreetMap"


def _normalize_element(
    elem: Dict[str, Any], origin_lat: float, origin_lon: float
) -> Optional[Dict[str, Any]]:
    tags = elem.get("tags") or {}
    name = tags.get("name") or tags.get("brand")
    facility_type = _facility_type(tags)
    elem_lat = elem.get("lat")
    elem_lon = elem.get("lon")
    if elem_lat is None:
        elem_lat = (elem.get("center") or {}).get("lat")
    if elem_lon is None:
        elem_lon = (elem.get("center") or {}).get("lon")
    if not name or not facility_type or elem_lat is None or elem_lon is None:
        return None

    emergency_tag = str(tags.get("emergency", "")).lower()
    opening_hours = tags.get("opening_hours")
    emergency_available = emergency_tag in {"yes", "24/7"}

    return {
        "id": f"{elem.get('type', 'osm')}-{elem.get('id')}",
        "name": name,
        "type": facility_type,
        "address": _address(tags),
        "distance_meters": _distance_meters(origin_lat, origin_lon, elem_lat, elem_lon),
        "phone": tags.get("phone") or tags.get("contact:phone"),
        "opening_hours": opening_hours,
        "emergency_available": emergency_available,
        "lat": elem_lat,
        "lon": elem_lon,
        "map_url": f"https://www.google.com/maps/dir/?api=1&destination={elem_lat},{elem_lon}",
        "osm_attribution": "Data © OpenStreetMap contributors under ODbL",
    }


async def query_nearby_healthcare(
    lat: float,
    lon: float,
    radius_meters: int = 5000,
    facility_type: str = "all",
) -> List[Dict[str, Any]]:
    """Return real healthcare facilities around the supplied GPS coordinate."""
    cache_key = f"{lat:.3f}_{lon:.3f}_{radius_meters}_{facility_type}"
    cached = get_cached_care(cache_key)
    if cached is not None:
        return cached

    amenity_pattern = {
        "hospital": "hospital",
        "clinic": "clinic|doctors",
        "pharmacy": "pharmacy",
    }.get(facility_type, "hospital|clinic|pharmacy|doctors")

    query = f"""
    [out:json][timeout:18];
    (
      node["amenity"~"^({amenity_pattern})$"](around:{radius_meters},{lat},{lon});
      way["amenity"~"^({amenity_pattern})$"](around:{radius_meters},{lat},{lon});
    );
    out center tags 100;
    """

    last_error: Optional[Exception] = None
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(20.0, connect=6.0),
        headers={"Accept": "application/json", "User-Agent": "MediBud/1.0"},
    ) as client:
        for provider_url in OVERPASS_URLS:
            try:
                # GET is used because some public instances reject form-encoded POSTs
                # while accepting the same bounded Overpass QL query via `data`.
                response = await client.get(provider_url, params={"data": query})
                response.raise_for_status()
                elements = response.json().get("elements", [])
                facilities = []
                seen_ids = set()
                for element in elements:
                    facility = _normalize_element(element, lat, lon)
                    if facility and facility["id"] not in seen_ids:
                        seen_ids.add(facility["id"])
                        facilities.append(facility)

                facilities.sort(key=lambda item: item["distance_meters"])
                result = facilities[:60]
                set_cached_care(cache_key, result)
                return result
            except (httpx.HTTPError, ValueError, TypeError) as exc:
                last_error = exc

    raise CareProviderUnavailable("OpenStreetMap nearby search is temporarily unavailable") from last_error
