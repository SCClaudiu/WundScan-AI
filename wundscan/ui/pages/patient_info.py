"""Seite: Patientenverwaltung."""

from __future__ import annotations

import json
from datetime import date

import streamlit as st


_STORAGE_KEY = "wundscan_patients"


def _load_patients() -> list[dict]:
    if "patients" not in st.session_state:
        st.session_state["patients"] = []
    return st.session_state["patients"]


def _save_patients(patients: list[dict]) -> None:
    st.session_state["patients"] = patients


def render() -> None:
    st.header("Patienten")

    patients = _load_patients()

    # --- Neuen Patienten anlegen ---
    with st.expander("Neuen Patienten anlegen", expanded=not patients):
        with st.form("new_patient", clear_on_submit=True):
            col1, col2 = st.columns(2)
            with col1:
                nachname = st.text_input("Nachname*")
                geburtsdatum = st.date_input(
                    "Geburtsdatum",
                    value=None,
                    min_value=date(1900, 1, 1),
                    max_value=date.today(),
                )
            with col2:
                vorname = st.text_input("Vorname*")
                station = st.text_input("Station", placeholder="z.B. Chirurgie 3A")
            zimmer = st.text_input("Zimmer", placeholder="z.B. 204")

            submitted = st.form_submit_button("Patient anlegen")
            if submitted:
                if not nachname or not vorname:
                    st.error("Name und Vorname sind Pflichtfelder.")
                else:
                    new_patient = {
                        "id": f"P{int(date.today().strftime('%Y%m%d'))}{len(patients)}",
                        "nachname": nachname,
                        "vorname": vorname,
                        "geburtsdatum": geburtsdatum.isoformat() if geburtsdatum else None,
                        "station": station,
                        "zimmer": zimmer,
                    }
                    patients.append(new_patient)
                    _save_patients(patients)
                    st.success(f"Patient {nachname}, {vorname} angelegt.")
                    st.rerun()

    # --- Patientenliste ---
    if patients:
        st.subheader(f"Patientenliste ({len(patients)})")
        for i, p in enumerate(patients):
            col1, col2 = st.columns([4, 1])
            with col1:
                meta_parts = []
                if p.get("station"):
                    meta_parts.append(p["station"])
                if p.get("zimmer"):
                    meta_parts.append(f"Zi. {p['zimmer']}")
                if p.get("geburtsdatum"):
                    meta_parts.append(f"geb. {p['geburtsdatum']}")
                meta = " · ".join(meta_parts)
                st.markdown(f"**{p['nachname']}, {p['vorname']}**  \n{meta}")
            with col2:
                if st.button("Entfernen", key=f"del_pat_{i}"):
                    patients.pop(i)
                    _save_patients(patients)
                    st.rerun()
    else:
        st.info("Noch keine Patienten angelegt.")
