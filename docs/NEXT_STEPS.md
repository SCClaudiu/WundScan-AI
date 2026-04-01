# NEXT_STEPS.md — Offene Punkte und nächste Schritte

**Projekt:** WundScan AI
**Stand:** 2026-03-21
**Kontext:** Nach vollständiger Bestandsaufnahme und Erstellung der Kerndokumente

---

## Phase 1: Sofort umsetzbar (Quick Wins)

### 1.1 HTML-Version auf v3.0 aktualisieren
**Priorität:** Hoch | **Aufwand:** Mittel

Die `WundScan-AI.html` (v2.0) hat ein älteres Assessment-Schema als die `WundScan-AI.jsx` (v3.0). Fehlende Felder in der HTML-Version:
- DFS-Klassifikation (Wagner-Armstrong)
- Verbandempfehlung (OÖG-gelistet)
- Wundumgebung (eigenes Feld)
- Überweisungskriterien
- Biofilm-Verdacht
- Exsudat-Farbe und -Geruch
- Tiefe in der Größenschätzung
- Schmerzassessment
- Nächste Evaluation

**Aktion:** System-Prompt und JSON-Schema aus der JSX v3.0 in die HTML-Datei übernehmen. Die HTML-Version ist die aktuell lauffähige Version (kein Build nötig), daher hat sie Priorität.

### 1.2 Datenpersistenz einbauen (localStorage)
**Priorität:** Hoch | **Aufwand:** Gering

Aktuell gehen alle Daten bei einem Browser-Reload verloren. Minimale Lösung:
- Patientenliste und Assessments in `localStorage` speichern (mit Verschlüsselungshinweis)
- Beim Laden aus `localStorage` wiederherstellen
- Explizite Löschfunktion ("Alle Daten löschen")
- Warnung: localStorage ist nicht verschlüsselt

### 1.3 EXIF-Stripping implementieren
**Priorität:** Hoch | **Aufwand:** Gering

GPS-Koordinaten und Geräteinformationen aus Wundfotos entfernen, bevor sie an die KI gesendet werden. Kann client-seitig mit Canvas-API erfolgen:
```javascript
// Bild auf Canvas zeichnen entfernt automatisch EXIF-Daten
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
// ... drawImage → toDataURL
```

### 1.4 Session-Timeout
**Priorität:** Hoch | **Aufwand:** Gering

Automatisches Löschen aller Daten aus dem React-State nach 30 Minuten Inaktivität. Warnung 5 Minuten vorher.

---

## Phase 2: Kurzfristig (1–2 Wochen)

### 2.1 ORBIS-Export-Funktion
**Priorität:** Hoch | **Aufwand:** Mittel

Basierend auf `CLINICAL_TEMPLATE_ORBIS.md` eine Export-Funktion bauen, die:
- Assessment-Ergebnisse in das ORBIS-Textbaustein-Format überführt
- Als kopierbaren Text oder Datei (TXT/RTF) exportiert
- Die klinische Vorlage mit KI-Ergebnissen vorbefüllt
- Manuelle Felder (Anamnese, Durchblutung, Unterschrift) als Leerstellen belässt

### 2.2 Patienteninfo-PDF aus der App generieren
**Priorität:** Mittel | **Aufwand:** Mittel

Die generische `PATIENT_INFO_WUNDVERSORGUNG.pdf` um patientenspezifische Daten ergänzen:
- Verordneter Verband (aus Analyseergebnis)
- Wundspülung
- Wechselintervall
- Nächster Kontrolltermin
- Spezifische Warnhinweise bei DFS

### 2.3 Echtes PDF-Export (programmatisch)
**Priorität:** Mittel | **Aufwand:** Mittel

Statt `window.print()` eine echte PDF-Generierung im Browser implementieren. Optionen:
- `jsPDF` (client-seitig, kein Server nötig)
- `html2canvas` + `jsPDF` (Screenshot-basiert)
- Alternativ: HTML-Template → Print-CSS optimieren

### 2.4 Fotodokumentation-Anleitung
**Priorität:** Mittel | **Aufwand:** Gering

