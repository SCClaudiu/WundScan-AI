# PROJECT_AUDIT.md — WundScan AI Bestandsaufnahme

**Datum:** 2026-03-21
**Erstellt durch:** Automatisierte Projektanalyse
**Version:** 1.0

---

## 1. Projektziel

WundScan AI ist ein KI-gestütztes klinisches Wunddokumentationssystem, entwickelt als Portfolio-Projekt für die Pflegefachassistenz am Salzkammergut Klinikum Gmunden (OÖG — Oberösterreichische Gesundheitsholding). Das System unterstützt Pflegekräfte bei der standardisierten, evidenzbasierten Wundbeurteilung durch Bildanalyse mittels KI.

**Kernanspruch:** Strukturierte Wunddokumentation gemäß aktuellen pflegerischen Leitlinien mit automatisierter Analyse von Wundbildern.

---

## 2. Dateien im Projektordner

| Datei | Größe | Version | Beschreibung |
|---|---|---|---|
| `WundScan-AI.jsx` | ~99 KB, 2112 Zeilen | v3.0.0 | React-Hauptkomponente (modular, import-basiert) |
| `WundScan-AI.html` | ~58 KB, 656 Zeilen | v2.0.0 | Standalone Browser-Version (Babel im Browser, CDN-Abhängigkeiten) |

**Keine weiteren Dateien vorhanden:** Keine README, keine Config, keine Testdaten, keine Dokumentation, kein Package.json, kein Build-System.

---

## 3. Funktionsumfang (aktueller Stand)

### 3.1 Implementiert und funktional

- **KI-Analyse-Pipeline:** Bildupload → Base64-Konvertierung → API-Aufruf → JSON-Parsing → Validierung → Anzeige
- **Drei KI-Backends:** Anthropic Claude API (claude-sonnet-4-6), Ollama (lokal, llava u.a.), Demo-Modus
- **Klinisches Assessment-Schema (JSON):**
  - Wundphase (Exsudation/Granulation/Epithelisierung/Gemischt)
  - Gewebetypen mit %-Verteilung (Granulation/Epithel/Fibrin/Nekrose/Sonstiges)
  - Exsudat (Menge, Art, Farbe, Geruch)
  - Wundrand und Wundumgebung
  - Infektionszeichen nach NERDS/STONEES
  - Größenschätzung (L×B×T, Fläche, Referenzobjekt)
  - DFS-Klassifikation (Wagner-Armstrong)
  - Schmerzhinweise
  - Verbandempfehlung (OÖG-gelistete Produkte)
  - Überweisungskriterien mit Dringlichkeitsstufe
- **Patientenverwaltung:** Erstellen, Bearbeiten, Assessment-Historie
- **Verlaufs-Charts:** Flächenverlauf, Gewebeverteilung über Zeit (Recharts)
- **PDF-Export:** Druckbare Berichte via `window.open()` + `window.print()`
- **Datenschutz-Hinweise:** Badges für Lokal/Internet-Modus in der UI
- **Ollama-Verbindungstest:** Server- und Modellprüfung
- **Robustes JSON-Parsing:** 3 Fallback-Stufen (direkt, Codeblock, Brace-Extraction)
- **Quellenangaben im Footer:** AMBOSS, Coloplast, OÖG, Pointner

### 3.2 Evidenzbasis im System-Prompt

| Quelle | Inhalt |
|---|---|
| AMBOSS | ABCD-Schema, Wundphasen, Chronische Wunden |
| Coloplast WundWegWeiser | 5-Schritte-Modell, 14-Tage-Regel |
| OÖG Verbandstoffliste 2023 | Produktempfehlungen nach Indikation |
| DGKP K. Pointner (OÖG) | DFS-Vortrag, Wagner-Armstrong |

---

## 4. Identifizierte Lücken

### 4.1 Fehlende Projektdateien

| Fehlt | Kritikalität | Beschreibung |
|---|---|---|
| README.md | Mittel | Keine Projektbeschreibung, Installationsanleitung |
| package.json / Build-System | Mittel | JSX v3.0 ist nicht direkt lauffähig ohne Build-Tool |
| Klinische Dokumentationsvorlage (ORBIS) | Hoch | Kein exportierbares Format für KIS-Integration |
| Patienteninformation | Hoch | Kein Dokument für Patient:innen zur Wundversorgung zuhause |
| Datenschutzdokumentation | Hoch | Keine formale Datenschutz-Compliance-Notiz für OÖG |
| Testdaten / Beispieldatensätze | Niedrig | Keine synthetischen Testdaten vorhanden |
| Config-Dateien | Niedrig | API-Keys, Modellparameter fest im Code |

### 4.2 Klinische/Fachliche Lücken

