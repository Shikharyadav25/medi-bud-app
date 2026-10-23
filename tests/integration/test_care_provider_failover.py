import asyncio
import httpx
import pytest
from services import care_service


class DirectoryClient:
    responses = []
    queries = []

    def __init__(self, **kwargs):
        assert kwargs["timeout"].read <= 6

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def get(self, url, params):
        self.queries.append(params["data"])
        return httpx.Response(
            200, json=self.responses.pop(0), request=httpx.Request("GET", url)
        )


def test_partial_directory_result_retries_and_queries_healthcare_relations(monkeypatch):
    care_service._CACHE.clear()
    DirectoryClient.queries = []
    DirectoryClient.responses = [
        {"remark": "runtime error: timeout", "elements": []},
        {
            "elements": [
                {
                    "type": "relation",
                    "id": 8,
                    "center": {"lat": 28.61, "lon": 77.21},
                    "tags": {
                        "healthcare": "hospital",
                        "name": "Synthetic directory fixture",
                    },
                }
            ]
        },
    ]
    monkeypatch.setattr(care_service.httpx, "AsyncClient", DirectoryClient)
    result = asyncio.run(care_service.query_nearby_healthcare(28.61, 77.21))
    assert len(result) == 1 and result[0]["type"] == "hospital"
    assert 'nwr["healthcare"' in DirectoryClient.queries[0]
    assert len(DirectoryClient.queries) == 2


def test_all_partial_directory_results_are_outage_not_false_empty_success(monkeypatch):
    care_service._CACHE.clear()
    DirectoryClient.responses = [{"remark": "timeout", "elements": []}] * 2
    monkeypatch.setattr(care_service.httpx, "AsyncClient", DirectoryClient)
    with pytest.raises(care_service.CareProviderUnavailable):
        asyncio.run(care_service.query_nearby_healthcare(28.61, 77.21))
