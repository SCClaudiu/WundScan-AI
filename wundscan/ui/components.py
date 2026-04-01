"""Wiederverwendbare UI-Bausteine fuer die Streamlit-App."""

from __future__ import annotations

import streamlit as st

from config.settings import Provider, settings
from core.llm_provider import check_provider_status


def render_provider_status() -> None:
    """Zeigt den aktuellen Provider-Status in der Sidebar."""
    ok, msg = check_provider_status()
    provider_label = "Ollama" if settings.provider == Provider.OLLAMA else "Claude"
    if ok:
        st.sidebar.success(f"**{provider_label}** — {msg}")
    else:
        st.sidebar.error(f"**{provider_label}** — {msg}")


def render_sidebar_nav() -> str:
    """Rendert die Sidebar-Navigation und gibt die gewaehlte Seite zurueck."""
    st.sidebar.title("WundScan AI")
    st.sidebar.caption("Pflegerische Wunddokumentation")

    page = st.sidebar.radio(
        "Navigation",
        options=["Neue Dokumentation", "Patienten", "Wundverlauf", "Einstellungen"],
        label_visibility="collapsed",
    )

    st.sidebar.divider()
    render_provider_status()

    return page
