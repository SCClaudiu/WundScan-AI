"""End-to-end assess() pipeline.

ingest -> perception -> escalate-on-low-confidence -> history-aware reasoning
-> embed -> SQLite persist -> Markdown report. Every step audited.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic_ai import BinaryContent

from . import repository
from .agents import make_perception_agent, make_reasoning_agent
from .audit import audit
from .config import (
    BIOMEDCLIP_HF,
    DISCLAIMER,
    LLM_MODEL,
    REPORTS,
    VLM_ESCALATION_MODEL,
    VLM_MODEL,
)
from .embeddings import embed_image
from .ingest import ingest_image
from .repository import Visit
from .schemas import ReasoningOutput, WoundAssessment

log = logging.getLogger(__name__)


# ---- prompt-context helpers ----

def _render_history(history: list[Visit]) -> str:
    if not history:
        return "Prior visits: none on file."
    lines = ["Prior visits (most recent first):"]
    for v in history:
        a = v.assessment
        if not a:
            continue
        lines.append(
            f"  - visit#{v.visit_id} {v.ts}  "
            f"conf={a.confidence}  stage={a.healing_stage}  exudate={a.exudate}  "
            f"tissue(g/s/e/ep)="
            f"{a.tissue.granulation_pct}/{a.tissue.slough_pct}/"
            f"{a.tissue.eschar_pct}/{a.tissue.epithelial_pct}  "
            f"infection_signs={a.infection_signs or 'none'}"
        )
    return "\n".join(lines)


def _delta(prev: int, curr: int) -> str:
    return f"{curr - prev:+d}"


def _compute_deltas(current: WoundAssessment, prior: WoundAssessment | None) -> str:
    if prior is None:
        return "Deltas: no prior assessment to diff against."
    return (
        "Deltas vs most recent prior visit (current - prior):\n"
        f"  granulation: {_delta(prior.tissue.granulation_pct, current.tissue.granulation_pct)} pct\n"
        f"  slough:      {_delta(prior.tissue.slough_pct, current.tissue.slough_pct)} pct\n"
        f"  eschar:      {_delta(prior.tissue.eschar_pct, current.tissue.eschar_pct)} pct\n"
        f"  epithelial:  {_delta(prior.tissue.epithelial_pct, current.tissue.epithelial_pct)} pct\n"
        f"  exudate:     {prior.exudate} -> {current.exudate}\n"
        f"  stage:       {prior.healing_stage} -> {current.healing_stage}"
    )


# ---- report ----

def _render_report(
    out_path: Path,
    *,
    patient_hash: str,
    sha: str,
    visit_id: int,
    assessment: WoundAssessment,
    reasoning: ReasoningOutput,
    vlm_used: str,
    embedding_dim: int,
    history: list[Visit],
    nearest: list[tuple[int, float]],
) -> None:
    history_md = ""
    if history:
        history_md = "\n## Recent visits\n\n"
        for v in history:
            a = v.assessment
            line = f"- visit#{v.visit_id} ({v.ts})"
            if a:
                line += f" conf=`{a.confidence}` stage=`{a.healing_stage}` exudate=`{a.exudate}`"
            history_md += line + "\n"

    nearest_md = ""
    if nearest:
        nearest_md = "\n## Visually nearest prior visits\n\n"
        for vid, sim in nearest:
            nearest_md += f"- visit#{vid}  similarity={sim:.4f}\n"

    out_path.write_text(
        f"# WundScan-AI report\n\n"
        f"- visit_id: {visit_id}\n"
        f"- patient (hashed): `{patient_hash}`\n"
        f"- image sha256: `{sha}`\n"
        f"- generated: {datetime.now(timezone.utc).isoformat()}\n"
        f"- perception model: `{vlm_used}`\n"
        f"- reasoning model: `{LLM_MODEL}`\n"
        f"- embedding dim: {embedding_dim}\n"
        f"{history_md}{nearest_md}\n"
        f"## Visual assessment\n```json\n{assessment.model_dump_json(indent=2)}\n```\n\n"
        f"## Clinical reasoning\n```json\n{reasoning.model_dump_json(indent=2)}\n```\n\n"
        f"---\n\n**{DISCLAIMER}**\n\n"
        f"Clinician sign-off: ____________________  Date: __________\n"
    )


# ---- pipeline ----

def assess(
    image_path: Path | str,
    patient_id: str = "anon",
    notes: str = "",
    *,
    escalate_on_low_confidence: bool = True,
) -> dict[str, Any]:
    """Run the full pipeline. All steps audited; failures logged and re-raised."""
    image_path = Path(image_path)
    patient_hash = repository.hash_patient_id(patient_id)
    audit("assess.start", patient_hash=patient_hash, src=str(image_path))

    # 1. Ingest
    data, sha, stored = ingest_image(image_path)
    audit("ingest.ok", patient_hash=patient_hash, sha=sha, stored=str(stored), bytes=len(data))

    # 2. Perception (with optional escalation)
    user_msg: list[Any] = [
        f"Patient note: {notes or 'none'}.\n"
        f"Assess this wound image. Return ONLY the structured schema.",
        BinaryContent(data=data, media_type="image/jpeg"),
    ]
    vlm_used = VLM_MODEL
    assessment: WoundAssessment = make_perception_agent().run_sync(user_msg).output
    audit("perception.ok", patient_hash=patient_hash, sha=sha,
          model=vlm_used, confidence=assessment.confidence)

    if escalate_on_low_confidence and assessment.confidence == "low":
        log.info("Low confidence -> escalating to %s", VLM_ESCALATION_MODEL)
        try:
            assessment = make_perception_agent(VLM_ESCALATION_MODEL).run_sync(user_msg).output
            vlm_used = VLM_ESCALATION_MODEL
            audit("perception.escalated", patient_hash=patient_hash, sha=sha,
                  model=vlm_used, confidence=assessment.confidence)
        except Exception as e:
            log.warning("Escalation failed: %s", e)
            audit("perception.escalation_failed", patient_hash=patient_hash, sha=sha, err=str(e))

    # 3. History-aware reasoning
    history = repository.latest_visits(patient_hash, k=3)
    history_block = _render_history(history)
    delta_block = _compute_deltas(
        assessment, history[0].assessment if history and history[0].assessment else None
    )
    reasoning_input = (
        f"Structured visual assessment (current visit):\n"
        f"{assessment.model_dump_json(indent=2)}\n\n"
        f"Clinical note: {notes or 'none'}\n\n"
        f"{history_block}\n\n"
        f"{delta_block}"
    )
    reasoning_out: ReasoningOutput = make_reasoning_agent().run_sync(reasoning_input).output
    audit("reasoning.ok", patient_hash=patient_hash, sha=sha,
          model=LLM_MODEL, red_flag_count=len(reasoning_out.red_flags),
          history_count=len(history))

    # 4. Embedding (optional; no silent stub)
    vec = None
    embedding_dim = 0
    try:
        vec = embed_image(stored)
        if vec is not None:
            embedding_dim = int(vec.shape[0])
            audit("embed.ok", patient_hash=patient_hash, sha=sha, dim=embedding_dim)
        else:
            audit("embed.skipped", patient_hash=patient_hash, sha=sha,
                  reason="biomedclip_unavailable")
    except Exception as e:
        log.warning("Embedding failed: %s", e)
        audit("embed.failed", patient_hash=patient_hash, sha=sha, err=str(e))

    # 5. Persist visit + assessment + (maybe) embedding
    ts_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    report_path = REPORTS / f"{patient_hash}_{sha[:12]}_{ts_str}.md"
    visit_id = repository.record_visit(
        patient_hash=patient_hash,
        image_sha=sha,
        notes=notes,
        assessment=assessment,
        reasoning=reasoning_out,
        vlm_used=vlm_used,
        report_path=str(report_path),
    )
    if vec is not None:
        repository.record_embedding(visit_id, vec, model=BIOMEDCLIP_HF)

    # 6. Nearest-prior lookup (post-persist; excludes self)
    nearest: list[tuple[int, float]] = []
    if vec is not None:
        try:
            nearest = repository.nearest_prior(
                patient_hash, vec, k=3, exclude_visit_id=visit_id
            )
            audit("nearest_prior.computed", visit_id=visit_id, count=len(nearest))
        except Exception as e:
            log.warning("nearest_prior failed: %s", e)
            audit("nearest_prior.failed", visit_id=visit_id, err=str(e))

    # 7. Render report (now that visit_id and nearest are known)
    _render_report(
        report_path,
        patient_hash=patient_hash, sha=sha, visit_id=visit_id,
        assessment=assessment, reasoning=reasoning_out, vlm_used=vlm_used,
        embedding_dim=embedding_dim, history=history, nearest=nearest,
    )
    audit("report.written", visit_id=visit_id, report=str(report_path))
    audit("assess.done", visit_id=visit_id, patient_hash=patient_hash, sha=sha)

    return {
        "visit_id": visit_id,
        "patient_hash": patient_hash,
        "sha": sha,
        "stored_image": str(stored),
        "vlm_used": vlm_used,
        "assessment": assessment.model_dump(),
        "reasoning": reasoning_out.model_dump(),
        "embedding_dim": embedding_dim,
        "nearest_prior": nearest,
        "history_count": len(history),
        "report": str(report_path),
    }
