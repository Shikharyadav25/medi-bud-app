import importlib.util
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "deployment_check", ROOT / "scripts/check_deployment.py"
)
deployment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployment)


def test_render_blueprint_has_no_paid_or_ephemeral_database():
    config = yaml.safe_load((ROOT / "render.yaml").read_text())
    assert "databases" not in config
    (api,) = config["services"]
    assert api["plan"] == "free"
    assert api["dockerContext"] == "."
    assert (ROOT / api["dockerfilePath"]).is_file()
    assert api["healthCheckPath"] == "/ready"
    env = {item["key"]: item for item in api["envVars"]}
    assert env["ENVIRONMENT"]["value"] == "production"
    assert env["ENABLE_DEMO_AUTH"]["value"] == "false"
    for key in (
        "DATABASE_URL",
        "DATA_ENCRYPTION_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GEMINI_API_KEY",
    ):
        assert env[key] == {"key": key, "sync": False}


def test_smoke_check_refuses_unhealthy_or_public_data():
    def fetch(origin, path, method="GET", headers=None):
        return 200, {}, {"ready": False, "database_connected": False}

    assert not any(
        passed
        for _, passed in deployment.check(
            "https://api.invalid", "https://web.invalid", fetch
        )
    )


def test_smoke_check_covers_health_auth_and_origin_isolation():
    def fetch(origin, path, method="GET", headers=None):
        if path == "/health":
            return 200, {}, {"status": "healthy"}
        if path == "/ready":
            return (
                200,
                {},
                {"ready": True, "database_connected": True, "ai_configured": False},
            )
        if method == "OPTIONS":
            if headers["Origin"] == "https://web.invalid":
                return 200, {"access-control-allow-origin": "https://web.invalid"}, None
            return 400, {}, None
        return 401, {}, None

    assert all(
        passed
        for _, passed in deployment.check(
            "https://api.invalid", "https://web.invalid", fetch
        )
    )
