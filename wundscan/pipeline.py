"""End-to-end assess() pipeline: ingest -> perception -> reasoning -> embed -> report."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic_ai import BinaryContent

from .agents import make_perception_agent, make_reasoning_agent
from .audit import audit
from .config import DISCLAIMER, LLM_MODEL, REPORTS, VLM_ESCALATION_MODEL, VLM_MODEL
from .embeddings import embed_image
from .ingest import ingest_image
from .schemas import ReasoningOutput, WoundAssessment

log = logging.getLogger(__name__)


def _render_report(
    patient: str,
    sha: str,
    assessment: WoundAssessment,
    reasoning: ReasoningOutput,
    vlm_used: str,
    embedding_dim: int,
) -> Path:
    out = REPORTS / f"{patient}_{sha[:12]}.md"
    out.write_text(
        f"# WundScan-AI report\n\n"
        f"- patient: `{patient}`\n"
        f"- image sha256: `{sha}`\n"
        f"- generated: {datetime.now(timezone.utc).isoformat()}\n"
        f"- perception model: `{vlm_used}`\n"
        f"- reasoning model: `{LLM_MODEL}`\n"
        f"- embedding dim: {embedding_dim}\n\n"
        f"## Visual assessment\n"
        f"```json\n{assessment.model_dump_json(indent=2)}\n```\n\n"
        f"## Clinical reasoning\n"
        f"```json\n{reasoning.model_dump_json(indent=2)}\n```\n\n"
        f"---\n\n**{DISCLAIMER}**\n\n"
        f"Clinician sign-off: ____________________  Date: __________\n"
    )
    return out


def assess(
    image_path: Path | str,
    patient_id: str = "anon",
    notes: str = "",
    *,
    escalate_on_low_confidence: bool = True,
) -> dict[str, Any]:
    """Run the full pipeline. All steps audited; failures logged and re-raised."""
    image_path = Path(image_path)
    audit("assess.start", patient=patient_id, src=str(image_path))

    data, sha, stored = ingest_image(image_path)
    audit("ingest.ok", patient=patient_id, sha=sha, stored=str(stored), bytes=len(data))

    user_msg = [
        f"Patient note: {notes or 'none'}.\n"
        f"Assess this wound image. Return ONLY the structured schema.",
        BinaryContent(data=data, media_type="image/jpeg"),
    ]

    vlm_used = VLM_MODEL
    perception = make_perception_agent()
    assessment: WoundAssessment = perception.run_sync(user_msg).output
    audit(
        "perception.ok",
        patient=patient_id, sha=sha, model=vlm_used,
        confidence=assessment.confidence,
    )

    if escalate_on_low_confidence and assessment.confidence == "low":
        log.info("Low confidence -> escalating to %s", VLM_ESCALATION_MODEL)
        try:
            esc = make_perception_agent(VLM_ESCALATION_MODEL)
            assessment = esc.run_sync(user_msg).output
            vlm_used = VLM_ESCALATION_MODEL
            audit(
                "perception.escalated",
                patient=patient_id, sha=sha, model=vlm_used,
                confidence=assessment.confidence,
            )
        except Exception as e:
            log.warning("Escalation failed: %s", e)
            audit("perception.escalation_failed", patient=patient_id, sha=sha, err=str(e))

    reasoning_input = (
        f"Structured visual assessment:\n{assessment.model_dump_json(indent=2)}\n\n"
        f"Clinical note: {notes or 'none'}\n"
        f"Prior visits: not yet wired (SQLite arrives in next iteration)."
    )
    reasoning = make_reasoning_agent()
    reasoning_out: ReasoningOutput = reasoning.run_sync(reasoning_input).output
    audit(
        "reasoning.ok",
        patient=patient_id, sha=sha, model=LLM_MODEL,
        red_flag_count=len(reasoning_out.red_flags),
    )

    embedding_dim = 0
    embedding: list[float] | None = None
    try:
        vec = embed_image(stored)
        if vec is not None:
            embedding = vec.tolist()
            embedding_dim = len(embedding)
            audit("embed.ok", patient=patient_id, sha=sha, dim=embedding_dim)
        else:
            audit("embed.skipped", patient=patient_id, sha=sha, reason="biomedclip_unavailable")
    except Exception as e:
        log.warning("Embedding failed: %s", e)
        audit("embed.failed", patient=patient_id, sha=sha, err=str(e))

    report = _render_report(patient_id, sha, assessment, reasoning_out, vlm_used, embedding_dim)
    audit("report.written", patient=patient_id, sha=sha, report=str(report))
    audit("assess.done", patient=patient_id, sha=sha)

    return {
        "sha": sha,
        "stored_image": str(stored),
        "vlm_used": vlm_used,
        "assessment": assessment.model_dump(),
        "reasoning": reasoning_out.model_dump(),
        "embedding": embedding,
        "embedding_dim": embedding_dim,
        "report": str(report),
    }
