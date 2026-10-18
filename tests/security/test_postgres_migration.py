"""Run only against a separate, EMPTY disposable PostgreSQL database."""

import os
from pathlib import Path
import pytest

pytestmark = pytest.mark.skipif(
    not os.environ.get("SECURITY_TEST_DATABASE_URL"),
    reason="Needs an isolated PostgreSQL database",
)


def test_migration_blocks_direct_client_access_and_cross_owner_children():
    import psycopg

    with psycopg.connect(
        os.environ["SECURITY_TEST_DATABASE_URL"], autocommit=True
    ) as conn:
        assert (
            conn.execute(
                "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
            ).fetchone()[0]
            == 0
        ), "Use an empty test database"
        for role in ("anon", "authenticated"):
            if not conn.execute(
                "SELECT 1 FROM pg_roles WHERE rolname=%s", (role,)
            ).fetchone():
                conn.execute(f"CREATE ROLE {role} NOLOGIN")
        conn.execute("CREATE SCHEMA auth")
        conn.execute("CREATE TABLE auth.users(id uuid PRIMARY KEY)")
        for table in (
            "profiles",
            "health_logs",
            "reminders",
            "reports",
            "conversations",
            "saved_plans",
            "logged_meals",
        ):
            conn.execute(
                f"CREATE TABLE public.{table}(id uuid PRIMARY KEY,user_id uuid NOT NULL)"
            )
        for table, parent in (
            ("report_observations", "report_id"),
            ("report_chunks", "report_id"),
            ("processing_jobs", "report_id"),
            ("messages", "conversation_id"),
            ("reminder_completions", "reminder_id"),
        ):
            conn.execute(
                f"CREATE TABLE public.{table}(id uuid PRIMARY KEY,user_id uuid NOT NULL,{parent} uuid NOT NULL)"
            )
        migration = Path(
            "supabase/migrations/002_api_state_and_owner_constraints.sql"
        ).read_text()
        conn.execute(migration)
        for table in ("app_records", "rate_limits", "revoked_accounts"):
            assert (
                conn.execute(
                    "SELECT relrowsecurity FROM pg_class WHERE oid=%s::regclass",
                    ("public." + table,),
                ).fetchone()[0]
                is True
            )
            for role in ("anon", "authenticated"):
                assert (
                    conn.execute(
                        "SELECT has_table_privilege(%s,%s,'SELECT')",
                        (role, "public." + table),
                    ).fetchone()[0]
                    is False
                )
        a = "11111111-1111-4111-8111-111111111111"
        b = "22222222-2222-4222-8222-222222222222"
        report = "33333333-3333-4333-8333-333333333333"
        conn.execute("INSERT INTO auth.users VALUES(%s),(%s)", (a, b))
        conn.execute("INSERT INTO public.reports VALUES(%s,%s)", (report, a))
        with pytest.raises(psycopg.errors.ForeignKeyViolation):
            conn.execute(
                "INSERT INTO public.report_observations VALUES(gen_random_uuid(),%s,%s)",
                (b, report),
            )
        conn.execute(
            "INSERT INTO public.report_observations VALUES(gen_random_uuid(),%s,%s)",
            (a, report),
        )
        conn.execute("DELETE FROM auth.users WHERE id=%s", (a,))
        assert (
            conn.execute("SELECT count(*) FROM public.report_observations").fetchone()[
                0
            ]
            == 0
        )
