# DATA_PROTECTION_OOEG_NOTE.md — Datenschutz-Compliance-Notiz

**Projekt:** WundScan AI — Klinisches Wunddokumentationssystem
**Organisation:** OÖG — Oberösterreichische Gesundheitsholding
**Einrichtung:** Salzkammergut Klinikum Gmunden
**Datum:** 2026-03-21 | **Version:** 1.0
**Status:** Entwurf — keine freigegebene Datenschutzdokumentation

---

## 1. Zweck dieses Dokuments

Diese Notiz dokumentiert die datenschutzrelevanten Aspekte von WundScan AI als Vorbereitung für eine formale Datenschutz-Folgenabschätzung (DSFA) gemäß Art. 35 DSGVO. Sie identifiziert Datenflüsse, Risiken und notwendige Maßnahmen für den Einsatz im klinischen Umfeld der OÖG.

**Wichtiger Hinweis:** Dieses Dokument ist ein projektinterner Entwurf. Vor produktivem Einsatz ist eine vollständige DSFA durch den Datenschutzbeauftragten der OÖG erforderlich.

---

## 2. Datenkategorien

### 2.1 Verarbeitete Daten

| Datenkategorie | Sensibilität | Verarbeitungszweck |
|---|---|---|
| Wundbilder (Fotos) | **Besonders schützenswert** (Art. 9 DSGVO — Gesundheitsdaten) | KI-gestützte Wundanalyse |
| Patientenstammdaten (Name, Geburtsdatum) | Personenbezogen | Zuordnung der Assessments |
| Klinische Assessmentergebnisse | Gesundheitsdaten | Wunddokumentation |
| API-Schlüssel (Anthropic) | Zugangsdaten | Authentifizierung am KI-Backend |
| Konfigurationsdaten (Modell, URL) | Technisch | App-Einstellungen |

### 2.2 Besonders kritisch

Wundbilder sind biometrische/medizinische Daten nach Art. 9 Abs. 1 DSGVO. Ihre Verarbeitung unterliegt erhöhten Anforderungen. Auch pseudonymisierte Wundbilder können durch Kontextinformationen (Lokalisation, Tattoos, Hautmerkmale) re-identifizierbar sein.

---

## 3. Datenflüsse — Drei Modi

### 3.1 Modus: Ollama (Lokal) — EMPFOHLEN für klinischen Einsatz

```
Patient:in → Foto → Browser (Gerät der Pflegekraft)
    → Base64-Konvertierung → HTTP-Aufruf an localhost:11434
    → Ollama-Server (lokales Gerät) → JSON-Ergebnis → Browser
```

**Datenschutzbewertung:** Alle Daten bleiben auf dem lokalen Gerät. Kein Internetverkehr. Keine Übermittlung an Dritte. DSGVO-konform hinsichtlich Datenübermittlung.

**Risiken:**
- Gerätesicherheit (Zugriffsschutz, Verschlüsselung)
- Keine Audit-Logs auf dem lokalen System
- Bilder im Browser-Speicher (RAM) während der Sitzung

### 3.2 Modus: Anthropic API — NUR für Entwicklung/Test

```
Patient:in → Foto → Browser → HTTPS → api.anthropic.com (USA)
    → Claude Modell → JSON-Ergebnis → Browser
```

**Datenschutzbewertung:** Gesundheitsdaten werden an einen US-Dienstleister übermittelt. Dies erfordert:
- Auftragsverarbeitungsvertrag (AVV) mit Anthropic
- Prüfung der Rechtsgrundlage für Drittlandtransfer (Art. 44 ff. DSGVO)
- Patienteneinwilligung nach Art. 9 Abs. 2 lit. a DSGVO
- Oder: Ausschließlich mit anonymisierten/synthetischen Daten nutzen

**Empfehlung:** Im klinischen Produktivbetrieb NICHT mit echten Patientendaten verwenden. Nur mit synthetischen Testbildern oder nach formaler Freigabe durch DSB.

### 3.3 Modus: Demo — Keine Datenverarbeitung

```
Browser → Statische Testdaten → Anzeige
```

**Datenschutzbewertung:** Keine personenbezogenen Daten werden verarbeitet. Risikolos.

---

## 4. Grundsatz der Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO)

### 4.1 Umgesetzte Maßnahmen

