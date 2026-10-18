"""Durable encrypted application records. PostgreSQL in production, SQLite locally.

The API is the only reader of this private table; clients use owner-checked routes.
Nested values are snapshots: callers must assign changed records back explicitly.
"""

import base64
import json
import sqlite3
import uuid
from collections.abc import MutableMapping, MutableSequence
from contextlib import contextmanager, asynccontextmanager
from contextvars import ContextVar
from pathlib import Path

from cryptography.fernet import Fernet
from config import settings

_connection = ContextVar("storage_connection", default=None)


def connect():
    if settings.DATABASE_URL.startswith("sqlite:///"):
        path = settings.DATABASE_URL.removeprefix("sqlite:///")
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(
            path, timeout=15, isolation_level=None, check_same_thread=False
        )
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
    else:
        import psycopg

        conn = psycopg.connect(
            settings.DATABASE_URL, autocommit=True, connect_timeout=5
        )
    return conn


def execute(conn, sql, args=()):
    if not settings.DATABASE_URL.startswith("sqlite:"):
        sql = sql.replace("?", "%s")
        return conn.execute(sql, args or None)
    return conn.execute(sql, args)


def initialize():
    if settings.ENVIRONMENT == "production":
        if not settings.DATABASE_URL.startswith(("postgres://", "postgresql://")):
            raise RuntimeError("Production requires a PostgreSQL DATABASE_URL")
        if not settings.DATA_ENCRYPTION_KEY:
            raise RuntimeError("Production requires DATA_ENCRYPTION_KEY")
        if settings.ENABLE_DEMO_AUTH:
            raise RuntimeError("Demo authentication is prohibited in production")
        if "demo.supabase" in settings.SUPABASE_URL:
            raise RuntimeError("Configure the real Supabase project URL")
        if "*" in settings.ALLOWED_ORIGINS:
            raise RuntimeError("Production CORS origins must be explicit")
    if settings.DATA_ENCRYPTION_KEY:
        Fernet(settings.DATA_ENCRYPTION_KEY.encode())
    with transaction():
        execute(
            _connection.get(),
            "CREATE TABLE IF NOT EXISTS app_records (namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(namespace, key))",
        )
        if (
            settings.ENVIRONMENT == "production"
            and execute(
                _connection.get(),
                "SELECT 1 FROM app_records WHERE value NOT LIKE 'enc:%' LIMIT 1",
            ).fetchone()
        ):
            raise RuntimeError(
                "Existing plaintext records must be migrated before production startup"
            )
        execute(
            _connection.get(),
            "CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, window_id BIGINT NOT NULL, count INTEGER NOT NULL)",
        )
        execute(
            _connection.get(),
            "CREATE TABLE IF NOT EXISTS revoked_accounts (user_id TEXT PRIMARY KEY)",
        )
        if not settings.DATABASE_URL.startswith("sqlite:"):
            for table in ("app_records", "rate_limits", "revoked_accounts"):
                execute(
                    _connection.get(), f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"
                )
                execute(_connection.get(), f"REVOKE ALL ON {table} FROM PUBLIC")
                for role in ("anon", "authenticated"):
                    exists = execute(
                        _connection.get(),
                        "SELECT 1 FROM pg_roles WHERE rolname=?",
                        (role,),
                    ).fetchone()
                    if exists:
                        execute(_connection.get(), f"REVOKE ALL ON {table} FROM {role}")


@contextmanager
def transaction(user_id=None):
    if _connection.get() is not None:
        yield _connection.get()
        return
    conn = connect()
    token = _connection.set(conn)
    try:
        conn.execute(
            "BEGIN IMMEDIATE"
            if settings.DATABASE_URL.startswith("sqlite:")
            else "BEGIN"
        )
        if user_id and not settings.DATABASE_URL.startswith("sqlite:"):
            execute(
                conn, "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", (user_id,)
            )
        yield conn
        conn.execute("COMMIT")
    except BaseException:
        conn.execute("ROLLBACK")
        raise
    finally:
        _connection.reset(token)
        conn.close()


def _encode(value):
    if isinstance(value, bytes):
        value = {"__bytes__": base64.b64encode(value).decode()}
    raw = json.dumps(value, allow_nan=False).encode()
    if settings.DATA_ENCRYPTION_KEY:
        return (
            "enc:" + Fernet(settings.DATA_ENCRYPTION_KEY.encode()).encrypt(raw).decode()
        )
    return raw.decode()


