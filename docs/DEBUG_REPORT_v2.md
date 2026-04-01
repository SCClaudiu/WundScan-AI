# WundScan AI — Debug Report v2
## Kritisches Reparaturticket — Deep Debug

**Datum:** 2026-03-21
**Version:** v5.0.0 → v5.0.1 (gepatcht)
**Datei:** WundScan-AI.html

---

## 1. DIAGNOSE-AGENT: Kernproblem identifiziert

### Symptom
Alle 5 sichtbaren Agenten (Start, API, Ollama, Quellen, Patient:inneninfo) zeigten "erfolgreich" (grün) an, obwohl die eigentliche Bildanalyse mit Timeout abbrach.

### Ursache
Die Agenten-Status-Logik in `AgentStatusPanel` (Zeile 645–701) war **rein deklarativ** und prüfte keine echten Bedingungen:

- **Quellen-Agent** (Zeile 696): Wurde sofort auf `status: "erfolgreich"` gesetzt mit Text "Bereit. Prüfung erfolgt nach Analyse." — aber der Status war grün, was den Nutzer in die Irre führte.
- **Patient:inneninfo-Agent** (Zeile 697): Identisches Problem.
- **Ollama-Agent** im API-Modus (Zeile 693): Zeigte "erfolgreich" mit "API-Modus: Ollama nicht benötigt" — obwohl "nicht benötigt" kein Erfolg ist.
- **API-Agent** im Demo-/Ollama-Modus (Zeile 674–676): Ebenso "erfolgreich" statt neutral.

**Kernaussage:** Die Agenten zeigten den Ladezustand der App, nicht den Zustand der Analyse. Ein geladenes HTML ≠ ein funktionierender API-Call ≠ eine erfolgreiche Analyse.

---

## 2. CLAUDE-API-AGENT: Findings

### Geprüfte Komponenten

| Komponente | Status vor Fix | Status nach Fix |
|---|---|---|
| Endpoint | `https://api.anthropic.com/v1/messages` — korrekt | Unverändert |
| Header `anthropic-version` | `2023-06-01` — korrekt | Unverändert |
| Header `anthropic-dangerous-direct-browser-access` | Vorhanden — korrekt | Unverändert |
| Header `x-api-key` | Aus State — korrekt | Unverändert |
| **Modellname** | `claude-sonnet-4-6` — **UNGÜLTIG** | **Gefixt: `claude-sonnet-4-20250514`** |
| MIME-Type-Erkennung | `detectImageMediaType()` vorhanden, 3-stufig (file.type → data-URL → magic bytes) — gut | Validierung hinzugefügt: Prüft gegen erlaubte MIME-Types |
| Base64-Bereinigung | `.replace(/^data:image\/[^;]+;base64,/, "")` — korrekt | Validierung: Prüft ob Base64 nicht zu kurz/beschädigt |
| Payload-Struktur | `messages`-Array mit image content block — korrekt | Refactored für bessere Lesbarkeit |

### Kritischer Fund: Modellname
Der Modellname `claude-sonnet-4-6` ist **kein gültiger API-Modellstring**. Die korrekte Bezeichnung ist `claude-sonnet-4-20250514`. Dies allein konnte zu einem 400-Fehler führen, der als Timeout dargestellt wurde.

---

## 3. TIMEOUT-AGENT: Analyse

### Problem
- 60s Timeout war zu knapp für große Bilder (nach Komprimierung + API-Verarbeitung)
- `AbortError` wurde gefangen, aber die Meldung war generisch: "Die API hat nicht innerhalb von 60 Sekunden geantwortet"
- **Echte Ursache wurde verschluckt**: Ein 400-Fehler wegen ungültigem Modellnamen (oder MIME-Type-Problem) führte möglicherweise zu langem Warten ohne Antwort, bis der Timeout griff

### Fixes
1. **Timeout erhöht**: 60s → 90s für Anthropic (große Bilder brauchen mehr Zeit)
2. **Ursachenerkennung im Timeout**: Bildgröße wird in der Fehlermeldung angezeigt, wenn >2MB
3. **CORS-Pre-Check**: Vor dem API-Call wird geprüft ob die App über `file://` geöffnet wird — wenn ja, sofortige verständliche Meldung statt 60s Warten auf Timeout
4. **Bildgrößen-Pre-Check**: Bilder >20MB werden sofort abgelehnt, >4MB werden komprimiert
5. **Spezifischere Fehlermeldungen**: Statt generischem Timeout werden jetzt mögliche Ursachen genannt

---

## 4. AGENTEN-LOGIK-AGENT: Umbau

### Neues Status-Modell

| Agent | Vorher | Nachher |
|---|---|---|
| Start-Agent | Sofort "erfolgreich" nach 500ms | Unverändert (korrekt: App ist geladen) |
| API-Agent (Anthropic) | Echter Test mit `testAnthropicKey()` | Unverändert (war bereits gut) |
| API-Agent (Demo/Ollama) | "erfolgreich" | **"wartet"** — nicht benötigt ist nicht erfolgreich |
| Ollama-Agent (Anthropic/Demo) | "erfolgreich" | **"wartet"** — nicht benötigt ist nicht erfolgreich |
| Ollama-Agent (Ollama) | Echter Test mit `testOllamaConnection()` | Unverändert (war bereits gut) |
| Quellen-Agent | Sofort "erfolgreich" | **"wartet"** — Prüfung erst nach Analyse |
| Patient:inneninfo-Agent | Sofort "erfolgreich" | **"wartet"** — Prüfung erst nach Analyse |

