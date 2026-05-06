"""Central configuration. No I/O at import time except directory creation."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
IMAGES = DATA / "images"
REPORTS = DATA / "reports"
EMBEDDINGS_DIR = DATA / "embeddings"
AUDIT_LOG = DATA / "audit.log"

for _p in (IMAGES, REPORTS, EMBEDDINGS_DIR):
    _p.mkdir(parents=True, exist_ok=True)

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_API_KEY = "ollama"

VLM_MODEL = os.environ.get("WUNDSCAN_VLM", "qwen2.5vl:7b")
LLM_MODEL = os.environ.get("WUNDSCAN_LLM", "qwen3:14b")
VLM_ESCALATION_MODEL = os.environ.get("WUNDSCAN_VLM_ESCALATION", "qwen2.5vl:32b")

BIOMEDCLIP_HF = "hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224"

MAX_IMAGE_LONG_EDGE = 1280
MODEL_TEMPERATURE = 0.1

DISCLAIMER = (
    "AI-generated assessment. Decision-support and documentation only. "
    "Not a medical device. Not a diagnosis. "
    "Requires qualified clinician review before any clinical action."
)