| Maßnahme | Status | Details |
|---|---|---|
| Pseudonyme statt Klarnamen | Empfohlen in UI | Eingabefeld erlaubt Pseudonyme/Initialen |
| Keine Speicherung auf Server | Umgesetzt | Client-only, keine Backend-Datenbank |
| Bilder nur im RAM | Umgesetzt | Base64 im React-State, nicht persistiert |
| API-Key nicht persistiert | Umgesetzt | Nur in Session-State, kein localStorage |

### 4.2 Erforderliche zusätzliche Maßnahmen

| Maßnahme | Priorität | Details |
|---|---|---|
| Automatisches Session-Timeout | Hoch | Daten nach Inaktivität (z.B. 30 Min.) löschen |
| Bildkomprimierung vor Übertragung | Mittel | Minimale Auflösung für Analyse verwenden |
| Metadaten-Stripping | Hoch | EXIF-Daten (GPS, Gerät) aus Fotos entfernen |
| Einwilligungsdokumentation | Hoch | Patienteneinwilligung vor Fotoaufnahme dokumentieren |
| Explizite Löschfunktion | Hoch | Alle Patientendaten und Bilder aktiv löschbar machen |

---

## 5. Rollentrennung und Zweckbindung

### 5.1 Definierte Rollen (Soll-Zustand)

| Rolle | Zugriff auf | Zweck |
|---|---|---|
| Pflegekraft (DGKP/PFA) | Wundbilder, Assessments, Patientendaten | Klinische Dokumentation |
| Arzt/Ärztin | Wundbilder, Assessments, Patientendaten | Diagnostik, Therapieentscheidung |
| Wundmanager:in | Aggregierte Daten, anonymisiert | Qualitätssicherung |
| IT/Admin | Konfiguration, Logs (ohne Patientendaten) | Systemwartung |
| Patient:in | Eigene Patienteninfo (PDF) | Selbstversorgung zuhause |

### 5.2 Aktueller Stand

Die App hat **keine Rollentrennung implementiert**. Jede Person mit Zugang zum Browser hat vollen Zugriff auf alle Daten. Für den klinischen Einsatz ist ein Rollen- und Berechtigungskonzept erforderlich.

---

## 6. Trennung der Datendomänen

### 6.1 Drei-Domänen-Modell (Soll-Zustand)

