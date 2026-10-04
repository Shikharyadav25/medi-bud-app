import pytest

import routes.care_routes as care_routes
from services.care_service import CareProviderUnavailable, _normalize_element


SAMPLE_FACILITIES = [
    {
        "id": "node-1",
        "name": "City Hospital",
        "type": "hospital",
        "address": "1 Main Road",
        "distance_meters": 420,
        "phone": None,
        "opening_hours": "24/7",
        "emergency_available": True,
        "lat": 28.61,
        "lon": 77.21,
        "map_url": "https://www.google.com/maps/dir/?api=1&destination=28.61,77.21",
        "osm_attribution": "Data © OpenStreetMap contributors under ODbL",
    },
    {
        "id": "node-2",
        "name": "Neighbourhood Pharmacy",
        "type": "pharmacy",
        "address": "2 Main Road",
        "distance_meters": 810,
        "phone": "+91 12345 67890",
        "opening_hours": None,
        "emergency_available": False,
        "lat": 28.62,
        "lon": 77.22,
        "map_url": "https://www.google.com/maps/dir/?api=1&destination=28.62,77.22",
        "osm_attribution": "Data © OpenStreetMap contributors under ODbL",
    },
]


def test_nearby_care_uses_supplied_location_and_filters_type(client, monkeypatch):
    captured = {}

    async def fake_query(lat, lon, radius_meters, facility_type):
        captured.update(
            {"lat": lat, "lon": lon, "radius": radius_meters, "type": facility_type}
        )
        return SAMPLE_FACILITIES

    monkeypatch.setattr(care_routes, "query_nearby_healthcare", fake_query)
    response = client.get(
        "/v1/care?lat=19.076&lon=72.8777&radius=2000&type=pharmacy"
    )

    assert response.status_code == 200
    assert captured == {
        "lat": 19.076,
        "lon": 72.8777,
        "radius": 2000,
        "type": "pharmacy",
    }
    assert [facility["name"] for facility in response.json()] == ["Neighbourhood Pharmacy"]


@pytest.mark.parametrize(
    "query",
    [
        "lat=91&lon=77&radius=5000",
        "lat=28&lon=181&radius=5000",
        "lat=28&lon=77&radius=100",
        "lat=28&lon=77&radius=20000",
        "lat=28&lon=77&type=restaurant",
    ],
)
def test_nearby_care_rejects_invalid_search_parameters(client, query):
    response = client.get(f"/v1/care?{query}")
    assert response.status_code == 422


def test_nearby_care_reports_provider_outage(client, monkeypatch):
    async def unavailable(**_kwargs):
        raise CareProviderUnavailable("provider unavailable")

    monkeypatch.setattr(care_routes, "query_nearby_healthcare", unavailable)
    response = client.get("/v1/care?lat=28.61&lon=77.21")
    assert response.status_code == 503
    assert "temporarily unavailable" in response.json()["detail"]


def test_osm_element_normalization_uses_real_tags_and_distance():
    facility = _normalize_element(
        {
            "type": "way",
            "id": 42,
            "center": {"lat": 28.611, "lon": 77.211},
            "tags": {
                "name": "Community Health Centre",
                "amenity": "doctors",
                "addr:housenumber": "12",
                "addr:street": "Health Lane",
                "addr:city": "New Delhi",
                "opening_hours": "24/7",
                "emergency": "yes",
            },
        },
        28.61,
        77.21,
    )

    assert facility is not None
    assert facility["id"] == "way-42"
    assert facility["type"] == "clinic"
    assert facility["address"] == "12 Health Lane, New Delhi"
    assert 100 <= facility["distance_meters"] <= 200
    assert facility["emergency_available"] is True