| Lücke | Details |
|---|---|
| ORBIS-Integration | Keine strukturierte Exportschnittstelle für das Krankenhausinformationssystem ORBIS |
| Patientenausgabe | Keine automatisierte Erstellung von Patient:innen-verständlichen Dokumenten |
| Dekubitusklassifikation | Keine EPUAP/NPUAP-Klassifikation (nur Wagner-Armstrong für DFS) |
| Wundanamnese-Formular | Ätiologie-Feld vorhanden, aber kein strukturiertes Anamneseformular |
| Schmerzassessment | Nur Hinweis auf VAS, kein integriertes Schmerzerfassungstool |
| Fotodokumentation-Standard | Keine Anleitung für standardisierte Wundfotografie (Abstand, Beleuchtung, Winkel) |

### 4.3 Technische Lücken

| Lücke | Details |
|---|---|
| Persistenz | Keine Datenspeicherung — alle Daten gehen bei Browser-Reload verloren |
| HTML vs. JSX Versionsunterschied | HTML ist v2.0 (älteres Schema), JSX ist v3.0 (vollständiges Schema) |
| Kein Build-System | JSX v3.0 benötigt React-Build (Webpack/Vite/etc.) |
| Kein echtes PDF-Export | Nur `window.print()` — kein programmatischer PDF-Ersteller |
| CORS-Probleme | Anthropic API direkt aus dem Browser → CORS-Header erforderlich |
| Keine Authentifizierung | API-Key im Browser-Memory, kein Login-System |
| Keine Offline-Fähigkeit | Kein Service Worker, keine PWA-Konfiguration |
| Fehlende Barrierefreiheit | Keine ARIA-Labels, keine Tastaturnavigation optimiert |

### 4.4 Datenschutz-/Compliance-Lücken

| Lücke | Details |
|---|---|
| Keine Datenschutz-Folgenabschätzung (DSFA) | Für medizinische Bilddaten erforderlich |
| API-Key-Speicherung | Klartext im Browser-State, nicht verschlüsselt |
| Keine Einwilligungsdokumentation | Patienteneinwilligung für Fotoaufnahmen nicht im System |
| Anthropic-Modus sendet Bilder extern | Keine Aufklärung über Datenverarbeitung durch Dritte |
| Keine Audit-Logs | Kein Protokoll, wer wann welche Analyse durchgeführt hat |
| Keine Datenlöschung | Keine Funktion zum vollständigen Löschen von Patientendaten |
| Fehlende Rollentrennung | Kein Unterschied zwischen Pflege/Arzt/Admin |

---

## 5. Architektur-Übersicht

```
Browser (Client-Only)
├── WundScan-AI.html (Standalone, CDN-basiert, Babel Runtime)
│   ├── React 18 (UMD)
│   ├── Recharts (UMD)
│   ├── Tailwind CSS (CDN)
│   └── Lucide Icons (UMD)
│
├── WundScan-AI.jsx (React-Komponente, erfordert Build)
│   ├── Import-basiert (React, Recharts, Lucide)
│   └── Export default: WundScanAI()
│
└── KI-Backends (API-Aufrufe aus dem Browser)
    ├── Anthropic API (claude-sonnet-4-6) → Internet
    ├── Ollama (localhost:11434) → Lokal
    └── Demo-Modus → Statische Testdaten
```

---

## 6. Qualitätseinschätzung

| Aspekt | Bewertung | Kommentar |
|---|---|---|
| Klinische Fachlichkeit | Gut | Evidenzbasierter System-Prompt, korrekte Terminologie |
| Code-Qualität (JSX) | Gut | Sauber strukturiert, modular, gut kommentiert |
| UI/UX | Gut | Modern, übersichtlich, responsive |
| Datenschutz | Unzureichend | Keine formale Dokumentation, keine DSFA |
| Produktionsreife | Nicht gegeben | Keine Persistenz, kein Build, keine Auth |
| Dokumentation | Unzureichend | Keine README, keine klinische Vorlage, keine Patienteninfo |
| Testabdeckung | Nicht vorhanden | Keine Tests |

---

## 7. Gesamtfazit

WundScan AI ist ein fachlich fundiertes, gut strukturiertes Portfolio-Projekt mit einem umfassenden evidenzbasierten System-Prompt und einer modernen React-UI. Die klinischen Inhalte (ABCD-Schema, NERDS/STONEES, Wagner-Armstrong, OÖG-Verbandstoffliste) sind korrekt und praxisnah implementiert.

**Für ein klinisch nutzbares MVP fehlen primär:**

1. Klinische Dokumentationsvorlage (ORBIS-tauglich)
2. Patient:innen-Information zur Wundversorgung
3. Datenschutz-Compliance-Dokumentation
4. Persistenz (mindestens localStorage)
5. Synchronisierung HTML ↔ JSX (Versionsgleichstand)

Diese Lücken werden in den nachfolgenden Projektdateien adressiert.
