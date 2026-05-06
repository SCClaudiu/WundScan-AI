"""Data access layer. All DB reads/writes go through here.

Patient IDs are one-way salted-hashed before storage. Raw IDs never touch
disk. The salt is auto-generated on first use at data/.salt — back it up
together with the database, since hash rotation = lost lookups.
"""
from __future__ import annotations

import hashlib
import os
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterator

import numpy as np

from .audit import audit
from .config import DATA
from .db import connect
from .schemas import ReasoningOutput, WoundAssessment

SALT_PATH = DATA / ".salt"
SALT_BYTES = 32
HASH_HEX_LEN = 16  # 64 bits — plenty for local single-clinic use


# ---- patient-id salting ----

def load_salt() -> bytes:
    if SALT_PATH.exists():
        return SALT_PATH.read_bytes()
    salt = os.urandom(SALT_BYTES)
    SALT_PATH.write_bytes(salt)
    try:
        SALT_PATH.chmod(0o600)
    except OSError:
        pass
    audit("salt.created", path=str(SALT_PATH))
    return salt


def hash_patient_id(raw_id: str) -> str:
    if not raw_id:
        raise ValueError("patient_id must be a non-empty string")
    salt = load_salt()
    return hashlib.sha256(salt + raw_id.encode("utf-8")).hexdigest()[:HASH_HEX_LEN]


# ---- connection scopes ----

@contextmanager
def transaction() -> Iterator:
    conn = connect()
    try:
        conn.execute("BEGIN IMMEDIATE")
        yield conn
        conn.execute("COMMIT")
    except Exception:
        try:
            conn.execute("ROLLBACK")
        except Exception:
            pass
        raise
    finally:
        conn.close()


@contextmanager
def reader() -> Iterator:
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


# ---- domain ----

@dataclass
class Visit:
    visit_id: int
    patient_hash: str
    image_sha: str
    ts: str
    notes: str
    assessment: WoundAssessment | None = None
    reasoning: ReasoningOutput | None = None
    vlm_used: str | None = None
    confidence: str | None = None
    report_path: str | None = None


def _row_to_visit(row, with_assessment: bool = False) -> Visit:
    v = Visit(
        visit_id=int(row["visit_id"]),
        patient_hash=row["patient_hash"],
        image_sha=row["image_sha"],
        ts=row["ts"],
        notes=row["notes"] or "",
    )
    if with_assessment and row["assessment_json"]:
        v.assessment = WoundAssessment.model_validate_json(row["assessment_json"])
        v.reasoning = ReasoningOutput.model_validate_json(row["reasoning_json"])
        v.vlm_used = row["vlm_used"]
        v.confidence = row["confidence"]
        v.report_path = row["report_path"]
    return v


# ---- writes ----

def ensure_patient(patient_hash: str) -> None:
    with transaction() as c:
        c.execute(
            "INSERT OR IGNORE INTO patients (patient_hash, created_ts) VALUES (?, ?)",
            (patient_hash, datetime.now(timezone.utc).isoformat()),
        )
    audit("patient.upserted", patient_hash=patient_hash)


def record_visit(
    *,
    patient_hash: str,
    image_sha: str,
    notes: str,
    assessment: WoundAssessment,
    reasoning: ReasoningOutput,
    vlm_used: str,
    report_path: str,
) -> int:
    ensure_patient(patient_hash)
    with transaction() as c:
        cur = c.execute(
            "INSERT INTO visits (patient_hash, image_sha, ts, notes) VALUES (?, ?, ?, ?)",
            (patient_hash, image_sha, datetime.now(timezone.utc).isoformat(), notes),
        )
        visit_id = int(cur.lastrowid)
        c.execute(
            "INSERT INTO assessments "
            "(visit_id, assessment_json, reasoning_json, vlm_used, confidence, report_path) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                visit_id,
                assessment.model_dump_json(),
                reasoning.model_dump_json(),
                vlm_used,
                assessment.confidence,
                report_path,
            ),
        )
    audit(
        "visit.recorded",
        visit_id=visit_id, patient_hash=patient_hash,
        image_sha=image_sha, confidence=assessment.confidence, vlm_used=vlm_used,
    )
    return visit_id


def record_embedding(visit_id: int, vector: np.ndarray, model: str) -> None:
    if vector.dtype != np.float32:
        vector = vector.astype(np.float32)
    with transaction() as c:
        c.execute(
            "INSERT OR REPLACE INTO embeddings (visit_id, vector, dim, model) "
            "VALUES (?, ?, ?, ?)",
            (visit_id, vector.tobytes(), int(vector.shape[0]), model),
        )
    audit("embedding.persisted", visit_id=visit_id, dim=int(vector.shape[0]), model=model)


# ---- reads ----

def list_visits(patient_hash: str, limit: int = 20) -> list[Visit]:
    with reader() as c:
        rows = c.execute(
            "SELECT v.visit_id, v.patient_hash, v.image_sha, v.ts, v.notes, "
            "       a.assessment_json, a.reasoning_json, a.vlm_used, a.confidence, a.report_path "
            "FROM visits v LEFT JOIN assessments a USING (visit_id) "
            "WHERE v.patient_hash = ? "
            "ORDER BY v.ts DESC LIMIT ?",
            (patient_hash, limit),
        ).fetchall()
    return [_row_to_visit(r, with_assessment=True) for r in rows]


def latest_visits(patient_hash: str, k: int = 3) -> list[Visit]:
    return list_visits(patient_hash, limit=k)


def get_visit(visit_id: int) -> Visit | None:
    with reader() as c:
        row = c.execute(
            "SELECT v.visit_id, v.patient_hash, v.image_sha, v.ts, v.notes, "
            "       a.assessment_json, a.reasoning_json, a.vlm_used, a.confidence, a.report_path "
            "FROM visits v LEFT JOIN assessments a USING (visit_id) "
            "WHERE v.visit_id = ?",
            (visit_id,),
        ).fetchone()
    return _row_to_visit(row, with_assessment=True) if row else None


def nearest_prior(
    patient_hash: str,
    vector: np.ndarray,
    k: int = 3,
    exclude_visit_id: int | None = None,
) -> list[tuple[int, float]]:
    """Cosine similarity over stored embeddings. Vectors assumed L2-normalized.

    Returns [(visit_id, similarity), ...] sorted desc. In-Python; suitable up
    to ~10k embeddings per patient. Day 3 swaps this for Qdrant.
    """
    if vector.dtype != np.float32:
        vector = vector.astype(np.float32)
    norm = float(np.linalg.norm(vector))
    if norm > 0:
        vector = vector / norm

    sql = (
        "SELECT e.visit_id, e.vector, e.dim FROM embeddings e "
        "JOIN visits v USING (visit_id) WHERE v.patient_hash = ?"
    )
    params: list = [patient_hash]
    if exclude_visit_id is not None:
        sql += " AND e.visit_id != ?"
        params.append(exclude_visit_id)

    with reader() as c:
        rows = c.execute(sql, params).fetchall()

    sims: list[tuple[int, float]] = []
    for r in rows:
        v = np.frombuffer(r["vector"], dtype=np.float32)
        if v.shape[0] != vector.shape[0]:
            continue
        sims.append((int(r["visit_id"]), float(np.dot(v, vector))))
    sims.sort(key=lambda x: x[1], reverse=True)
    return sims[:k]