@asynccontextmanager
async def request_transaction(user_id):
    """Wait for database locks outside the ASGI event loop."""
    from starlette.concurrency import run_in_threadpool

    conn = await run_in_threadpool(connect)
    token = _connection.set(conn)
    try:
        await run_in_threadpool(
            conn.execute,
            "BEGIN IMMEDIATE"
            if settings.DATABASE_URL.startswith("sqlite:")
            else "BEGIN",
        )
        if not settings.DATABASE_URL.startswith("sqlite:"):
            await run_in_threadpool(
                execute,
                conn,
                "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
                (user_id,),
            )
        yield conn
        await run_in_threadpool(conn.execute, "COMMIT")
    except BaseException:
        await run_in_threadpool(conn.execute, "ROLLBACK")
        raise
    finally:
        _connection.reset(token)
        await run_in_threadpool(conn.close)


def _decode(value):
    if value.startswith("enc:"):
        value = Fernet(settings.DATA_ENCRYPTION_KEY.encode()).decrypt(
            value[4:].encode()
        )
    parsed = json.loads(value)
    if isinstance(parsed, dict) and set(parsed) == {"__bytes__"}:
        return base64.b64decode(parsed["__bytes__"])
    return parsed


class DurableMap(MutableMapping):
    def __init__(self, namespace):
        self.namespace = namespace

    def __getitem__(self, key):
        with transaction() as conn:
            row = execute(
                conn,
                "SELECT value FROM app_records WHERE namespace=? AND key=?",
                (self.namespace, key),
            ).fetchone()
        if row is None:
            raise KeyError(key)
        return _decode(row[0])

    def __setitem__(self, key, value):
        with transaction() as conn:
            execute(
                conn,
                "INSERT INTO app_records(namespace,key,value) VALUES(?,?,?) ON CONFLICT(namespace,key) DO UPDATE SET value=excluded.value",
                (self.namespace, key, _encode(value)),
            )

    def __delitem__(self, key):
        with transaction() as conn:
            result = execute(
                conn,
                "DELETE FROM app_records WHERE namespace=? AND key=?",
                (self.namespace, key),
            )
            if not result.rowcount:
                raise KeyError(key)

    def __iter__(self):
        with transaction() as conn:
            rows = execute(
                conn,
                "SELECT key FROM app_records WHERE namespace=? ORDER BY key",
                (self.namespace,),
            ).fetchall()
        return iter([row[0] for row in rows])

    def __len__(self):
        with transaction() as conn:
            return execute(
                conn,
                "SELECT COUNT(*) FROM app_records WHERE namespace=?",
                (self.namespace,),
            ).fetchone()[0]


class DurableList(MutableSequence):
    def __init__(self, namespace):
        self.records = DurableMap(namespace)

    def __len__(self):
        return len(self.records)

    def __getitem__(self, index):
        return list(self.records.values())[index]

    def __setitem__(self, index, value):
        self.records[list(self.records)[index]] = value

    def __delitem__(self, index):
        del self.records[list(self.records)[index]]

    def insert(self, index, value):
        self.records[str(uuid.uuid4())] = value

    def __iter__(self):
        return iter(self.records.values())


def delete_user_data(user_id):
    """Remove all API-held records and block existing JWTs for this account."""
    with transaction(user_id) as conn:
        rows = execute(conn, "SELECT namespace,key,value FROM app_records").fetchall()
        owned_report_ids = {
            key
            for ns, key, val in rows
            if ns == "reports" and _decode(val).get("user_id") == user_id
        }
        for namespace, key, raw in rows:
            value = _decode(raw)
            owned = (
                key == user_id
                or key.startswith(user_id + ":")
                or key in owned_report_ids
            )
            owned = owned or (
                isinstance(value, dict) and value.get("user_id") == user_id
            )
            if owned:
                execute(
                    conn,
                    "DELETE FROM app_records WHERE namespace=? AND key=?",
                    (namespace, key),
                )
        execute(
            conn,
            "INSERT INTO revoked_accounts(user_id) VALUES(?) ON CONFLICT(user_id) DO NOTHING",
            (user_id,),
        )


def is_revoked(user_id):
    with transaction() as conn:
        return (
            execute(
                conn, "SELECT 1 FROM revoked_accounts WHERE user_id=?", (user_id,)
            ).fetchone()
            is not None
        )


def check_rate_limit(key, limit):
    import time

    window = int(time.time()) // 60
    with transaction() as conn:
        row = execute(
            conn,
            "INSERT INTO rate_limits(key,window_id,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_id=excluded.window_id, count=CASE WHEN rate_limits.window_id=excluded.window_id THEN rate_limits.count+1 ELSE 1 END RETURNING count",
            (key, window),
        ).fetchone()
        execute(conn, "DELETE FROM rate_limits WHERE window_id < ?", (window - 2,))
        return row[0] <= limit
