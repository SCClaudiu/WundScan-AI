"""Perception (VLM) and reasoning (LLM) agents, both with structured output."""
from __future__ import annotations

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.settings import ModelSettings

from .config import (
    LLM_MODEL,
    MODEL_TEMPERATURE,
    OLLAMA_API_KEY,
    OLLAMA_BASE_URL,
    VLM_MODEL,
)
from .schemas import ReasoningOutput, WoundAssessment

_provider = OpenAIProvider(base_url=OLLAMA_BASE_URL, api_key=OLLAMA_API_KEY)
_settings = ModelSettings(temperature=MODEL_TEMPERATURE)


VLM_SYSTEM_PROMPT = (
    "You are a wound-imaging perception module for a clinical decision-support tool. "
    "Describe ONLY what is visually evident. Do not diagnose. Do not speculate beyond the image. "
    "Use 'uncertain' liberally when in doubt. "
    "Estimate sizes only when a reference object (ruler, coin) is visible; otherwise 'unknown'. "
    "Tissue percentages should sum to approximately 100. "
    "Set confidence to 'low' if image quality, lighting, framing, or occlusion impedes clear assessment. "
    "Return strictly the structured schema requested — no prose."
)

LLM_SYSTEM_PROMPT = (
    "You are a wound-care reasoning module. Given a structured visual assessment "
    "and (optional) prior visits, produce: "
    "(1) red flags requiring urgent clinician attention, "
    "(2) differential considerations (NOT diagnoses), "
    "(3) suggested next steps under the TIME framework "
    "(Tissue debridement, Inflammation/Infection control, Moisture balance, Edge advancement), "
    "(4) what additional information would reduce uncertainty. "
    "Be conservative. Defer to clinician judgment. Never present recommendations as orders. "
    "Return strictly the structured schema requested."
)


def make_perception_agent(model: str = VLM_MODEL) -> Agent[None, WoundAssessment]:
    return Agent(
        OpenAIModel(model, provider=_provider),
        output_type=WoundAssessment,
        system_prompt=VLM_SYSTEM_PROMPT,
        model_settings=_settings,
        retries=2,
    )


def make_reasoning_agent(model: str = LLM_MODEL) -> Agent[None, ReasoningOutput]:
    return Agent(
        OpenAIModel(model, provider=_provider),
        output_type=ReasoningOutput,
        system_prompt=LLM_SYSTEM_PROMPT,
        model_settings=_settings,
        retries=2,
    )
