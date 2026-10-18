"""Offline, conflict-safe copy of API state between durable databases.

Destination uses normal DATABASE_URL / DATA_ENCRYPTION_KEY settings. Source uses
MIGRATION_SOURCE_DATABASE_URL / MIGRATION_SOURCE_ENCRYPTION_KEY. Stop API writes
while copying. Source is read-only; conflicting destination records abort.
"""

import os
import sqlite3
from pathlib import Path
from config import settings
from storage import connect, initialize, execute, transaction, _encode, _decode


def migrate():
    source_url = os.environ.get("MIGRATION_SOURCE_DATABASE_URL")
    if not source_url or source_url == settings.DATABASE_URL:
        raise ValueError("Specify a separate MIGRATION_SOURCE_DATABASE_URL")
    destination_url, destination_key = (
        settings.DATABASE_URL,
        settings.DATA_ENCRYPTION_KEY,
    )
    source_key = os.environ.get("MIGRATION_SOURCE_ENCRYPTION_KEY", "")
    source = None
    try:
        settings.DATABASE_URL = source_url
        settings.DATA_ENCRYPTION_KEY = source_key
        if source_url.startswith("sqlite:///"):
            path = Path(source_url.removeprefix("sqlite:///")).resolve(strict=True)
            source = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)
        else:
            source = connect()
            source.execute("BEGIN READ ONLY")
        records = [
            (ns, key, _decode(value))
            for ns, key, value in execute(
                source, "SELECT namespace,key,value FROM app_records"
            ).fetchall()
        ]
        revoked = [
            row[0]
            for row in execute(
                source, "SELECT user_id FROM revoked_accounts"
            ).fetchall()
        ]
    finally:
        if source is not None:
            source.close()
        settings.DATABASE_URL, settings.DATA_ENCRYPTION_KEY = (
            destination_url,
            destination_key,
        )
    initialize()
    with transaction("migration") as destination:
        for namespace, key, value in records:
            existing = execute(
                destination,
                "SELECT value FROM app_records WHERE namespace=? AND key=?",
                (namespace, key),
            ).fetchone()
            if existing and _decode(existing[0]) != value:
                raise ValueError(
                    "Conflicting destination state. No records were overwritten."
                )
            if not existing:
                execute(
                    destination,
                    "INSERT INTO app_records(namespace,key,value) VALUES(?,?,?)",
                    (namespace, key, _encode(value)),
                )
        for user_id in revoked:
            execute(
                destination,
                "INSERT INTO revoked_accounts(user_id) VALUES(?) ON CONFLICT(user_id) DO NOTHING",
                (user_id,),
            )
    print(
        f"Migration complete: {len(records)} records verified/copied; no personal contents logged."
    )


if __name__ == "__main__":
    migrate()
