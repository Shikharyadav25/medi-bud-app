from fastapi import APIRouter, Query
from services.care_service import query_nearby_healthcare

care_router = APIRouter(prefix="/v1", tags=["Nearby Healthcare Discovery"])

@care_router.get("/care")
async def get_nearby_care(
    lat: float = Query(28.6139, description="Latitude (default: New Delhi)"),
    lon: float = Query(77.2090, description="Longitude (default: New Delhi)"),
    radius: int = Query(5000, description="Search radius in meters")
):
    """
    Proxies bounded OpenStreetMap Overpass queries for hospitals, clinics,
    pharmacies, and doctors without requiring proprietary map API keys.
    """
    facilities = await query_nearby_healthcare(lat=lat, lon=lon, radius_meters=min(15000, radius))
    return facilities
