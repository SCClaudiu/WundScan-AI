"""Seite: Neue Wunddokumentation — Foto + Formular + AI-Analyse."""

from __future__ import annotations

import streamlit as st

from config.settings import settings
from core.llm_provider import analyse
from core.reporting import render_analysis, render_assessment_summary
from core.wound_logic import offline_analyse
from models.wound_data import (
    Exudate,
    ExudateAmount,
    ExudateType,
    InfectionSign,
    WoundAssessment,
    WoundBed,
    WoundEdge,
    WoundSize,
    WoundType,
)
from utils.error_handler import handle_provider_error


def render() -> None:
    st.header("Neue Wunddokumentation")

    # --- Foto-Upload ---
    foto = st.file_uploader(
        "Wundfoto hochladen (optional)",
        type=["jpg", "jpeg", "png"],
        key="wound_photo",
    )
    if foto:
        st.image(foto, caption="Hochgeladenes Wundfoto", width=300)

    # --- Formular ---
    st.subheader("Wunddaten erfassen")

    col1, col2 = st.columns(2)
    with col1:
        wundart = st.selectbox(
            "Wundart",
            options=[w.value for w in WoundType],
            index=0,
        )
        lokalisation = st.text_input("Lokalisation", placeholder="z.B. Unterschenkel rechts")

    with col2:
        schmerz = st.slider("Schmerz (VAS 0–10)", 0, 10, 0)

    st.subheader("Größe (cm)")
    c1, c2, c3 = st.columns(3)
    with c1:
        laenge = st.number_input("Länge", min_value=0.0, step=0.1, format="%.1f")
    with c2:
        breite = st.number_input("Breite", min_value=0.0, step=0.1, format="%.1f")
    with c3:
        tiefe = st.number_input("Tiefe", min_value=0.0, step=0.1, format="%.1f")

    # Wundgrund
    wundgrund_opts = st.multiselect(
        "Wundgrund",
        options=[w.value for w in WoundBed],
    )

    # Exsudat
    col_e1, col_e2 = st.columns(2)
    with col_e1:
        exsudat_menge = st.selectbox("Exsudat Menge", [e.value for e in ExudateAmount])
    with col_e2:
        exsudat_art = st.selectbox("Exsudat Art", [e.value for e in ExudateType])

    # Wundrand
    wundrand_opts = st.multiselect(
        "Wundrand",
        options=[w.value for w in WoundEdge],
    )

    # Infektionszeichen
    infekt_opts = st.multiselect(
        "Infektionszeichen",
        options=[i.value for i in InfectionSign],
    )

    bemerkungen = st.text_area("Bemerkungen", placeholder="Freitext...")

    # --- Assessment zusammenbauen ---
    assessment = WoundAssessment(
        wundart=WoundType(wundart),
        lokalisation=lokalisation,
        groesse=WoundSize(laenge_cm=laenge, breite_cm=breite, tiefe_cm=tiefe),
        wundgrund=[WoundBed(w) for w in wundgrund_opts],
        exsudat=Exudate(menge=ExudateAmount(exsudat_menge), art=ExudateType(exsudat_art)),
        wundrand=[WoundEdge(w) for w in wundrand_opts],
        infektionszeichen=[InfectionSign(i) for i in infekt_opts],
        schmerz_vas=schmerz,
        bemerkungen=bemerkungen,
    )

    # --- Analyse starten ---
    st.divider()
    col_btn1, col_btn2 = st.columns(2)

    with col_btn1:
        if st.button("AI-Analyse starten", type="primary", use_container_width=True):
            with st.spinner("Analyse läuft..."):
                try:
                    result = analyse(assessment)
                    st.session_state["last_result"] = result
                    st.session_state["last_assessment"] = assessment
                except Exception as exc:
                    handle_provider_error(exc, settings.provider.value)

    with col_btn2:
        if st.button("Offline-Analyse (ohne AI)", use_container_width=True):
            result = offline_analyse(assessment)
            st.session_state["last_result"] = result
            st.session_state["last_assessment"] = assessment

    # --- Ergebnis anzeigen ---
    if "last_result" in st.session_state:
        st.divider()
        render_assessment_summary(st.session_state["last_assessment"])
        st.divider()
        render_analysis(st.session_state["last_result"])
