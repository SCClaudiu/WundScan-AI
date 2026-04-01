# WundScan-AI - Projekt Seed

## Ueberblick
WundScan-AI ist ein klinisches Wunddokumentations-Tool mit KI-Unterstuetzung.
Entwickler: Claudiu Schuhmeier (DGKP, AI Developer)
Einsatzort: Salzkammergut Klinikum Gmunden, OOEG

## Stack
- Frontend: HTML/CSS/JS (index.html, app.js, style.css)
- Backend: Python/Streamlit (wundscan/app.py)
- KI: Anthropic Claude API (claude-sonnet-4)
- Konfiguration: .env Dateien, config.json
- Agent: Kairos Daemon (autonomer Background-Agent)

## Kernfunktionen
- Wundanalyse per Bilderkennung
- RLS-Format Ausgabe (Ressourcen, Lebensaktivitaeten, Strategien)
- Pflegeplanung nach NANDA-PESR Schema
- Patienteninformation Wundversorgung
- Export fuer ORBIS/KIS Integration
- Quellenangaben via Amboss

## Dateistruktur
- /wundscan/ - Streamlit Backend (app.py, core/, models/, ui/)
- /WundScan-AI/ - Standalone Frontend (index.html)
- /kairos/ - Autonomer Daemon
- /docs/ - Klinische Templates, Datenschutz, Debug Reports
- /archive/ - Aeltere Versionen

## Wichtige Dateien
- wundscan/core/wound_logic.py - Wundanalyse Logik
- wundscan/core/llm_provider.py - Claude API Integration
- wundscan/core/reporting.py - RLS Report Generator
- wundscan/ui/pages/wound_scan.py - Scan UI
- wundscan/ui/pages/doc_export.py - Dokumentenexport

## Qualitaetsanforderungen
- DSGVO-konform (keine Patientendaten in Cloud)
- Pflegerisch angepasste Sprache
- Klaus Pointner als konzeptioneller Urheber genannt
- Amboss als Quellenreferenz

## Offene Aufgaben
- ORBIS Integration vertiefen (EPA/LEP Framework)
- Lokale LLM Option (Ollama) als Fallback
- Erweiterte Wundtypen-Erkennung
- Mobilversion fuer Station
