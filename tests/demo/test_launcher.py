import importlib.util
import socket
import pytest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "demo_launcher", Path(__file__).resolve().parents[2] / "scripts/demo.py"
)
demo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(demo)


def test_sample_is_explicitly_synthetic_and_parseable(tmp_path):
    from pypdf import PdfReader
    path = tmp_path / "sample.pdf"
    demo.write_sample(path)
    text = PdfReader(path).pages[0].extract_text()
    assert "SYNTHETIC DEMONSTRATION ONLY" in text
    for value in ("Hemoglobin 14.2", "HbA1c 6.2", "LDL Cholesterol 148"):
        assert value in text


def test_demo_does_not_inherit_real_keys_or_database(tmp_path, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "not-a-real-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "not-a-real-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://not-real")
    env = demo.demo_environment(tmp_path, 8001)
    assert env["GEMINI_API_KEY"] == ""
    assert env["SUPABASE_SERVICE_ROLE_KEY"] == ""
    assert env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] == ""
    assert env["DATABASE_URL"] == "sqlite:///" + str(tmp_path / "demo.sqlite3")
    assert env["NEXT_PUBLIC_API_URL"] == "http://127.0.0.1:8001"
    assert env["ENABLE_DEMO_AUTH"] == "true"
    assert (tmp_path / "encryption.key").stat().st_mode & 0o777 == 0o600


def test_port_check_rejects_a_live_server_but_accepts_shutdown():
    with socket.socket() as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(("127.0.0.1", 0))
        port = server.getsockname()[1]
        server.listen()
        with pytest.raises(OSError):
            demo.check_port(port)
    demo.check_port(port)
