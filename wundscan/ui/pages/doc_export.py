"""Seite: Dokumentationsexport und Wundverlauf."""

from __future__ import annotations

import streamlit as st

from core.reporting import export_as_text
from models.wound_data import AnalysisResult, WoundAssessment


def render() -> None:
    st.header("Wundverlauf & Export")

    if "last_result" not in st.session_state:
        st.info(
            "Noch keine Analyse durchgeführt. "
            "Erstelle zuerst eine neue Wunddokumentation."
        )
        return

    result: AnalysisResult = st.session_state["last_result"]
    assessment: WoundAssessment = st.session_state.get("last_assessment")

    st.subheader("Letzte Analyse")
    st.text(
        f"Datum: {result.timestamp.strftime('%d.%m.%Y %H:%M')} | "
        f"Quelle: {result.source} ({result.model_name})"
    )

    # Editierbare Ausgaben
    tab_pflege, tab_patient = st.tabs(["Pflegefachlich", "Patienten-Info"])

    with tab_pflege:
        edited_pflege = st.text_area(
            "Pflegefachliche Einschätzung (editierbar)",
            value=result.pflegefachliche_einschaetzung,
            height=400,
            key="export_pflege",
        )

    with tab_patient:
        edited_patient = st.text_area(
            "Patienten-Information (editierbar)",
            value=result.patienten_information,
            height=250,
            key="export_patient",
        )

    # Export
    st.divider()
    st.subheader("Export")

    export_text = export_as_text(result, assessment)

    st.download_button(
        label="Als Textdatei herunterladen",
        data=export_text,
        file_name=f"wunddoku-{result.timestamp.strftime('%Y%m%d-%H%M')}.txt",
        mime="text/plain",
        use_container_width=True,
    )

    with st.expander("Vorschau des Exports"):
        st.code(export_text, language=None)
