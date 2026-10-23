"""Start an isolated, loopback-only, synthetic-data web demonstration.

Run with .venv/bin/python scripts/demo.py after installing dependencies/building
the shared packages. No existing environment file or database is modified.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def write_sample(path):
    from reportlab.pdfgen import canvas

    pdf = canvas.Canvas(str(path))
    pdf.setTitle("SYNTHETIC demonstration report — not a patient record")
    for index, line in enumerate([
        "SYNTHETIC DEMONSTRATION ONLY - NOT A PATIENT RECORD",
        "Medi Bud parser/review demonstration; invented values, no clinical advice.",
        "Hemoglobin 14.2 g/dL Reference 13.0 - 17.0",
        "HbA1c 6.2 % Reference 4.0 - 5.6",
        "LDL Cholesterol 148 mg/dL Reference 0 - 100",
        "Confirm against this file before asking report-specific questions.",
    ]):
        pdf.drawString(40, 800 - index * 35, line)
    pdf.save()


def demo_environment(folder, api_port):
    env = os.environ.copy()
    # Override real credentials inherited from the terminal/.env. This demo must
    # not send synthetic documents or user-entered data to an external AI service.
    env.update({
        "ENVIRONMENT": "development",
        "ENABLE_DEMO_AUTH": "true",
        "DATABASE_URL": "sqlite:///" + str(folder / "demo.sqlite3"),
        "GEMINI_API_KEY": "",
        "SUPABASE_URL": "https://demo.supabase.co",
        "SUPABASE_ANON_KEY": "demo_anon_key",
        "SUPABASE_JWT_SECRET": "",
        "SUPABASE_SERVICE_ROLE_KEY": "",
        "ENABLE_LOCAL_EMBEDDINGS": "false",
        "NEXT_PUBLIC_API_URL": f"http://127.0.0.1:{api_port}",
        "NEXT_PUBLIC_SUPABASE_URL": "",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "",
        "NEXT_PUBLIC_DEMO_MODE": "true",
        "NEXT_DIST_DIR": ".next-demo",
        "NEXT_TELEMETRY_DISABLED": "1",
    })
    from cryptography.fernet import Fernet

    env["DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
    # Save only the disposable demo encryption key, never inherited credentials.
    key_file = folder / "encryption.key"
    descriptor = os.open(key_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as output:
        output.write(env["DATA_ENCRYPTION_KEY"])
    return env


def check_port(port):
    with socket.socket() as connection:
        # A recently stopped server may leave TIME_WAIT sockets; these should
        # not be mistaken for an unrelated live server occupying the port.
        connection.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        connection.bind(("127.0.0.1", port))


def wait_ready(url, process, timeout=120):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("A demo server stopped. Inspect the server output above.")
        try:
            with urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return
        except (OSError, TimeoutError):
            pass
        time.sleep(0.25)
    raise RuntimeError(f"Timed out waiting for {url}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-port", type=int, default=8000)
    parser.add_argument("--web-port", type=int, default=3000)
    args = parser.parse_args()
    children = []
    try:
        if args.api_port == args.web_port or not all(
            1024 <= port <= 65535 for port in (args.api_port, args.web_port)
        ):
            raise RuntimeError("Choose two different ports between 1024 and 65535.")
        check_port(args.api_port)
        check_port(args.web_port)
        pnpm = shutil.which("pnpm")
        if not pnpm or not (ROOT / "node_modules").exists():
            raise RuntimeError("Install pnpm and run pnpm install --frozen-lockfile first.")
        if not (ROOT / "packages/contracts/dist/index.js").exists():
            raise RuntimeError("Build shared packages first: pnpm build")
        (ROOT / ".demo").mkdir(exist_ok=True)
        folder = Path(tempfile.mkdtemp(prefix="session-", dir=ROOT / ".demo"))
        sample = folder / "SYNTHETIC-lab-report.pdf"
        write_sample(sample)
        env = demo_environment(folder, args.api_port)
        env["ALLOWED_ORIGINS"] = json.dumps([
            f"http://127.0.0.1:{args.web_port}",
            f"http://localhost:{args.web_port}",
        ])

        def launch(command, cwd):
            child = subprocess.Popen(command, cwd=cwd, env=env, start_new_session=True)
            children.append(child)
            return child

        print(f"\nLOCAL SYNTHETIC DEMO ONLY. Do not enter real health data.\nSample PDF: {sample}", flush=True)
        api = launch([sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1",
                      "--port", str(args.api_port), "--no-access-log"], ROOT / "services/api")
        wait_ready(f"http://127.0.0.1:{args.api_port}/ready", api)
        web = launch([pnpm, "--filter", "@medi-bud/web", "exec", "next", "dev", "--hostname",
                      "127.0.0.1", "--port", str(args.web_port)], ROOT)
        wait_ready(f"http://127.0.0.1:{args.web_port}/login", web)
        print(f"\nDEMO READY: http://127.0.0.1:{args.web_port}/login\n"
              "Choose 'Launch local demo'. Start with an empty account, then upload the sample PDF.\n"
              "Photo AI and real sign-in are intentionally disabled. Ctrl+C stops both servers.\n"
              f"Disposable encrypted data is retained in: {folder}\n", flush=True)
        while all(child.poll() is None for child in children):
            time.sleep(0.5)
        raise RuntimeError("A server stopped unexpectedly. Restart the demo for a fresh account.")
    except KeyboardInterrupt:
        return 0
    except (OSError, RuntimeError, ImportError) as error:
        print(f"Demo could not start: {error}", file=sys.stderr)
        return 1
    finally:
        for child in reversed(children):
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
        for child in children:
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()


if __name__ == "__main__":
    raise SystemExit(main())