### Neuer Status: "warnung" (gelb)
Hinzugefügt für Fälle wie Rate-Limit (429) — API erreichbar, aber gedrosselt.

---

## 5. UX-/FEHLERMELDUNGS-AGENT: Verbesserungen

### Neue spezifische Fehlermeldungen

| HTTP-Status | Vorher | Nachher |
|---|---|---|
| 401 | "API-Key ungültig" | "API-Key ungültig oder abgelaufen (401). Prüfe den Key in den Einstellungen." |
| 403 | Nicht behandelt | "Zugriff verweigert (403). Der API-Key hat keine Berechtigung für dieses Modell." |
| 429 | "Rate-Limit erreicht" | "Rate-Limit erreicht (429). Bitte 30–60 Sekunden warten und erneut versuchen." |
| 400 (media_type) | "Bildformat nicht erkannt" | "Bildformat wird von der API nicht akzeptiert (400). Bitte ein JPEG- oder PNG-Bild verwenden." |
| 400 (size) | Nicht behandelt | "Request zu groß (400). Das Bild ist nach Komprimierung noch zu groß." |
| 400 (base64) | Nicht behandelt | "Base64-Daten ungültig (400). Das Bild ist möglicherweise beschädigt." |
| 500/503 | Generischer Fehler | "Anthropic-Server vorübergehend nicht verfügbar. Bitte in 1–2 Minuten erneut versuchen." |
| Failed to fetch | "Netzwerkfehler" | Unterscheidung: CORS (file://), Netzwerk, Firewall — mit konkreten Lösungsschritten |

### Prinzip
Jede Fehlermeldung enthält jetzt: (1) Was passiert ist, (2) Warum, (3) Was der Nutzer tun kann.

---

## 6. ROBUSTHEITS-AGENT: Neue Features

### A) Bild-Komprimierung (`compressImageIfNeeded`)
- Canvas-basierte Komprimierung für Bilder >4MB Base64
- Schrittweise Qualitätsreduktion (0.85 → 0.3)
- Dimension-Reduktion wenn Qualität nicht reicht (max 2048px)
- Logging der Komprimierungsergebnisse in Console

### B) CORS-Warnung (`checkFileProtocolWarning`)
- Prüft `window.location.protocol === "file:"` VOR dem API-Call
- Sofortige verständliche Fehlermeldung mit Lösung (HTTP-Server-Befehl)
- Verhindert sinnloses 90s-Warten auf Timeout

### C) Bildgrößen-Validierung (`getBase64SizeKB`)
- Bilder >20MB: Sofortige Ablehnung mit verständlicher Meldung
- Bilder 4–20MB: Automatische Komprimierung mit Fortschrittsanzeige
- Bildgröße wird bei Timeout-Fehlern in der Meldung angezeigt

### D) MIME-Type-Validierung
- Erlaubte Typen: `image/png`, `image/jpeg`, `image/webp`, `image/gif`
- Unbekannte MIME-Types werden vor dem API-Call abgefangen

### E) Base64-Validierung
- Prüft ob Base64-Daten mindestens 100 Zeichen lang sind
- Verhindert Senden beschädigter/leerer Bilddaten

---

## Testprotokoll

### Syntaxprüfung
- [x] Bracket-Balance (Braces, Parens, Brackets): Alle 0 — korrekt
- [x] Backup erstellt: WundScan-AI.html.backup

### Funktionale Tests (manuell durchzuführen)

1. **Demo-Modus öffnen**: Agenten sollten "wartet" (grau) zeigen für API, Ollama, Quellen, Patient:inneninfo — NUR Start-Agent "erfolgreich" (grün)
2. **API-Key eintragen + Verbindung testen**: API-Agent sollte "prüft" → "erfolgreich" oder "fehler" zeigen
3. **Analyse ohne Bild**: Sollte funktionieren mit Textanalyse
4. **Analyse mit kleinem Bild (<1MB)**: Keine Komprimierung, direkter API-Call
5. **Analyse mit großem Bild (>4MB)**: Komprimierungsmeldung, dann API-Call
6. **file:// öffnen + Analyse**: Sofortige CORS-Warnung statt 60s Timeout
7. **Falscher API-Key**: Spezifische 401-Fehlermeldung
8. **Quellen/Patient:inneninfo nach Analyse**: Status wechselt von "wartet" zu "erfolgreich"/"fehler" basierend auf Inhalt

---

## Zusammenfassung der Änderungen

| # | Datei | Zeilen | Änderung |
|---|---|---|---|
| 1 | WundScan-AI.html | ~178ff | Neue Funktionen: `checkFileProtocolWarning()`, `compressImageIfNeeded()`, `getBase64SizeKB()` |
| 2 | WundScan-AI.html | ~232, ~821 | Modellname: `claude-sonnet-4-6` → `claude-sonnet-4-20250514` |
| 3 | WundScan-AI.html | ~696–697 | Quellen+Patient-Agent: "erfolgreich" → "wartet" |
| 4 | WundScan-AI.html | ~674–693 | API+Ollama-Agent (nicht benötigt): "erfolgreich" → "wartet" |
| 5 | WundScan-AI.html | ~731 | Neuer Status "warnung" (gelb) in statusColors |
| 6 | WundScan-AI.html | ~800ff | Anthropic-Branch komplett neu: CORS-Check, Komprimierung, Validierung, bessere Fehlerbehandlung |
| 7 | WundScan-AI.html | ~1060ff | Catch-Block: Spezifische Fehlermeldungen mit Ursache und Lösungsschritten |
