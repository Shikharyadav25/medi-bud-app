import time
import httpx
from typing import List, Dict, Any, Optional

# In-memory bounded cache for Overpass queries: key = f"{lat:.2f}_{lon:.2f}_{radius}"
_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 900 # 15 minutes

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def get_cached_care(cache_key: str) -> Optional[List[Dict[str, Any]]]:
    now = time.time()
    entry = _CACHE.get(cache_key)
    if entry and (now - entry["timestamp"]) < CACHE_TTL_SECONDS:
        return entry["data"]
    return None

def set_cached_care(cache_key: str, data: List[Dict[str, Any]]):
    _CACHE[cache_key] = {
        "timestamp": time.time(),
        "data": data
    }
    # Keep cache bounded to 100 entries
    if len(_CACHE) > 100:
        oldest_key = min(_CACHE.keys(), key=lambda k: _CACHE[k]["timestamp"])
        del _CACHE[oldest_key]

async def query_nearby_healthcare(lat: float, lon: float, radius_meters: int = 5000) -> List[Dict[str, Any]]:
    """
    Proxies a bounded OpenStreetMap Overpass query for hospitals, clinics,
    pharmacies, and doctors. Applies timeout, caching, and returns map navigation links.
    """
    cache_key = f"{lat:.2f}_{lon:.2f}_{radius_meters}"
    cached = get_cached_care(cache_key)
    if cached is not None:
        return cached

    # Overpass QL query bounded around (lat, lon)
    query = f"""
    [out:json][timeout:10];
    (
      node["amenity"~"hospital|clinic|pharmacy|doctors"](around:{radius_meters},{lat},{lon});
      way["amenity"~"hospital|clinic|pharmacy|doctors"](around:{radius_meters},{lat},{lon});
    );
    out center 25;
    """

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            if resp.status_code != 200:
                print(f"Overpass query failed with status {resp.status_code}")
                return []
            
            payload = resp.json()
            elements = payload.get("elements", [])
            facilities = []

            for elem in elements:
                tags = elem.get("tags", {})
                name = tags.get("name")
                if not name:
                    continue

                elem_lat = elem.get("lat") or elem.get("center", {}).get("lat")
                elem_lon = elem.get("lon") or elem.get("center", {}).get("lon")
                if not elem_lat or not elem_lon:
                    continue

                # Compute approximate distance in meters
                d_lat = (elem_lat - lat) * 111000
                d_lon = (elem_lon - lon) * 111000 * 0.85
                dist_m = int((d_lat**2 + d_lon**2)**0.5)

                facilities.append({
                    "id": str(elem.get("id")),
                    "name": name,
                    "type": tags.get("amenity", "healthcare"),
                    "address": tags.get("addr:street", tags.get("addr:city", "Local vicinity")),
                    "distance_meters": dist_m,
                    "phone": tags.get("phone", tags.get("contact:phone")),
                    "opening_hours": tags.get("opening_hours"),
                    "lat": elem_lat,
                    "lon": elem_lon,
                    "map_url": f"https://www.google.com/maps/search/?api=1&query={elem_lat},{elem_lon}",
                    "osm_attribution": "Data © OpenStreetMap contributors under ODbL"
                })

            facilities.sort(key=lambda x: x["distance_meters"])
            result = facilities[:20]
            set_cached_care(cache_key, result)
            return result
    except Exception as e:
        print(f"Error querying Overpass API: {e}")
        return []
