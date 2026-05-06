"""Pydantic schemas for structured perception + reasoning output.

Designed so a VLM can populate them reliably and so downstream code
(SQLite, Qdrant, reports) can serialize without surprises.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .config import DISCLAIMER

Confidence = Literal["low", "medium", "high"]
Exudate = Literal["none", "minimal", "moderate", "heavy", "uncertain"]
HealingStage = Literal[
    "inflammatory", "proliferative", "remodeling", "stalled", "uncertain"
]


class TissueComposition(BaseModel):
    """Wound-bed tissue percentages. Should sum to ~100."""

    granulation_pct: int = Field(ge=0, le=100, description="Healthy red granulation tissue.")
    slough_pct: int = Field(ge=0, le=100, description="Yellow/tan non-viable tissue.")
    eschar_pct: int = Field(ge=0, le=100, description="Black necrotic tissue.")
    epithelial_pct: int = Field(ge=0, le=100, description="Pink new epithelium at edges.")


class WoundAssessment(BaseModel):
    """Visual perception output. Fact-only. No diagnosis."""

    visible_anatomy: str = Field(description="What body region is visible, or 'unclear'.")
    approximate_size: str = Field(
        description="L x W in cm only if a reference object (ruler/coin) is visible; else 'unknown'."
    )
    tissue: TissueComposition
    exudate: Exudate
    periwound: str = Field(
        description="Skin around the wound: maceration, erythema, callus, intact, etc."
    )
    infection_signs: list[str] = Field(
        default_factory=list,
        description="Visible signs only (purulence, surrounding erythema, etc). Empty if none visible.",
    )
    healing_stage: HealingStage
    concerns: list[str] = Field(
        default_factory=list,
        description="Notable visual findings worth clinician attention.",
    )
    confidence: Confidence = Field(
        description="'low' if image quality, lighting, or framing impedes clear assessment."
    )
    disclaimer: str = DISCLAIMER


class ReasoningOutput(BaseModel):
    """Clinical reasoning over a structured assessment + (future) prior visits."""

    red_flags: list[str] = Field(description="Findings warranting urgent clinician review.")
    differential_considerations: list[str] = Field(
        description="Possible considerations for the clinician. Not diagnoses."
    )
    suggested_next_steps_TIME: list[str] = Field(
        description="Suggestions framed by the TIME framework: Tissue, Inflammation/Infection, "
        "Moisture balance, Edge of wound."
    )
    info_to_reduce_uncertainty: list[str] = Field(
        description="What additional images, history, or measurements would help."
    )
    disclaimer: str = DISCLAIMER