In-App-Anleitung für standardisierte Wundfotografie:
- Abstand: 30 cm
- Beleuchtung: Tageslicht oder Raumlicht, kein Blitz
- Winkel: Senkrecht zur Wundfläche
- Referenzobjekt: 1-Euro-Münze neben der Wunde
- Hintergrund: Neutral, saubere Unterlage

---

## Phase 3: Mittelfristig (1–3 Monate)

### 3.1 Build-System einrichten
**Priorität:** Mittel | **Aufwand:** Mittel

Die JSX v3.0 braucht ein Build-System, um produktionsreif zu sein:
- Vite oder Create React App einrichten
- `package.json` erstellen
- Dependencies: React, Recharts, Lucide React, Tailwind CSS
- Build → Deploybare HTML/JS-Dateien

### 3.2 Dekubitus-Klassifikation (EPUAP/NPUAP)
**Priorität:** Mittel | **Aufwand:** Mittel

Bisher nur Wagner-Armstrong (DFS). Ergänzen:
- EPUAP/NPUAP Kategorie I–IV + nicht klassifizierbar + Verdacht auf tiefe Gewebsschädigung
- In System-Prompt integrieren
- In UI als eigenes Feld

### 3.3 Schmerzassessment integrieren
**Priorität:** Mittel | **Aufwand:** Gering

VAS-Skala (0–10) als interaktives Element:
- Slider oder Zahleneingabe
- Speicherung im Assessment
- Verlaufsdiagramm über Zeit

### 3.4 Einwilligungsformular digital
**Priorität:** Hoch (Compliance) | **Aufwand:** Mittel

Digitales Einwilligungsformular für Wundfotografie und KI-Analyse:
- Checkbox-basiert
- Zeitstempel
- Optional: Unterschrift (Touch-Canvas)

---

## Phase 4: Langfristig (3–6 Monate)

### 4.1 Backend-Architektur
- Node.js/Express oder Python/FastAPI Backend
- Verschlüsselte Datenbank (PostgreSQL mit pgcrypto)
- Authentifizierung (OAuth2 / SAML für OÖG-SSO)
- Rollenbasierte Zugriffskontrolle
- Audit-Logs

### 4.2 ORBIS-Integration (Schnittstelle)
- HL7 FHIR-Schnittstelle prüfen
- Oder: Textbaustein-Import über Zwischenablage
- Abstimmung mit OÖG IT-Abteilung

### 4.3 Offline-Fähigkeit (PWA)
- Service Worker für Offline-Nutzung
- Lokale Datenspeicherung mit IndexedDB
- Synchronisierung bei Internetverfügbarkeit

### 4.4 KI-Modell-Evaluierung
- Vergleich: Claude vs. Ollama/LLaVA vs. spezialisierte Modelle
- Testdatensatz mit annotierten Wundbildern (synthetisch oder anonymisiert)
- Metriken: Genauigkeit der Phasenbestimmung, Gewebeverteilung, Infektionserkennung

---

## Echte Blocker (Stand heute)

| Blocker | Wer kann lösen | Kommentar |
|---|---|---|
| **DSFA fehlt** | OÖG Datenschutzbeauftragter | Ohne DSFA kein Produktiveinsatz mit echten Patientendaten |
| **Keine Einwilligung** | Jurist:in / DSB | Formular für Fotoaufnahme + KI-Analyse muss erstellt und freigegeben werden |
| **ORBIS-Schnittstelle unklar** | OÖG IT | Technische Möglichkeiten für Textbaustein-Import oder FHIR prüfen |
| **Kein Build-System für JSX** | Entwickler:in | JSX v3.0 ist nicht direkt im Browser lauffähig |
| **HTML v2.0 veraltet** | Entwickler:in | Muss auf v3.0-Schema aktualisiert werden |

---

## Zusammenfassung: Was jetzt am wichtigsten ist

1. **HTML auf v3.0 updaten** — die lauffähige Version muss das vollständige Schema haben
2. **localStorage-Persistenz** — ohne Persistenz ist die App nicht praxistauglich
3. **EXIF-Stripping + Session-Timeout** — minimale Datenschutz-Maßnahmen
4. **ORBIS-Export** — der Kernnutzen für den klinischen Alltag
5. **DSFA anstoßen** — formaler Prozess mit DSB starten

---

*Erstellt im Rahmen der WundScan AI Projektanalyse, 2026-03-21*
