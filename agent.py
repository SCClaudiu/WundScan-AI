"""WundScan-AI — local wound-imaging agent (MVP, day 1).

NOT A MEDICAL DEVICE. Research / decision-support only.
All outputs require clinician review.
"""
from __future__ import annotations

import hashlib
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from PIL import Image
from pydantic import BaseModel, Field
from pydantic_ai import Agent, BinaryContent
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.openai import OpenAIProvider

ROOT = Path(__file__).parent
DATA = ROOT / "data"
IMAGES = DATA / "images"
REPORTS = DATA / "reports"
AUDIT = DATA / "audit.log"
for p in (IMAGES, REPORTS):
    p.mkdir(parents=True, exist_ok=True)

OLLAMA = OpenAIProvider(base_url="http://localhost:11434/v1", api_key="ollama")
VLM = OpenAIModel("qwen2.5vl:7b", provider=OLLAMA)
LLM = OpenAIModel("qwen3:14b", provider=OLLAMA)

DISCLAIMER = (
    "AI-generated assessment. Research/decision-support only. "
    "Not a diagnosis. Requires clinician review before any clinical action."
)


# ---------- structured output ----------

class TissueComposition(BaseModel):
    granulation_pct: int = Field(ge=0, le=100)
    slough_pct: int = Field(ge=0, le=100)
    eschar_pct: int = Field(ge=0, le=100)
    epithelial_pct: int = Field(ge=0, le=100)


class WoundAssessment(BaseModel):
    visible_anatomy: str
    approximate_size: str = Field(description="L x W in cm, or 'unknown' if no reference")
    tissue: TissueComposition
    exudate: Literal["none", "minimal", "moderate", "heavy", "uncertain"]
    periwound: str
    infection_signs: list[str]
    healing_stage: Literal["inflammatory", "proliferative", "remodeling", "stalled", "uncertain"]
    concerns: list[str]
    confidence: Literal["low", "medium", "high"]
    disclaimer: str = DISCLAIMER


# ---------- ingest ----------

def ingest(path: Path) -> tuple[bytes, str]:
    """Strip EXIF, resize long edge to 1280, return (bytes, sha256)."""
    img = Image.open(path).convert("RGB")
    img.thumbnail((1280, 1280))
    clean = Image.new("RGB", img.size)
    clean.putdata(list(img.getdata()))
    buf = io.BytesIO()
    clean.save(buf, format="JPEG", quality=92)
    data = buf.getvalue()
    sha = hashlib.sha256(data).hexdigest()
    out = IMAGES / f"{sha}.jpg"
    if not out.exists():
        out.write_bytes(data)
    return data, sha


def audit(event: str, **fields) -> None:
    line = json.dumps({"ts": datetime.now(timezone.utc).isoformat(), "event": event, **fields})
    with AUDIT.open("a") as f:
        f.write(line + "\n")


# ---------- agents ----------

VLM_PROMPT = (
    "You are a wound-imaging perception module. Describe ONLY what is visible. "
    "Do not diagnose. Use 'uncertain' liberally. If anatomy is unclear, say so. "
    "Estimate sizes only when a reference object is visible; otherwise 'unknown'."
)

LLM_PROMPT = (
    "You are a wound-care reasoning module. Given a structured visual assessment "
    "and (optional) prior visits, produce: (1) red flags, (2) differential considerations, "
    "(3) suggested next clinical steps under the TIME framework, "
    "(4) what additional imaging or info would reduce uncertainty. "
    "Be conservative. Always end with the disclaimer verbatim."
)

perception_agent = Agent(VLM, output_type=WoundAssessment, system_prompt=VLM_PROMPT)
reasoning_agent = Agent(LLM, system_prompt=LLM_PROMPT)


# ---------- pipeline ----------

def assess(image_path: Path, patient_id: str = "anon", notes: str = "") -> dict:
    data, sha = ingest(image_path)
    audit("ingest", patient=patient_id, sha=sha, src=str(image_path))

    vis = perception_agent.run_sync(
        [
            f"Patient note: {notes or 'none'}. Assess this wound image.",
            BinaryContent(data=data, media_type="image/jpeg"),
        ]
    ).output
    audit("perception", patient=patient_id, sha=sha, confidence=vis.confidence)

    reasoning = reasoning_agent.run_sync(
        f"Structured assessment:\n{vis.model_dump_json(indent=2)}\n\nClinical note: {notes or 'none'}"
    ).output
    audit("reasoning", patient=patient_id, sha=sha)

    report = REPORTS / f"{patient_id}_{sha[:12]}.md"
    report.write_text(
        f"# WundScan-AI report\n\n"
        f"- patient: `{patient_id}`\n- image sha256: `{sha}`\n- ts: {datetime.now(timezone.utc).isoformat()}\n\n"
        f"## Visual assessment (VLM)\n```json\n{vis.model_dump_json(indent=2)}\n```\n\n"
        f"## Clinical reasoning (LLM)\n{reasoning}\n\n"
        f"---\n_{DISCLAIMER}_\n"
    )
    return {"sha": sha, "assessment": vis.model_dump(), "reasoning": reasoning, "report": str(report)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: uv run python agent.py <image> [patient_id] [notes]")
        sys.exit(1)
    img = Path(sys.argv[1])
    pid = sys.argv[2] if len(sys.argv) > 2 else "anon"
    note = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""
    result = assess(img, pid, note)
    print(f"\n[+] report: {result['report']}\n")
    print(json.dumps(result["assessment"], indent=2))
