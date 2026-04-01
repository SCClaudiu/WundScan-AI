"""Source-Tracking: Macht transparent, woher jede AI-Antwort kommt."""

from __future__ import annotations

from datetime import datetime

import streamlit as st

from models.wound_data import AnalysisResult


def render_source_badge(result: AnalysisResult) -> None:
    """Zeigt ein Source-Badge mit Provider, Modell und Zeitstempel."""
    source_labels = {
        "claude": ("Anthropic Claude API", "#7c3aed"),
        "ollama": ("Ollama (Lokales Modell)", "#0891b2"),
        "offline": ("Offline-Modus (regelbasiert)", "#6b7280"),
    }

    label, color = source_labels.get(result.source, ("Unbekannt", "#6b7280"))
    model_info = f" — {result.model_name}" if result.model_name else ""
    ts = result.timestamp.strftime("%d.%m.%Y %H:%M")

    st.markdown(
        f'<span style="display:inline-block;padding:3px 10px;border-radius:12px;'
        f'font-size:.78rem;font-weight:600;background:{color}22;color:{color};'
        f'border:1px solid {color}44;">'
        f"Quelle: {label}{model_info}</span>"
        f'<span style="font-size:.75rem;color:#888;margin-left:.5rem;">{ts}</span>',
        unsafe_allow_html=True,
    )


def render_fachliche_grundlagen(result: AnalysisResult) -> None:
    """Zeigt die fachlichen Grundlagen am Ende der Analyse."""
    if result.fachliche_grundlagen:
        st.caption("**Fachliche Grundlagen:** " + " · ".join(result.fachliche_grundlagen))


def render_disclaimer(result: AnalysisResult) -> None:
    """Zeigt den Haftungsausschluss."""
    if result.source == "offline":
        st.warning(
            "Diese Zusammenfassung wurde **regelbasiert ohne AI** erstellt. "
            "Sie gibt die eingegebenen Daten strukturiert wieder. "
            "Keine klinische Interpretation enthalten."
        )
    else:
        st.warning(
            "Diese Einschätzung wurde **AI-gestützt generiert** und ersetzt "
            "keine ärztliche Diagnose. Alle Angaben müssen fachlich geprüft werden."
        )
