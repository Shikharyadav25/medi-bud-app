from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status

from services.care_service import CareProviderUnavailable, query_nearby_healthcare


care_router = APIRouter(prefix="/v1", tags=["Nearby Healthcare Discovery"])


@care_router.get("/care")
async def get_nearby_care(
    lat: float = Query(..., ge=-90, le=90, description="Device latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Device longitude"),
    radius: int = Query(5000, ge=500, le=15000, description="Search radius in meters"),
    type: Literal["all", "hospital", "clinic", "pharmacy"] = Query("all"),
):
    """Find actual OpenStreetMap care facilities around the user's location."""
    try:
        facilities = await query_nearby_healthcare(
            lat=lat,
            lon=lon,
            radius_meters=radius,
            facility_type=type,
        )
    except CareProviderUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nearby care search is temporarily unavailable. Please try again.",
        ) from exc

    if type != "all":
        facilities = [facility for facility in facilities if facility["type"] == type]
    return facilities
