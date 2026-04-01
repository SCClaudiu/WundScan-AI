"""Strukturierte Ausgaben fuer die Wunddokumentation.

Bietet Rendering-Funktionen fuer Streamlit, die die AI-Ergebnisse
sauber in Pflege- und Patienten-Bereiche aufteilen.
"""

from __future__ import annotations

import streamlit as st

from models.wound_data import AnalysisResult, WoundAssessment
from utils.source_tracker import render_disclaimer, render_fachliche_grundlagen, render_source_badge


def render_analysis(result: AnalysisResult) -> None:
    """Zeigt das komplette Analyse-Ergebnis in der UI."""
    render_source_badge(result)

    # Pflegefachliche Einschätzung
    st.subheader("Pflegefachliche Einschätzung")
    st.text_area(
        "Fachtext (editierbar für Dokumentation)",
        value=result.pflegefachliche_einschaetzung,
        height=350,
        key="pflege_output",
    )

    # Patienten-Information
    if result.patienten_information:
        st.subheader("Patienten-Information")
        st.text_area(
            "Patientenfreundlicher Text (editierbar)",
            value=result.patienten_information,
            height=200,
            key="patient_output",
        )

    render_fachliche_grundlagen(result)
    render_disclaimer(result)


def render_assessment_summary(a: WoundAssessment) -> None:
    """Zeigt eine kompakte Zusammenfassung des Assessments."""
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Wundart", a.wundart.value)
        st.metric("Lokalisation", a.lokalisation or "–")
    with col2:
        st.metric(
            "Größe (cm)",
            f"{a.groesse.laenge_cm} × {a.groesse.breite_cm} × {a.groesse.tiefe_cm}",
        )
        st.metric("Exsudat", f"{a.exsudat.menge.value} / {a.exsudat.art.value}")
    with col3:
        st.metric("Schmerz (VAS)", f"{a.schmerz_vas}/10")
        infekt_count = len(a.infektionszeichen)
        st.metric(
            "Infektionszeichen",
            f"{infekt_count} Zeichen" if infekt_count else "Keine",
        )


def export_as_text(result: AnalysisResult, assessment: WoundAssessment) -> str:
    """Erzeugt einen exportfaehigen Textblock fuer die Dokumentation."""
    lines = [
        f"WundScan AI — Dokumentation vom {result.timestamp.strftime('%d.%m.%Y %H:%M')}",
        f"Quelle: {result.source} ({result.model_name})",
        "=" * 60,
        "",
        result.pflegefachliche_einschaetzung,
        "",
        "=" * 60,
        "",
        result.patienten_information,
        "",
        "=" * 60,
        f"Fachliche Grundlagen: {' · '.join(result.fachliche_grundlagen)}",
        "",
        result.disclaimer,
    ]
    return "\n".join(lines)