```
┌─────────────────────────────────────────────────────────────┐
│  DOMÄNE 1: Klinische Dokumentation                          │
│  Zweck: Versorgung der Patient:innen                        │
│  Daten: Patientenname, Wundbilder, Assessments              │
│  Zugriff: Pflegekraft, Arzt/Ärztin                          │
│  Speicherort: KIS (ORBIS) / Lokales Gerät                   │
│  Aufbewahrung: Gemäß Krankenanstaltengesetz (30 Jahre)      │
├─────────────────────────────────────────────────────────────┤
│  DOMÄNE 2: Trainingsdaten / Qualitätssicherung              │
│  Zweck: Verbesserung der KI-Analyse                         │
│  Daten: NUR anonymisierte Wundbilder (ohne Patientenbezug)  │
│  Zugriff: Forschung / QS-Team                               │
│  Speicherort: Separater, verschlüsselter Speicher           │
│  Aufbewahrung: Projektlaufzeit, danach löschen              │
├─────────────────────────────────────────────────────────────┤
│  DOMÄNE 3: Patientenausgabe                                 │
│  Zweck: Information und Selbstversorgung                    │
│  Daten: Allgemeine Pflegehinweise (KEINE Patientendaten)    │
│  Zugriff: Patient:in, Angehörige                            │
│  Speicherort: Ausgedrucktes Dokument / PDF                  │
│  Aufbewahrung: Beim Patienten/Patientin                     │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Aktueller Stand

Alle drei Domänen sind derzeit **nicht getrennt**. Die App speichert alle Daten im selben React-State. Eine technische und organisatorische Trennung ist für den Produktiveinsatz erforderlich.

---

## 7. Kennzeichnung sensibler Datenflüsse

### 7.1 Kritische Stellen im Code

| Stelle | Datei | Risiko | Empfehlung |
|---|---|---|---|
| `callAnthropicApi()` | WundScan-AI.jsx, Zeile ~338 | Wundbild wird an externe API gesendet | Warnung in UI (vorhanden), Einwilligung erforderlich |
| `imageBase64` im State | Gesamte App | Bild im Browser-Speicher | Session-Timeout, explizite Löschung |
| `patient.name` | Patientenformular | Klarname möglich | Pseudonym-Pflicht oder Warnung |
| `generatePrintReport()` | PDF-Export, Zeile ~508 | Patientendaten im gedruckten Dokument | Druckprotokoll, sichere Entsorgung |
| `window.open()` für PDF | PDF-Export | Neues Fenster mit Patientendaten | Automatisches Schließen nach Druck |

### 7.2 Datenschutz-Hinweise in der App (bereits implementiert)

- Badge "Daten werden über das Internet gesendet" bei Anthropic-Modus
- Badge "DSGVO-konform — Daten bleiben lokal" bei Ollama-Modus
- Empfehlung "Name / Pseudonym" im Patientenformular

---

## 8. Empfehlungen für den OÖG-konformen Einsatz

### 8.1 Sofort umsetzbar (technisch)

1. **EXIF-Stripping:** Metadaten (GPS, Geräteinformation) automatisch aus Fotos entfernen vor Analyse
2. **Session-Timeout:** Automatische Datenlöschung nach 30 Minuten Inaktivität
3. **Explizite Löschfunktion:** Button "Alle Daten löschen" mit Bestätigungsdialog
4. **Anthropic-Modus sperren:** Im Produktivbetrieb den Cloud-Modus deaktivieren oder mit Passwort schützen
5. **Pseudonym-Pflicht:** Klarnamen-Eingabe mit Warnhinweis versehen

### 8.2 Organisatorisch erforderlich (vor Produktiveinsatz)

1. **DSFA durchführen** gemäß Art. 35 DSGVO (Gesundheitsdaten + automatisierte Verarbeitung)
2. **Einwilligungsformular** für Patient:innen erstellen (Fotoaufnahme + KI-Analyse)
3. **Verarbeitungsverzeichnis** gemäß Art. 30 DSGVO ergänzen
4. **Schulung** der Anwender:innen zu Datenschutz bei Wundfotos
5. **Löschkonzept** mit definierten Fristen erstellen
6. **Verantwortlichkeiten** klären (Wer ist Verantwortlicher? OÖG als Organisation)

### 8.3 Mittelfristig (Architektur)

1. **Backend mit Authentifizierung:** Rollenbasierter Zugriff
2. **Verschlüsselte Speicherung:** Bilder und Daten verschlüsselt ablegen
3. **Audit-Logs:** Protokollierung von Zugriffen und Analysen
4. **Integration mit ORBIS:** Daten direkt im KIS speichern statt im Browser
5. **Anonymisierungspipeline:** Automatische Anonymisierung für Trainingsdaten

---

## 9. Rechtsgrundlagen

| Verarbeitung | Rechtsgrundlage | Kommentar |
|---|---|---|
| Wunddokumentation (intern) | Art. 9 Abs. 2 lit. h DSGVO (Gesundheitsversorgung) | In Verbindung mit KAKuG (Krankenanstaltengesetz) |
| KI-Analyse (lokal/Ollama) | Art. 9 Abs. 2 lit. h DSGVO | Daten bleiben unter Kontrolle der Einrichtung |
| KI-Analyse (Anthropic API) | Art. 9 Abs. 2 lit. a DSGVO (Einwilligung) | Ausdrückliche Einwilligung erforderlich, AVV prüfen |
| Patienteninformation (PDF) | Art. 6 Abs. 1 lit. e DSGVO (öffentliches Interesse) | Keine personenbezogenen Daten im generischen Dokument |
| Trainingsdaten (anonymisiert) | Keine DSGVO-Anwendung | Nur bei vollständiger Anonymisierung |

---

## 10. Zusammenfassung und offene Punkte

**WundScan AI ist datenschutzrechtlich für den Produktiveinsatz noch nicht freigegeben.** Die Architektur (Client-only, keine Persistenz) ist grundsätzlich datenschutzfreundlich, da keine Daten auf Servern gespeichert werden. Der Ollama-Modus hält alle Daten lokal.

**Offene Punkte für die Freigabe:**

- [ ] DSFA durch OÖG-Datenschutzbeauftragten
- [ ] Einwilligungsformular für Patient:innen
- [ ] Verarbeitungsverzeichnis aktualisieren
- [ ] EXIF-Stripping implementieren
- [ ] Session-Timeout implementieren
- [ ] Anthropic-Modus für Produktivbetrieb einschränken
- [ ] Schulungskonzept erstellen
- [ ] Rollentrennung konzipieren

---

*Dieses Dokument ist ein interner Entwurf des Projekts WundScan AI und stellt keine Rechtsberatung dar. Vor dem klinischen Einsatz ist eine formale Prüfung durch den Datenschutzbeauftragten der OÖG erforderlich.*
