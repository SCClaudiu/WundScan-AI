"""Seite: Einstellungen — Provider-Konfiguration und Status."""

from __future__ import annotations

import streamlit as st

from config.settings import Provider, settings
from core.llm_provider import check_provider_status


def render() -> None:
    st.header("Einstellungen")

    st.subheader("AI-Provider")
    st.info(
        f"Aktueller Provider: **{settings.provider.value}** "
        f"(konfiguriert via `.env`-Datei)"
    )

    # Status prüfen
    ok, msg = check_provider_status()
    if ok:
        st.success(msg)
    else:
        st.error(msg)

    if st.button("Provider-Status erneut prüfen"):
        ok, msg = check_provider_status()
        if ok:
            st.success(msg)
        else:
            st.error(msg)

    # Konfigurationsanzeige
    st.subheader("Aktuelle Konfiguration")
    config_data = {
        "Provider": settings.provider.value,
    }
    if settings.provider == Provider.OLLAMA:
        config_data["Ollama URL"] = settings.ollama_base_url
        config_data["Ollama Modell"] = settings.ollama_model
    else:
        config_data["Claude Modell"] = settings.anthropic_model
        config_data["API Key"] = (
            f"{settings.anthropic_api_key[:8]}..."
            if settings.anthropic_api_key
            else "Nicht gesetzt"
        )

    for key, val in config_data.items():
        st.text(f"{key}: {val}")

    st.divider()
    st.subheader("Konfiguration ändern")
    st.markdown(
        "Die Konfiguration erfolgt über die **`.env`**-Datei im `wundscan/`-Ordner.  \n"
        "Nach Änderungen Streamlit neu starten (`Ctrl+C` → `streamlit run app.py`)."
    )
    st.code(
        "# .env Beispiel\n"
        "PROVIDER=ollama\n"
        "OLLAMA_MODEL=llama3.2:3b\n"
        "OLLAMA_BASE_URL=http://localhost:11434\n"
        "# PROVIDER=claude\n"
        "# ANTHROPIC_API_KEY=sk-ant-...\n"
        "# ANTHROPIC_MODEL=claude-sonnet-4-6-20250514",
        language="bash",
    )
