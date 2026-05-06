"""SQLite connection + idempotent schema migrations.

WAL for read concurrency, foreign_keys ON for integrity, busy_timeout for
multi-process tolerance. All DDL lives here; data access goes through
repository.py.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone

from .audit import audit
from .config import DATA

DB_PATH = DATA / "wundscan.sqlite3"

MIGRATIONS: list[tuple[int, str]] = [
    (
        1,
        """
        CREATE TABLE patients (
            patient_hash TEXT PRIMARY KEY,
            created_ts   TEXT NOT NULL
        );

        CREATE TABLE visits (
            visit_id     INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_hash TEXT NOT NULL REFERENCES patients(patient_hash),
            image_sha    TEXT NOT NULL,
            ts           TEXT NOT NULL,
            notes        TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX idx_visits_patient_ts ON visits(patient_hash, ts);
        CREATE INDEX idx_visits_image_sha  ON visits(image_sha);

        CREATE TABLE assessments (
            visit_id        INTEGER PRIMARY KEY REFERENCES visits(visit_id) ON DELETE CASCADE,
            assessment_json TEXT NOT NULL,
            reasoning_json  TEXT NOT NULL,
            vlm_used        TEXT NOT NULL,
            confidence      TEXT NOT NULL,
            report_path     TEXT
        );

        CREATE TABLE embeddings (
            visit_id INTEGER PRIMARY KEY REFERENCES visits(visit_id) ON DELETE CASCADE,
            vector   BLOB NOT NULL,
            dim      INTEGER NOT NULL,
            model    TEXT NOT NULL
        );
        """,
    ),
]


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, isolation_level=None, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    return conn


def _ensure_version_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version ("
        "version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
    )


def _current_version(conn: sqlite3.Connection) -> int:
    _ensure_version_table(conn)
    row = conn.execute(
        "SELECT COALESCE(MAX(version), 0) AS v FROM schema_version"
    ).fetchone()
    return int(row["v"])


def migrate() -> int:
    """Apply pending migrations. Returns final version. Idempotent."""
    conn = connect()
    try:
        current = _current_version(conn)
        for version, sql in MIGRATIONS:
            if version <= current:
                continue
            conn.executescript(sql)
            conn.execute(
                "INSERT INTO schema_version (version, applied_at) VALUES (?, ?)",
                (version, datetime.now(timezone.utc).isoformat()),
            )
            audit(
                "db.migrated",
                from_version=current, to_version=version, db=str(DB_PATH),
            )
            current = version
        return current
    finally:
        conn.close()
