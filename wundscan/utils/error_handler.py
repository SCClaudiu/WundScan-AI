"""Zentrales Error-Handling fuer pflegerisch verstaendliche Fehlermeldungen."""

from __future__ import annotations

import streamlit as st


_NURSE_FRIENDLY_MESSAGES: dict[str, str] = {
    "connection_refused": (
        "Ollama ist nicht erreichbar. Bitte prüfen Sie:\n"
        "1. Läuft Ollama? → `ollama serve` im Terminal starten\n"
        "2. Stimmt die URL in der .env? (Standard: http://localhost:11434)"
    ),
    "model_not_found": (
        "Das gewählte Modell ist nicht installiert.\n"
        "→ `ollama pull {model}` im Terminal ausführen."
    ),
    "anthropic_auth": (
        "Der Anthropic API-Key ist ungültig oder abgelaufen.\n"
        "Bitte prüfen Sie den Key unter console.anthropic.com"
    ),
    "anthropic_rate_limit": (
        "Zu viele Anfragen. Bitte 30 Sekunden warten und erneut versuchen."
    ),
    "no_provider": (
        "Kein AI-Provider konfiguriert. Bitte .env-Datei prüfen."
    ),
    "timeout": (
        "Die Analyse hat zu lange gedauert. Bitte erneut versuchen.\n"
        "Bei Ollama: Liegt das Modell evtl. auf einer langsamen Festplatte?"
    ),
}


def show_error(key: str, **kwargs: str) -> None:
    """Zeigt eine pflegerisch verstaendliche Fehlermeldung in der UI."""
    msg = _NURSE_FRIENDLY_MESSAGES.get(key, f"Unbekannter Fehler: {key}")
    msg = msg.format(**kwargs)
    st.error(msg)


def show_warning(message: str) -> None:
    st.warning(message)


def handle_provider_error(exc: Exception, provider: str) -> None:
    """Maps provider-specific exceptions to nurse-friendly messages."""
    err_str = str(exc).lower()

    if "connection" in err_str or "refused" in err_str:
        show_error("connection_refused")
    elif "not found" in err_str or "404" in err_str:
        show_error("model_not_found", model="(siehe Einstellungen)")
    elif "401" in err_str or "unauthorized" in err_str or "authentication" in err_str:
        show_error("anthropic_auth")
    elif "429" in err_str or "rate" in err_str:
        show_error("anthropic_rate_limit")
    elif "timeout" in err_str:
        show_error("timeout")
    else:
        st.error(f"Fehler bei {provider}: {exc}")
