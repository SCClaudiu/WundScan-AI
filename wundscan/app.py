"""WundScan AI — Streamlit MVP fuer pflegerische Wunddokumentation.

Einstiegspunkt der Anwendung. Nur UI-Routing, keine Geschaeftslogik.
"""

import streamlit as st

st.set_page_config(
    page_title="WundScan AI — Pflege MVP",
    page_icon="🩹",
    layout="wide",
    initial_sidebar_state="expanded",
)

from ui.components import render_sidebar_nav
from ui.pages import doc_export, patient_info, wound_scan
from ui.pages.settings_page import render as render_settings


def main() -> None:
    page = render_sidebar_nav()

    if page == "Neue Dokumentation":
        wound_scan.render()
    elif page == "Patienten":
        patient_info.render()
    elif page == "Wundverlauf":
        doc_export.render()
    elif page == "Einstellungen":
        render_settings()


if __name__ == "__main__":
    main()
else:
    main()
