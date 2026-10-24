"""Read-only API deployment checks. No credentials or patient data are sent.

Usage: .venv/bin/python scripts/check_deployment.py https://YOUR-API.onrender.com
This does not certify authenticated flows, provider quota or clinical safety.
"""

import argparse
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def request(origin, path, method="GET", headers=None):
    req = Request(origin + path, method=method, headers=headers or {})
    try:
        response = urlopen(req, timeout=90)  # Includes a free-service cold start.
    except HTTPError as exc:
        response = exc
    with response:
        body = response.read(64 * 1024)
        try:
            data = json.loads(body)
        except (ValueError, UnicodeDecodeError):
            data = None
        return response.status, response.headers, data


def check(origin, frontend, fetch=request):
    results = []
    status, _, body = fetch(origin, "/health")
    results.append(
        (
            "Process health",
            status == 200
            and isinstance(body, dict)
            and body.get("status") == "healthy",
        )
    )
    status, _, body = fetch(origin, "/ready")
    ready = (
        status == 200
        and isinstance(body, dict)
        and body.get("ready") is True
        and body.get("database_connected") is True
    )
    results.append(("Database readiness", ready))
    # A configured key is NOT proof that the AI provider accepts requests.
    print(
        "AI key configured:",
        bool(body.get("ai_configured")) if isinstance(body, dict) else "unknown",
    )
    status, _, _ = fetch(origin, "/v1/reports")
    results.append(("Anonymous report access denied", status == 401))
    status, headers, _ = fetch(
        origin,
        "/v1/reports",
        "OPTIONS",
        {
            "Origin": frontend,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    results.append(
        (
            "Frontend CORS",
            status == 200 and headers.get("access-control-allow-origin") == frontend,
        )
    )
    status, headers, _ = fetch(
        origin,
        "/v1/reports",
        "OPTIONS",
        {
            "Origin": "https://untrusted.invalid",
            "Access-Control-Request-Method": "GET",
        },
    )
    results.append(
        (
            "Untrusted origin denied",
            status == 400 and not headers.get("access-control-allow-origin"),
        )
    )
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("api_origin")
    parser.add_argument("--frontend", default="https://medi-bud-app.vercel.app")
    args = parser.parse_args()
    origin = args.api_origin.rstrip("/")
    parsed = urlsplit(origin)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.path
        or parsed.query
        or parsed.fragment
    ):
        parser.error("Use the HTTPS API origin only, without credentials or a path.")
    try:
        results = check(origin, args.frontend)
    except (OSError, URLError, TimeoutError):
        print(
            "FAIL: API unreachable or TLS/network check failed. No deployment verified."
        )
        return 1
    for label, passed in results:
        print(("PASS: " if passed else "FAIL: ") + label)
    print(
        "Still required: real sign-in, report upload/review, AI/image consent, nearby care, export and persistence after redeploy."
    )
    return 0 if all(passed for _, passed in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
