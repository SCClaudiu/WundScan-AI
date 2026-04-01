"""Einheitliche LLM-Provider-Abstraktion (Ollama + Claude).

Bietet eine einzige analyse()-Funktion, die je nach Konfiguration
den richtigen Provider anspricht und ein AnalysisResult zurueckgibt.
"""

from __future__ import annotations

from datetime import datetime

import httpx

from config.settings import Provider, settings
from models.wound_data import AnalysisResult, WoundAssessment


def check_provider_status() -> tuple[bool, str]:
    """Prueft ob der konfigurierte Provider erreichbar ist.

    Returns:
        (erreichbar, status_text)
    """
    if settings.provider == Provider.OLLAMA:
        return _check_ollama()
    else:
        return _check_claude()


def _check_ollama() -> tuple[bool, str]:
    try:
        r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=5.0)
        if r.status_code == 200:
            data = r.json()
            models = [m["name"] for m in data.get("models", [])]
            if models:
                return True, f"Ollama OK — Modelle: {', '.join(models[:5])}"
            return False, "Ollama erreichbar, aber keine Modelle installiert."
        return False, f"Ollama HTTP {r.status_code}"
    except httpx.ConnectError:
        return False, "Ollama nicht erreichbar. Läuft `ollama serve`?"
    except Exception as exc:
        return False, f"Ollama-Fehler: {exc}"


def _check_claude() -> tuple[bool, str]:
    if not settings.anthropic_api_key:
        return False, "Kein Anthropic API-Key konfiguriert."
    if not settings.anthropic_api_key.startswith("sk-"):
        return False, "API-Key sieht ungültig aus (sollte mit sk- beginnen)."
    return True, f"Claude-Modus bereit (Modell: {settings.anthropic_model})"


def analyse(assessment: WoundAssessment) -> AnalysisResult:
    """Fuehrt Wundanalyse ueber den konfigurierten Provider durch."""
    if settings.provider == Provider.OLLAMA:
        return _analyse_ollama(assessment)
    elif settings.provider == Provider.CLAUDE:
        return _analyse_claude(assessment)
    else:
        raise ValueError(f"Unbekannter Provider: {settings.provider}")


def _build_prompt(a: WoundAssessment) -> str:
    """Baut den klinischen Analyse-Prompt (aus dem alten JS portiert + verbessert)."""
    wundgrund = ", ".join([w.value for w in a.wundgrund]) if a.wundgrund else "nicht angegeben"
    wundrand = ", ".join([w.value for w in a.wundrand]) if a.wundrand else "nicht angegeben"
    infekt = ", ".join([i.value for i in a.infektionszeichen]) if a.infektionszeichen else "keine"

    return (
        "Du bist ein erfahrener Wundexperte (ICW-zertifiziert) und unterstützt "
        "bei der pflegerischen Wunddokumentation in Österreich.\n\n"
        "Analysiere folgende Wunddaten und gib eine strukturierte pflegerische Einschätzung:\n\n"
        f"Wundart: {a.wundart.value}\n"
        f"Lokalisation: {a.lokalisation}\n"
        f"Größe: {a.groesse.laenge_cm} × {a.groesse.breite_cm} × {a.groesse.tiefe_cm} cm\n"
        f"Wundgrund: {wundgrund}\n"
        f"Exsudat: Menge: {a.exsudat.menge.value}, Art: {a.exsudat.art.value}\n"
        f"Wundrand: {wundrand}\n"
        f"Infektionszeichen: {infekt}\n"
        f"Schmerz (VAS): {a.schmerz_vas}/10\n"
        + (f"Bemerkungen: {a.bemerkungen}\n" if a.bemerkungen else "")
        + "\nAntworte auf Deutsch in folgendem Format:\n\n"
        "=== PFLEGEFACHLICHE EINSCHÄTZUNG ===\n"
        "1. Wundbeurteilung (Heilungsphase, Wundzustand)\n"
        "2. Infektionsrisiko-Einschätzung\n"
        "3. Empfohlene Wundversorgung (Wundauflage, Reinigung, Verbandwechsel-Intervall)\n"
        "4. Pflegehinweise und Empfehlungen\n"
        "5. Wann ärztliche Konsultation empfohlen ist\n\n"
        "=== PATIENTEN-INFORMATION ===\n"
        "Schreibe 3–5 einfache, verständliche Sätze für den Patienten/die Patientin:\n"
        "- Was aktuell mit der Wunde passiert\n"
        "- Was der Patient selbst beobachten soll (Warnzeichen)\n"
        "- Was regelmäßig gemacht werden soll\n"
        "- Wann sofort Hilfe gerufen werden muss\n\n"
        "Hinweis: Dies ist eine pflegerische Einschätzung und ersetzt keine ärztliche Diagnose.\n"
        "Nenne am Ende kurz die fachlichen Grundlagen deiner Einschätzung "
        "(z.B. ABCD-Schema, NERDS/STONEES, Coloplast WundWegWeiser, OÖG-Leitlinien)."
    )


def _parse_sections(text: str) -> tuple[str, str]:
    """Trennt die AI-Antwort in Pflegefachlich + Patienten-Information."""
    marker = "=== PATIENTEN-INFORMATION ==="
    if marker in text:
        parts = text.split(marker, 1)
        return parts[0].strip(), parts[1].strip()
    return text.strip(), ""


def _analyse_ollama(a: WoundAssessment) -> AnalysisResult:
    prompt = _build_prompt(a)
    r = httpx.post(
        f"{settings.ollama_base_url}/api/generate",
        json={"model": settings.ollama_model, "prompt": prompt, "stream": False},
        timeout=120.0,
    )
    r.raise_for_status()
    text = r.json().get("response", "")
    pflege, patient = _parse_sections(text)

    return AnalysisResult(
        pflegefachliche_einschaetzung=pflege,
        patienten_information=patient,
        source="ollama",
        model_name=settings.ollama_model,
        timestamp=datetime.now(),
    )


def _analyse_claude(a: WoundAssessment) -> AnalysisResult:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = _build_prompt(a)

    msg = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    text = "".join(block.text for block in msg.content if hasattr(block, "text"))
    pflege, patient = _parse_sections(text)

    return AnalysisResult(
        pflegefachliche_einschaetzung=pflege,
        patienten_information=patient,
        source="claude",
        model_name=settings.anthropic_model,
        timestamp=datetime.now(),
    )
