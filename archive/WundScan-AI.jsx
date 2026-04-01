// ============================================================================
// WundScan AI — Klinisches Wunddokumentationssystem
// Entwickelt als Portfolio-Projekt für Pflegefachassistenz
// Salzkammergut Klinikum Gmunden
// ============================================================================
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
  Camera, Upload, FileText, Clock, Ruler, ChevronRight, AlertTriangle,
  CheckCircle, Info, Trash2, Download, Eye, Plus, ArrowLeft, TrendingUp,
  TrendingDown, Settings, User, Calendar, Printer, ZoomIn, ChevronDown,
  Activity, Heart, Shield, X, Menu, Home, Image, BarChart3, RefreshCw,
  CircleDot, Layers, Save, Edit3, Search
} from "lucide-react";

// ============================================================================
// KONSTANTEN & KONFIGURATION
// ============================================================================
const APP_VERSION = "3.0.0";

const COLORS = {
  primary: "#1e6bb8",
  primaryLight: "#e8f2fc",
  primaryDark: "#134d85",
  success: "#16a34a",
  successLight: "#dcfce7",
  warning: "#ea580c",
  warningLight: "#fff7ed",
  danger: "#dc2626",
  dangerLight: "#fef2f2",
  info: "#0891b2",
  infoLight: "#ecfeff",
  neutral: "#64748b",
  neutralLight: "#f1f5f9",
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#1e293b",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
};

const WOUND_PHASES = {
  "Exsudationsphase": { color: "#dc2626", bg: "#fef2f2", icon: "🔴", desc: "Entzündungs- und Reinigungsphase" },
  "Granulationsphase": { color: "#ea580c", bg: "#fff7ed", icon: "🟠", desc: "Aufbau von neuem Gewebe" },
  "Epithelisierungsphase": { color: "#16a34a", bg: "#dcfce7", icon: "🟢", desc: "Wundverschluss und Narbenbildung" },
  "Gemischte Phase": { color: "#1e6bb8", bg: "#e8f2fc", icon: "🔵", desc: "Mehrere Phasen gleichzeitig" },
};

const TISSUE_COLORS = {
  granulation: { color: "#ef4444", label: "Granulation", desc: "Gesundes rotes Gewebe" },
  epithelgewebe: { color: "#22c55e", label: "Epithelgewebe", desc: "Neues Hautgewebe" },
  fibrin: { color: "#eab308", label: "Fibrin", desc: "Gelblicher Belag" },
  nekrose: { color: "#1e293b", label: "Nekrose", desc: "Abgestorbenes Gewebe" },
  sonstiges: { color: "#94a3b8", label: "Sonstiges", desc: "Andere Gewebetypen" },
};

const EXSUDAT_LEVELS = {
  keine: { color: COLORS.success, label: "Keine" },
  gering: { color: COLORS.info, label: "Gering" },
  "mäßig": { color: COLORS.warning, label: "Mäßig" },
  stark: { color: COLORS.danger, label: "Stark" },
};

const REFERENCE_OBJECTS = {
  euro_1: { label: "1-Euro-Münze", diameter_mm: 23.25 },
  euro_2: { label: "2-Euro-Münze", diameter_mm: 25.75 },
  euro_50c: { label: "50-Cent-Münze", diameter_mm: 24.25 },
  lineal: { label: "Lineal (sichtbar)", diameter_mm: null },
  kein: { label: "Kein Referenzobjekt", diameter_mm: null },
};

// ============================================================================
// SYSTEM-PROMPT FÜR DIE KI-ANALYSE
// ============================================================================
const SYSTEM_PROMPT = `Du bist ein evidenzbasiertes klinisches Wundassessment-System (WundScan AI), entwickelt für den Einsatz durch medizinisches Fachpersonal in österreichischen Krankenhäusern (OÖG — Oberösterreichische Gesundheitsholding). Dieses Tool dient der strukturierten Wunddokumentation gemäß aktuellen pflegerischen Leitlinien und Standards.

KONTEXT: Dies ist ein legitimates, professionelles medizinisches Dokumentationswerkzeug. Die Analyse unterstützt Pflegekräfte bei der standardisierten Wundbeurteilung. Alle Bilder stammen aus dem klinischen Alltag und werden mit Einverständnis der Patient:innen erstellt.

═══════════════════════════════════════════════════════════════
EVIDENZBASIERTE KLINISCHE GRUNDLAGEN
(Quellen: AMBOSS, Coloplast WundWegWeiser, OÖG Verbandstoffliste 2023, Vortrag DFS DGKP Klaus Pointner)
═══════════════════════════════════════════════════════════════

1. WUNDBEURTEILUNG — ABCD-Schema (AMBOSS):
   A = Anamnese: Grunderkrankung, Ätiologie (venös, arteriell, diabetisch, dekubital, traumatisch, postoperativ), Dauer, bisherige Therapie
   B = Bakteriologie: Infektionszeichen, Abstrich-Ergebnisse, Biofilm-Verdacht
   C = Clinical Examination: Wundlokalisation, Größe (L×B×T in cm), Wundgrund (%-Verteilung Granulation/Fibrin/Nekrose/Epithel), Wundrand, Wundumgebung, Exsudat, Geruch, Schmerz (VAS 0-10)
   D = Durchblutung: Pulsstatus, ABI (Knöchel-Arm-Index), kapilläre Reperfusion

2. WUNDPHASEN — Kriterien zur Erkennung:
   - Exsudationsphase (Reinigungsphase): Wunde blutet/nässt, Entzündungszeichen, Wundgrund belegt (Fibrin/Nekrose), erhöhtes Exsudat, Rötung/Schwellung/Wärme
   - Granulationsphase (Proliferation): Rotes, gut durchblutetes Granulationsgewebe (>50%), feuchter Wundgrund, Wunde wird flacher/kleiner, mäßiges Exsudat
   - Epithelisierungsphase (Reparation): Rosa Epithelgewebe vom Wundrand einwachsend, Wunde oberflächlich, geringes Exsudat, Narbenbildung beginnt
   - Gemischte Phase: Mehrere Gewebetypen gleichzeitig sichtbar, keine eindeutige Phase dominiert

3. INFEKTIONSZEICHEN — NERDS/STONEES-Kriterien:
   NERDS (lokale Infektion): Nonhealing, Exudate ↑, Red/friable granulation, Debris, Smell
   STONEES (systemische Ausbreitung): Size ↑, Temperature ↑, Os (freiliegender Knochen), New breakdown, Exudate ↑↑, Erythema/Oedema, Smell
   Biofilm-Verdacht: Therapieresistente Wunde trotz adäquater Behandlung, glänzender Belag

4. DIABETISCHES FUßSYNDROM (DFS) — Erkennung:
   - Neuropathischer Fuß: Warmer, rosiger Fuß, Pulsqualität erhalten, Druckstellen an typischen Lokalisationen (Metatarsalköpfe, Ferse), schmerzlos (Sensibilitätsverlust)
   - Ischämischer Fuß (pAVK): Kühler, blasser/livider Fuß, fehlende Fußpulse, akrale Nekrosen, schmerzhaft
   - Neuroischämisch: Mischform (~1/3 der Fälle)

   Wagner-Klassifikation (Tiefe):
   Grad 0: Risikofuß, keine offene Läsion, evtl. Fußdeformität/Hyperkeratose
   Grad 1: Oberflächliche Ulzeration (Dermis)
   Grad 2: Tiefes Ulkus bis Sehne, Kapsel oder Knochen
   Grad 3: Tiefes Ulkus mit Abszess, Osteomyelitis, Gelenkinfektion
   Grad 4: Begrenzte Nekrose/Gangrän (Vorfuß, Ferse)
   Grad 5: Nekrose/Gangrän des gesamten Fußes

   Armstrong-Modifikation (Komplikationen):
   A: Ohne Infektion, ohne Ischämie
   B: Mit Infektion
   C: Mit Ischämie
   D: Mit Infektion UND Ischämie

5. WUNDUMGEBUNG — Beurteilung:
   - Intakt: Gesunde Umgebungshaut ohne Veränderungen
   - Mazeriert: Aufgeweichte, weißliche Haut durch Feuchtigkeit (→ Exsudatmanagement!)
   - Gerötet (Erythem): Entzündungszeichen, DD Kontaktdermatitis
   - Livide: Bläulich-livide Verfärbung → venöse Insuffizienz, Durchblutungsstörung
   - Ekzematös: Trockene, schuppige Haut → Stauungsdermatitis
   - Unterminiert: Wundrand hohl unterspült, Wundtasche → Messung dokumentieren!
   - Hyperkeratose: Verdickte Hornhaut → typisch bei DFS-Ulzera

6. OÖG-VERBANDSTOFFEMPFEHLUNGEN (nach Indikation):
   - Stark exsudierend: Nu-Derm Alginate (Tamponade), Respo Sorb Super (Superabsorber), Mepilex Border
   - Mäßig exsudierend: Aquacel Extra/Ag+ (Hydrofaser), Mepilex Transfer
   - Gering exsudierend: Varihesive (Hydrokolloid), Mepilex Lite
   - Infiziert/infektionsgefährdet: Aquacel Ag+ (antimikrobiell), Vliwaktiv Ag (Aktivkohle + Silber)
   - Wundbettkonditionierung: Octenilin Wundgel, Actimaris Wundgel
   - Nekrose/Fibrin: Debridement + Octenilin Wundgel
   - Epithelisierung: Grassolind neutral (Wundgitter)
   - Trockene Abdeckung: Solvaline N
   - Wundspülung: Actimaris sensitiv (Reinigung, Biofilm-Management)
   - Sekundärverband/Folie: Xtrata, Rudafilm (auch Katheter-Fixierung)
   - Geruchsbindung: Vliwaktiv Ag (Aktivkohle)

7. ÜBERWEISUNGSKRITERIEN — Wann Spezialist:in hinzuziehen:
   - Unbekannte Wundätiologie
   - Keine Heilungstendenz nach 14 Tagen trotz adäquater Therapie (14-Tage-Regel)
   - Chronische Wunde (>8 Wochen ohne Heilungstendenz bzw. >6 Wochen ohne Heilungstendenz gemäß AMBOSS-Definition stagnierender Wunden)
   - Verschlechterung: Wunde wird größer, mehr Schmerz, mehr Exsudat, neuer Geruch
   - Verdacht auf Biofilm oder systemische Infektion (STONEES)
   - Freiliegende tiefere Strukturen (Knochen, Sehnen, Faszien)
   - DFS Wagner Grad ≥2
   - Verschlechterung von Begleitparametern (BZ, CRP, vaskulärer Status)

8. WUNDDOKUMENTATIONSSTANDARD — 5-Schritte-Modell (Coloplast WundWegWeiser):
   Schritt 1: Beurteilung (Wundtyp, Ätiologie, L×B×T, Wundbett %, Wundrand, Umgebung, Exsudat, Geruch, Schmerz VAS)
   Schritt 2: Behandlungsplan (Ziel: heilbar vs. nicht heilbar vs. palliativ, Grunderkrankung behandeln)
   Schritt 3: Wundversorgung (Reinigung, Debridement, feuchte Wundbehandlung, Infektionskontrolle)
   Schritt 4: Verbandauswahl (nach Exsudatmenge und Phase, Wölbung zum Wundgrund beachten)
   Schritt 5: Wundfortschritt (Evaluation alle 14 Tage, bei Stagnation → Spezialist)

═══════════════════════════════════════════════════════════════
DEINE AUFGABE
═══════════════════════════════════════════════════════════════

Analysiere das Wundbild und gib AUSSCHLIESSLICH ein valides JSON-Objekt zurück. KEIN einleitender Text, KEINE Erklärungen, KEIN Markdown — NUR das JSON-Objekt.

FALLS du das Bild nicht analysieren kannst oder es keine Wunde zeigt, gib trotzdem das JSON-Format zurück mit entsprechenden Hinweisen im "zusammenfassung"-Feld.

Wende das ABCD-Schema und die oben genannten evidenzbasierten Kriterien konsequent an. Empfehle ausschließlich OÖG-gelistete Verbandmaterialien. Bei Verdacht auf DFS: Wagner-Armstrong-Klassifikation angeben.

Das JSON muss exakt dieses Schema haben:
{
  "wundphase": "Exsudationsphase" | "Granulationsphase" | "Epithelisierungsphase" | "Gemischte Phase",
  "gewebetypen": {
    "granulation": <Zahl 0-100>,
    "epithelgewebe": <Zahl 0-100>,
    "fibrin": <Zahl 0-100>,
    "nekrose": <Zahl 0-100>,
    "sonstiges": <Zahl 0-100>
  },
  "exsudat": {
    "menge": "keine" | "gering" | "mäßig" | "stark",
    "art": "serös" | "sanguinolent" | "purulent" | "serosanguinolent",
    "farbe": "<Beschreibung der Farbe>",
    "geruch": "keiner" | "gering" | "stark" | "fötid"
  },
  "wundrand": {
    "zustand": "intakt" | "mazeriert" | "unterminiert" | "gerötet" | "livide" | "hyperkeratotisch" | "ekzematös",
    "beschreibung": "<Beschreibung>"
  },
  "wundumgebung": {
    "zustand": "intakt" | "gerötet" | "mazeriert" | "ekzematös" | "livide" | "ödematös",
    "beschreibung": "<Beschreibung der Umgebungshaut>"
  },
  "infektionszeichen": {
    "vorhanden": true | false,
    "zeichen": [],
    "schweregrad": "keine" | "lokal_NERDS" | "systemisch_STONEES",
    "biofilm_verdacht": true | false
  },
  "groessenschaetzung": {
    "laenge_cm": <Zahl oder null>,
    "breite_cm": <Zahl oder null>,
    "tiefe_cm": <Zahl oder null>,
    "flaeche_cm2": <Zahl oder null>,
    "referenzobjekt_erkannt": true | false,
    "referenzobjekt": "<String oder null>"
  },
  "dfs_klassifikation": {
    "verdacht_auf_dfs": true | false,
    "wagner_grad": <0-5 oder null>,
    "armstrong_stadium": "A" | "B" | "C" | "D" | null,
    "fusstyp": "neuropathisch" | "ischaemisch" | "neuroischaemisch" | null,
    "hinweise": "<Beschreibung der DFS-relevanten Befunde oder null>"
  },
  "schmerz": {
    "pieks_test_empfehlung": true | false,
    "hinweis": "<Schmerzhinweis basierend auf Wundbild, z.B. 'Schmerzassessment empfohlen (VAS 0-10)'>"
  },
  "verbandempfehlung": {
    "primaerverband": "<OÖG-gelistetes Produkt mit Begründung>",
    "sekundaerverband": "<OÖG-gelistetes Produkt oder null>",
    "wundspuelung": "<OÖG-gelistetes Produkt>",
    "wechselintervall": "<Empfohlenes Intervall>"
  },
  "ueberweisungskriterien": {
    "ueberweisung_empfohlen": true | false,
    "gruende": ["<Grund 1>", "<Grund 2>"],
    "dringlichkeit": "keine" | "elektiv" | "zeitnah" | "dringend"
  },
  "empfehlungen": [
    "<Empfehlung 1>",
    "<Empfehlung 2>",
    "<Empfehlung 3>"
  ],
  "naechste_evaluation": "<Empfohlener Zeitpunkt basierend auf 14-Tage-Regel>",
  "zusammenfassung": "<Klinische Zusammenfassung mit Bezug auf ABCD-Schema>"
}

WICHTIG:
- Die Summe der Gewebetypen muss 100 ergeben.
- Empfehle NUR OÖG-gelistete Verbandmaterialien (siehe Liste oben).
- Verwende korrekte klinische Fachterminologie auf Deutsch.
- Beachte die 14-Tage-Regel: Evaluation alle 2 Wochen, bei Stagnation Spezialist:in hinzuziehen.
- Bei DFS-Verdacht: Immer Wagner-Armstrong-Klassifikation angeben.
- Gib NUR das JSON zurück, nichts anderes.`;

// ============================================================================
// API-FUNKTIONEN
// ============================================================================

/** Robustes JSON-Parsing mit 3 Fallback-Stufen */
function parseJsonResponse(text) {
  // Stufe 1: Direktes Parsen
  try {
    return JSON.parse(text);
  } catch (e) { /* weiter */ }

  // Stufe 2: JSON aus Markdown-Codeblock extrahieren
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) { /* weiter */ }
  }

  // Stufe 3: Erstes { bis letztes } extrahieren
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch (e) { /* weiter */ }
  }

  return null;
}

/** Validiere und normalisiere das Assessment-Objekt */
function validateAssessment(data) {
  if (!data || typeof data !== "object") return null;

  const defaults = {
    wundphase: "Gemischte Phase",
    gewebetypen: { granulation: 25, epithelgewebe: 25, fibrin: 25, nekrose: 0, sonstiges: 25 },
    exsudat: { menge: "gering", art: "serös", farbe: "", geruch: "keiner" },
    wundrand: { zustand: "intakt", beschreibung: "Nicht beurteilbar" },
    wundumgebung: { zustand: "intakt", beschreibung: "Nicht beurteilbar" },
    infektionszeichen: { vorhanden: false, zeichen: [], schweregrad: "keine", biofilm_verdacht: false },
    groessenschaetzung: { laenge_cm: null, breite_cm: null, tiefe_cm: null, flaeche_cm2: null, referenzobjekt_erkannt: false, referenzobjekt: null },
    dfs_klassifikation: { verdacht_auf_dfs: false, wagner_grad: null, armstrong_stadium: null, fusstyp: null, hinweise: null },
    schmerz: { pieks_test_empfehlung: false, hinweis: "Schmerzassessment empfohlen (VAS 0-10)" },
    verbandempfehlung: { primaerverband: null, sekundaerverband: null, wundspuelung: "Actimaris sensitiv", wechselintervall: "Alle 2-3 Tage" },
    ueberweisungskriterien: { ueberweisung_empfohlen: false, gruende: [], dringlichkeit: "keine" },
    empfehlungen: ["Regelmäßige Wundbeurteilung gemäß 14-Tage-Regel fortführen"],
    naechste_evaluation: "In 14 Tagen (gemäß 14-Tage-Regel)",
    zusammenfassung: "Assessment durchgeführt"
  };

  // Deep-merge: ensure nested objects get defaults for missing keys
  const result = {};
  for (const key of Object.keys(defaults)) {
    if (data[key] !== undefined && data[key] !== null) {
      if (typeof defaults[key] === "object" && !Array.isArray(defaults[key]) && typeof data[key] === "object" && !Array.isArray(data[key])) {
        result[key] = { ...defaults[key], ...data[key] };
      } else {
        result[key] = data[key];
      }
    } else {
      result[key] = defaults[key];
    }
  }
  // Preserve any extra keys from data
  for (const key of Object.keys(data)) {
    if (!(key in result)) result[key] = data[key];
  }

  // Gewebetypen normalisieren
  if (result.gewebetypen) {
    const sum = Object.values(result.gewebetypen).reduce((a, b) => a + (Number(b) || 0), 0);
    if (sum > 0 && sum !== 100) {
      Object.keys(result.gewebetypen).forEach(k => {
        result.gewebetypen[k] = Math.round((Number(result.gewebetypen[k]) || 0) / sum * 100);
      });
    }
  }

  // Rückwärtskompatibilität: "lokal" → "lokal_NERDS", "systemisch" → "systemisch_STONEES"
  if (result.infektionszeichen?.schweregrad === "lokal") result.infektionszeichen.schweregrad = "lokal_NERDS";
  if (result.infektionszeichen?.schweregrad === "systemisch") result.infektionszeichen.schweregrad = "systemisch_STONEES";

  return result;
}

/** Anthropic API-Aufruf */
async function callAnthropicApi(imageBase64, apiKey, mediaType, referenceHint) {
  const userMsg = referenceHint
    ? `Analysiere dieses Wundbild. ${referenceHint} Gib NUR das JSON zurück.`
    : "Analysiere dieses Wundbild. Gib NUR das JSON zurück.";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 }
          },
          { type: "text", text: userMsg }
        ]
      }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API-Fehler ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  return text;
}

/** Ollama API-Aufruf (Chat-Format mit Vision-Unterstützung) */
async function callOllamaApi(imageBase64, ollamaUrl, ollamaModel, referenceHint) {
  const userMsg = referenceHint
    ? `Analysiere dieses Wundbild. ${referenceHint} Gib NUR das JSON zurück.`
    : "Analysiere dieses Wundbild. Gib NUR das JSON zurück.";

  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel || "llava",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: userMsg,
          images: [imageBase64]
        }
      ],
      stream: false,
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Ollama-Fehler ${response.status}: ${errText || "Verbindung fehlgeschlagen"}`);
  }
  const data = await response.json();
  return data.message?.content || data.response || "";
}

/** Ollama-Verbindungstest: Server erreichbar & Modell verfügbar? */
async function testOllamaConnection(ollamaUrl, ollamaModel) {
  try {
    // 1. Prüfe ob der Server läuft
    const pingRes = await fetch(`${ollamaUrl}/api/tags`, { method: "GET" });
    if (!pingRes.ok) return { ok: false, error: `Server antwortet mit Status ${pingRes.status}` };
    const tagsData = await pingRes.json();
    const models = (tagsData.models || []).map(m => m.name || m.model || "");

    // 2. Prüfe ob das gewünschte Modell verfügbar ist
    const modelName = ollamaModel || "llava";
    const modelFound = models.some(m => m === modelName || m.startsWith(modelName + ":"));

    if (!modelFound) {
      return {
        ok: false,
        error: `Modell "${modelName}" nicht gefunden. Verfügbare Modelle: ${models.length > 0 ? models.join(", ") : "keine"}. Bitte mit "ollama pull ${modelName}" herunterladen.`,
        models
      };
    }

    return { ok: true, models, message: `Verbunden! Modell "${modelName}" ist verfügbar.` };
  } catch (err) {
    return { ok: false, error: `Keine Verbindung zu ${ollamaUrl} — ist Ollama gestartet? (${err.message})` };
  }
}

/** Demo-Daten für Tests ohne API */
function getDemoAssessment() {
  return {
    wundphase: "Granulationsphase",
    gewebetypen: { granulation: 55, epithelgewebe: 15, fibrin: 20, nekrose: 5, sonstiges: 5 },
    exsudat: { menge: "mäßig", art: "serös", farbe: "Klar-gelblich", geruch: "keiner" },
    wundrand: { zustand: "gerötet", beschreibung: "Leicht geröteter Wundrand, keine Mazeration erkennbar. Keine Unterminierung tastbar." },
    wundumgebung: { zustand: "intakt", beschreibung: "Umgebungshaut intakt, keine Ekzem- oder Mazerationszeichen. Gute kapilläre Reperfusion." },
    infektionszeichen: { vorhanden: false, zeichen: [], schweregrad: "keine", biofilm_verdacht: false },
    groessenschaetzung: { laenge_cm: 4.2, breite_cm: 2.8, tiefe_cm: 0.3, flaeche_cm2: 11.8, referenzobjekt_erkannt: true, referenzobjekt: "1-Euro-Münze" },
    dfs_klassifikation: { verdacht_auf_dfs: false, wagner_grad: null, armstrong_stadium: null, fusstyp: null, hinweise: null },
    schmerz: { pieks_test_empfehlung: false, hinweis: "Schmerzassessment bei Verbandwechsel empfohlen (VAS 0-10)" },
    verbandempfehlung: {
      primaerverband: "Mepilex Transfer (mäßiges Exsudat, Granulationsphase — atraumatischer Verbandwechsel)",
      sekundaerverband: "Xtrata Fixierfolie",
      wundspuelung: "Actimaris sensitiv (Reinigung, Biofilm-Prävention)",
      wechselintervall: "Alle 2-3 Tage, bei Durchnässung früher"
    },
    ueberweisungskriterien: { ueberweisung_empfohlen: false, gruende: [], dringlichkeit: "keine" },
    empfehlungen: [
      "Wundspülung mit Actimaris sensitiv bei jedem Verbandwechsel (OÖG-Standard)",
      "Feuchte Wundbehandlung: Mepilex Transfer als Primärverband (OÖG Verbandstoffliste)",
      "Evaluation gemäß 14-Tage-Regel — nächste Beurteilung in 14 Tagen",
      "Fotodokumentation bei jedem Verbandwechsel fortführen (Größe L×B×T)",
      "Bei Stagnation der Heilung: Überweisung an Wundmanagement-Spezialist:in erwägen"
    ],
    naechste_evaluation: "In 14 Tagen (gemäß 14-Tage-Regel — Coloplast WundWegWeiser Schritt 5)",
    zusammenfassung: "ABCD-Beurteilung: Granulationswunde am Unterschenkel ohne Infektionszeichen (NERDS negativ). Gute Heilungstendenz mit überwiegend Granulationsgewebe (55%), mäßiges seröses Exsudat ohne Geruch. Wundrand leicht gerötet, Umgebungshaut intakt. Keine DFS-Hinweise. Empfehlung: Fortführung der feuchten Wundbehandlung mit OÖG-gelisteten Materialien. Nächste Evaluation in 14 Tagen."
  };
}

/** Hauptfunktion: Wundanalyse durchführen */
async function analyzeWound(imageBase64, mediaType, apiKey, apiMode, ollamaUrl, ollamaModel, referenceObject) {
  let referenceHint = "";
  if (referenceObject && referenceObject !== "kein") {
    const ref = REFERENCE_OBJECTS[referenceObject];
    if (ref) {
      referenceHint = `Neben der Wunde befindet sich als Referenzobjekt: ${ref.label}${ref.diameter_mm ? ` (Durchmesser: ${ref.diameter_mm}mm)` : ""}. Nutze dieses Objekt zur Größenschätzung der Wunde.`;
    }
  }

  if (apiMode === "demo") {
    await new Promise(r => setTimeout(r, 1500)); // Simulierte Wartezeit
    return { success: true, data: getDemoAssessment(), raw: JSON.stringify(getDemoAssessment(), null, 2) };
  }

  let rawText = "";
  try {
    if (apiMode === "anthropic") {
      rawText = await callAnthropicApi(imageBase64, apiKey, mediaType, referenceHint);
    } else {
      rawText = await callOllamaApi(imageBase64, ollamaUrl, ollamaModel, referenceHint);
    }

    const parsed = parseJsonResponse(rawText);
    if (!parsed) {
      return { success: false, error: "Ungültiges Antwortformat — die KI hat kein gültiges JSON zurückgegeben.", raw: rawText };
    }

    const validated = validateAssessment(parsed);
    return { success: true, data: validated, raw: rawText };
  } catch (err) {
    return { success: false, error: err.message, raw: rawText || err.toString() };
  }
}

// ============================================================================
// PDF-EXPORT (Druckbares Fenster)
// ============================================================================
function generatePrintReport(patient, assessments) {
  const latest = assessments[assessments.length - 1];
  const d = latest?.ergebnis;
  if (!d) return;

  const tissueRows = Object.entries(d.gewebetypen || {})
    .map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd">${TISSUE_COLORS[k]?.label || k}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${v}%</td></tr>`)
    .join("");

  const empfRows = (d.empfehlungen || []).map(e => `<li style="margin-bottom:4px">${e}</li>`).join("");

  const historyRows = assessments.map((a, i) => `
    <tr>
      <td style="padding:6px 12px;border:1px solid #ddd">${a.datum}</td>
      <td style="padding:6px 12px;border:1px solid #ddd">${a.ergebnis?.wundphase || "—"}</td>
      <td style="padding:6px 12px;border:1px solid #ddd">${a.ergebnis?.exsudat?.menge || "—"}</td>
      <td style="padding:6px 12px;border:1px solid #ddd">${a.ergebnis?.infektionszeichen?.vorhanden ? "Ja" : "Nein"}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>Wunddokumentation — ${patient.name}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.5; max-width: 210mm; margin: 0 auto; padding: 20px; }
  .header { border-bottom: 3px solid #1e6bb8; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { color: #1e6bb8; margin: 0 0 4px 0; font-size: 22px; }
  .header p { margin: 2px 0; color: #64748b; font-size: 13px; }
  .section { margin-bottom: 20px; }
  .section h2 { color: #1e6bb8; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #ddd; text-align: left; font-size: 13px; }
  .patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .patient-info div { font-size: 14px; }
  .patient-info span { color: #64748b; }
  .phase-badge { display: inline-block; padding: 4px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
  .img-container { text-align: center; margin: 12px 0; }
  .img-container img { max-width: 300px; max-height: 250px; border: 1px solid #ddd; border-radius: 8px; }
  .signature { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .signature div { border-top: 1px solid #333; padding-top: 8px; font-size: 13px; color: #64748b; }
  .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style></head><body>

<div class="header">
  <h1>🩺 WundScan AI — Wunddokumentationsbericht</h1>
  <p>Generiert am: ${new Date().toLocaleDateString("de-AT")} um ${new Date().toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr</p>
  <p>Salzkammergut Klinikum Gmunden</p>
</div>

<div class="section">
  <h2>Patientendaten</h2>
  <div class="patient-info">
    <div><span>Name:</span> <strong>${patient.name || "—"}</strong></div>
    <div><span>Geburtsdatum:</span> ${patient.geburtsdatum || "—"}</div>
    <div><span>Station:</span> ${patient.station || "—"}</div>
    <div><span>Wundlokalisation:</span> ${patient.wundlokalisation || "—"}</div>
  </div>
</div>

${latest.bild ? `<div class="section"><h2>Wundbild</h2><div class="img-container"><img src="${latest.bild}" alt="Wundbild"></div><p style="text-align:center;color:#64748b;font-size:12px">Aufnahme vom ${latest.datum}</p></div>` : ""}

<div class="section">
  <h2>Aktuelles Assessment (${latest.datum})</h2>
  <p><strong>Wundphase:</strong> <span class="phase-badge" style="background:${WOUND_PHASES[d.wundphase]?.bg || "#f1f5f9"};color:${WOUND_PHASES[d.wundphase]?.color || "#333"}">${d.wundphase}</span></p>
  <p><strong>Zusammenfassung:</strong> ${d.zusammenfassung}</p>
</div>

<div class="section">
  <h2>Gewebeverteilung</h2>
  <table><thead><tr><th>Gewebetyp</th><th style="text-align:right">Anteil</th></tr></thead><tbody>${tissueRows}</tbody></table>
</div>

<div class="section">
  <h2>Exsudat & Wundrand</h2>
  <p><strong>Exsudat:</strong> Menge: ${d.exsudat?.menge || "—"}, Art: ${d.exsudat?.art || "—"}${d.exsudat?.geruch && d.exsudat.geruch !== "keiner" ? `, Geruch: ${d.exsudat.geruch}` : ""}</p>
  <p><strong>Wundrand:</strong> ${d.wundrand?.zustand || "—"} — ${d.wundrand?.beschreibung || ""}</p>
  <p><strong>Wundumgebung:</strong> ${d.wundumgebung?.zustand || "—"} — ${d.wundumgebung?.beschreibung || ""}</p>
  <p><strong>Infektionszeichen (NERDS/STONEES):</strong> ${d.infektionszeichen?.vorhanden ? `Ja (${d.infektionszeichen.schweregrad}) — ${d.infektionszeichen.zeichen?.join(", ") || ""}` : "Keine"}${d.infektionszeichen?.biofilm_verdacht ? " | Biofilm-Verdacht" : ""}</p>
</div>

${d.dfs_klassifikation?.verdacht_auf_dfs ? `<div class="section"><h2>DFS-Klassifikation (Wagner-Armstrong)</h2><p><strong>Wagner-Grad:</strong> ${d.dfs_klassifikation.wagner_grad ?? "—"} | <strong>Armstrong-Stadium:</strong> ${d.dfs_klassifikation.armstrong_stadium || "—"} | <strong>Fußtyp:</strong> ${d.dfs_klassifikation.fusstyp || "—"}</p>${d.dfs_klassifikation.hinweise ? `<p>${d.dfs_klassifikation.hinweise}</p>` : ""}</div>` : ""}

${d.verbandempfehlung?.primaerverband ? `<div class="section"><h2>Verbandempfehlung (OÖG Verbandstoffliste)</h2><p><strong>Wundspülung:</strong> ${d.verbandempfehlung.wundspuelung || "—"}</p><p><strong>Primärverband:</strong> ${d.verbandempfehlung.primaerverband}</p>${d.verbandempfehlung.sekundaerverband ? `<p><strong>Sekundärverband:</strong> ${d.verbandempfehlung.sekundaerverband}</p>` : ""}<p><strong>Wechselintervall:</strong> ${d.verbandempfehlung.wechselintervall || "—"}</p></div>` : ""}

${d.ueberweisungskriterien?.ueberweisung_empfohlen ? `<div class="section" style="background:#fef2f2;padding:12px;border-radius:8px;border:1px solid #fca5a5"><h2 style="color:#dc2626">⚠ Überweisung empfohlen (${d.ueberweisungskriterien.dringlichkeit})</h2><ul>${(d.ueberweisungskriterien.gruende || []).map(g => `<li>${g}</li>`).join("")}</ul></div>` : ""}

${d.groessenschaetzung?.flaeche_cm2 ? `<div class="section"><h2>Größenschätzung</h2><p>Länge: ${d.groessenschaetzung.laenge_cm} cm × Breite: ${d.groessenschaetzung.breite_cm} cm</p><p>Geschätzte Fläche: <strong>${d.groessenschaetzung.flaeche_cm2} cm²</strong></p>${d.groessenschaetzung.referenzobjekt ? `<p>Referenzobjekt: ${d.groessenschaetzung.referenzobjekt}</p>` : ""}</div>` : ""}

<div class="section">
  <h2>Empfehlungen</h2>
  <ul>${empfRows}</ul>
</div>

${assessments.length > 1 ? `<div class="section"><h2>Verlauf (${assessments.length} Assessments)</h2><table><thead><tr><th>Datum</th><th>Phase</th><th>Exsudat</th><th>Infektion</th></tr></thead><tbody>${historyRows}</tbody></table></div>` : ""}

<div class="signature">
  <div>Datum, Unterschrift (Pflegekraft)</div>
  <div>Datum, Unterschrift (Arzt/Ärztin)</div>
</div>

<div class="footer">
  <p>Erstellt mit WundScan AI v${APP_VERSION} — Evidenzbasiertes Wunddokumentationssystem</p>
  <p>Quellenangaben: AMBOSS (Wundbeurteilung, ABCD-Schema, NERDS/STONEES), Coloplast WundWegWeiser (5-Schritte-Modell, 14-Tage-Regel), OÖG Verbandstoffliste 2023, DFS-Vortrag DGKP K. Pointner (OÖG)</p>
  <p>Dieses Dokument dient der klinischen Dokumentation und ersetzt nicht die ärztliche Beurteilung.</p>
</div>

</body></html>`;

  const w = window.open("", "_blank", "width=800,height=1000");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(d) {
  return new Date(d).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ============================================================================
// UI-KOMPONENTEN
// ============================================================================

/** Gemeinsamer Button */
function Btn({ children, onClick, variant = "primary", size = "md", disabled, icon: Icon, className = "" }) {
  const base = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-7 py-3.5 text-base gap-2.5",
  };
  const variants = {
    primary: `bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm`,
    secondary: `bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-300`,
    success: `bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm`,
    danger: `bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`,
    ghost: `text-gray-600 hover:bg-gray-100 focus:ring-gray-300`,
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />}
      {children}
    </button>
  );
}

/** Karte */
function Card({ children, className = "", onClick, hover }) {
  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${hover ? "hover:shadow-md hover:border-blue-200 cursor-pointer transition-all" : ""} ${className}`}>
      {children}
    </div>
  );
}

/** Phasen-Banner */
function PhaseBanner({ phase }) {
  const p = WOUND_PHASES[phase] || WOUND_PHASES["Gemischte Phase"];
  return (
    <div className="rounded-xl px-5 py-4 flex items-center gap-3" style={{ background: p.bg, border: `1px solid ${p.color}22` }}>
      <span className="text-2xl">{p.icon}</span>
      <div>
        <div className="font-bold text-base" style={{ color: p.color }}>{phase}</div>
        <div className="text-xs" style={{ color: p.color + "bb" }}>{p.desc}</div>
      </div>
    </div>
  );
}

/** Gewebe-Balken (horizontal gestapelt) */
function TissueBar({ tissues }) {
  if (!tissues) return null;
  const entries = Object.entries(tissues).filter(([, v]) => v > 0);
  return (
    <div>
      <div className="flex rounded-xl overflow-hidden h-8 mb-3 shadow-inner bg-gray-100">
        {entries.map(([key, val]) => (
          <div key={key} style={{ width: `${val}%`, background: TISSUE_COLORS[key]?.color || "#ccc" }}
            className="flex items-center justify-center text-white text-xs font-bold transition-all duration-500"
            title={`${TISSUE_COLORS[key]?.label}: ${val}%`}>
            {val >= 8 ? `${val}%` : ""}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: TISSUE_COLORS[key]?.color }} />
            <span>{TISSUE_COLORS[key]?.label}: {val}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Infektions-Warnung mit NERDS/STONEES */
function InfectionAlert({ infection }) {
  if (!infection) return null;
  const hasInfection = infection.vorhanden;
  const schwereLabel = {
    "keine": "Keine",
    "lokal_NERDS": "Lokale Infektion (NERDS-Kriterien)",
    "systemisch_STONEES": "Systemische Ausbreitung (STONEES-Kriterien)",
    "lokal": "Lokale Infektion",
    "systemisch": "Systemische Infektion"
  };
  return (
    <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${hasInfection ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
      {hasInfection
        ? <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
        : <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />}
      <div>
        <div className={`font-semibold text-sm ${hasInfection ? "text-red-700" : "text-green-700"}`}>
          {hasInfection ? (schwereLabel[infection.schweregrad] || `Infektionszeichen (${infection.schweregrad})`) : "Keine Infektionszeichen (NERDS negativ)"}
        </div>
        {hasInfection && infection.zeichen?.length > 0 && (
          <div className="text-xs text-red-600 mt-1">{infection.zeichen.join(", ")}</div>
        )}
        {infection.biofilm_verdacht && (
          <div className="text-xs text-orange-600 mt-1 font-medium">⚠ Biofilm-Verdacht — therapieresistente Wunde, Actimaris sensitiv-Spülung empfohlen</div>
        )}
      </div>
    </div>
  );
}

/** Exsudat-Anzeige */
function ExsudatBadge({ exsudat }) {
  if (!exsudat) return null;
  const level = EXSUDAT_LEVELS[exsudat.menge] || EXSUDAT_LEVELS.gering;
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
      <div>
        <div className="text-xs text-gray-500 mb-1">Menge</div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: level.color }}>
          {exsudat.menge}
        </span>
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-1">Art</div>
        <span className="text-sm font-medium text-gray-700">{exsudat.art}</span>
      </div>
    </div>
  );
}

/** Größenanzeige */
function SizeDisplay({ size }) {
  if (!size || (!size.laenge_cm && !size.flaeche_cm2)) return null;
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Ruler size={16} className="text-blue-600" />
        <span className="font-semibold text-sm text-blue-700">Größenschätzung (L × B × T)</span>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        {size.laenge_cm && (
          <div>
            <div className="text-lg font-bold text-blue-700">{size.laenge_cm}</div>
            <div className="text-xs text-blue-500">Länge (cm)</div>
          </div>
        )}
        {size.breite_cm && (
          <div>
            <div className="text-lg font-bold text-blue-700">{size.breite_cm}</div>
            <div className="text-xs text-blue-500">Breite (cm)</div>
          </div>
        )}
        {size.tiefe_cm && (
          <div>
            <div className="text-lg font-bold text-blue-700">{size.tiefe_cm}</div>
            <div className="text-xs text-blue-500">Tiefe (cm)</div>
          </div>
        )}
        {size.flaeche_cm2 && (
          <div>
            <div className="text-lg font-bold text-blue-700">{size.flaeche_cm2}</div>
            <div className="text-xs text-blue-500">Fläche (cm²)</div>
          </div>
        )}
      </div>
      {size.referenzobjekt && (
        <div className="text-xs text-blue-500 mt-2 text-center">Ref: {size.referenzobjekt}</div>
      )}
    </div>
  );
}

/** DFS-Klassifikation (Wagner-Armstrong) */
function DfsDisplay({ dfs }) {
  if (!dfs || !dfs.verdacht_auf_dfs) return null;
  const fusstypLabel = { neuropathisch: "Neuropathischer Fuß", ischaemisch: "Ischämischer Fuß (pAVK)", neuroischaemisch: "Neuroischämischer Fuß" };
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} className="text-orange-600" />
        <span className="font-semibold text-sm text-orange-700">Diabetisches Fußsyndrom (DFS)</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
        {dfs.wagner_grad !== null && dfs.wagner_grad !== undefined && (
          <div>
            <div className="text-lg font-bold text-orange-700">Grad {dfs.wagner_grad}</div>
            <div className="text-xs text-orange-500">Wagner-Klassifikation</div>
          </div>
        )}
        {dfs.armstrong_stadium && (
          <div>
            <div className="text-lg font-bold text-orange-700">Stadium {dfs.armstrong_stadium}</div>
            <div className="text-xs text-orange-500">Armstrong</div>
          </div>
        )}
        {dfs.fusstyp && (
          <div>
            <div className="text-sm font-bold text-orange-700">{fusstypLabel[dfs.fusstyp] || dfs.fusstyp}</div>
            <div className="text-xs text-orange-500">Fußtyp</div>
          </div>
        )}
      </div>
      {dfs.hinweise && (
        <p className="text-xs text-orange-600 mt-2">{dfs.hinweise}</p>
      )}
    </div>
  );
}

/** Verbandempfehlung (OÖG-gelistet) */
function VerbandDisplay({ verband }) {
  if (!verband || (!verband.primaerverband && !verband.wundspuelung)) return null;
  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers size={16} className="text-teal-600" />
        <span className="font-semibold text-sm text-teal-700">Verbandempfehlung (OÖG Verbandstoffliste)</span>
      </div>
      <div className="space-y-2 text-sm">
        {verband.wundspuelung && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-teal-600 w-28 flex-shrink-0">Wundspülung:</span>
            <span className="text-gray-700">{verband.wundspuelung}</span>
          </div>
        )}
        {verband.primaerverband && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-teal-600 w-28 flex-shrink-0">Primärverband:</span>
            <span className="text-gray-700">{verband.primaerverband}</span>
          </div>
        )}
        {verband.sekundaerverband && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-teal-600 w-28 flex-shrink-0">Sekundärverband:</span>
            <span className="text-gray-700">{verband.sekundaerverband}</span>
          </div>
        )}
        {verband.wechselintervall && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-teal-600 w-28 flex-shrink-0">Wechselintervall:</span>
            <span className="text-gray-700">{verband.wechselintervall}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Überweisungskriterien */
function UeberweisungDisplay({ ueberweisung }) {
  if (!ueberweisung || !ueberweisung.ueberweisung_empfohlen) return null;
  const dringlichkeitColors = {
    elektiv: "bg-yellow-100 text-yellow-800",
    zeitnah: "bg-orange-100 text-orange-800",
    dringend: "bg-red-100 text-red-800"
  };
  return (
    <div className="bg-red-50 border border-red-300 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} className="text-red-600" />
        <span className="font-semibold text-sm text-red-700">Überweisung an Spezialist:in empfohlen</span>
        {ueberweisung.dringlichkeit && ueberweisung.dringlichkeit !== "keine" && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dringlichkeitColors[ueberweisung.dringlichkeit] || ""}`}>
            {ueberweisung.dringlichkeit}
          </span>
        )}
      </div>
      {ueberweisung.gruende?.length > 0 && (
        <ul className="text-xs text-red-600 space-y-1 ml-1">
          {ueberweisung.gruende.map((g, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-0.5">•</span>
              <span>{g}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Wundumgebung-Anzeige */
function WundumgebungBadge({ wundumgebung }) {
  if (!wundumgebung) return null;
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mb-2">
        {wundumgebung.zustand}
      </span>
      <p className="text-xs text-gray-600">{wundumgebung.beschreibung}</p>
    </div>
  );
}

/** Lade-Animation */
function LoadingSpinner({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin" style={{ borderTopColor: COLORS.primary }} />
        <Activity size={24} className="text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="text-sm text-gray-500 font-medium animate-pulse">{text || "Analyse läuft..."}</div>
    </div>
  );
}

// ============================================================================
// VERLAUFS-CHARTS
// ============================================================================
function WoundTimelineChart({ assessments }) {
  if (!assessments || assessments.length < 2) return null;

  const data = assessments.map((a, i) => ({
    datum: a.datum,
    flaeche: a.ergebnis?.groessenschaetzung?.flaeche_cm2 || 0,
    granulation: a.ergebnis?.gewebetypen?.granulation || 0,
    fibrin: a.ergebnis?.gewebetypen?.fibrin || 0,
    nekrose: a.ergebnis?.gewebetypen?.nekrose || 0,
    epithelgewebe: a.ergebnis?.gewebetypen?.epithelgewebe || 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Wundfläche über Zeit</h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="datum" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit=" cm²" />
            <Tooltip />
            <Area type="monotone" dataKey="flaeche" stroke={COLORS.primary} fill={COLORS.primaryLight} strokeWidth={2} name="Fläche (cm²)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Gewebeverteilung über Zeit</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="datum" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="granulation" stackId="a" fill={TISSUE_COLORS.granulation.color} name="Granulation" />
            <Bar dataKey="epithelgewebe" stackId="a" fill={TISSUE_COLORS.epithelgewebe.color} name="Epithel" />
            <Bar dataKey="fibrin" stackId="a" fill={TISSUE_COLORS.fibrin.color} name="Fibrin" />
            <Bar dataKey="nekrose" stackId="a" fill={TISSUE_COLORS.nekrose.color} name="Nekrose" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Gewebe-Kreisdiagramm */
function TissuePieChart({ tissues }) {
  if (!tissues) return null;
  const data = Object.entries(tissues)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: TISSUE_COLORS[k]?.label || k, value: v, color: TISSUE_COLORS[k]?.color || "#ccc" }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip formatter={(val) => `${val}%`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// ANSICHT: STARTSEITE
// ============================================================================
function HomeView({ patients, onNewPatient, onSelectPatient, onGoSettings }) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={28} />
          <h1 className="text-xl font-bold">WundScan AI</h1>
        </div>
        <p className="text-blue-100 text-sm mb-4">Evidenzbasiertes Wunddokumentationssystem mit KI-gestützter Analyse (AMBOSS, OÖG-Leitlinien)</p>
        <div className="flex gap-3">
          <Btn onClick={onNewPatient} variant="secondary" icon={Plus}>Neues Assessment</Btn>
          <Btn onClick={onGoSettings} variant="ghost" className="!text-white hover:!bg-blue-700" icon={Settings}>Einstellungen</Btn>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{patients.length}</div>
          <div className="text-xs text-gray-500">Patienten</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {patients.reduce((sum, p) => sum + (p.assessments?.length || 0), 0)}
          </div>
          <div className="text-xs text-gray-500">Assessments</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {patients.filter(p => p.assessments?.some(a => a.ergebnis?.infektionszeichen?.vorhanden)).length}
          </div>
          <div className="text-xs text-gray-500">Mit Infektionsz.</div>
        </Card>
      </div>

      {/* Patientenliste */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Patienten & Wundverläufe</h2>
        {patients.length === 0 ? (
          <Card className="p-8 text-center">
            <Image size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Noch keine Assessments vorhanden.</p>
            <p className="text-xs text-gray-400 mt-1">Starten Sie mit „Neues Assessment"</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {patients.map(p => {
              const lastA = p.assessments?.[p.assessments.length - 1];
              const phase = lastA?.ergebnis?.wundphase;
              const phaseInfo = WOUND_PHASES[phase];
              return (
                <Card key={p.id} hover onClick={() => onSelectPatient(p)} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-800">{p.name || "Unbenannt"}</div>
                        <div className="text-xs text-gray-500">
                          {p.wundlokalisation || "—"} · {p.assessments?.length || 0} Assessment(s)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {phaseInfo && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ background: phaseInfo.bg, color: phaseInfo.color }}>
                          {phaseInfo.icon} {phase?.split("phase")[0]}
                        </span>
                      )}
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ANSICHT: EINSTELLUNGEN
// ============================================================================
function SettingsView({ apiKey, setApiKey, apiMode, setApiMode, ollamaUrl, setOllamaUrl, ollamaModel, setOllamaModel, onBack }) {
  const [ollamaTestResult, setOllamaTestResult] = useState(null);
  const [ollamaTestLoading, setOllamaTestLoading] = useState(false);

  const handleTestOllama = async () => {
    setOllamaTestLoading(true);
    setOllamaTestResult(null);
    const result = await testOllamaConnection(ollamaUrl, ollamaModel);
    setOllamaTestResult(result);
    setOllamaTestLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <Btn onClick={onBack} variant="ghost" size="sm" icon={ArrowLeft} />
        <h2 className="text-lg font-bold text-gray-800">Einstellungen</h2>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-sm text-gray-700">KI-Backend</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "anthropic", label: "Claude API", desc: "Anthropic", icon: "🤖" },
            { key: "ollama", label: "Ollama", desc: "Lokal", icon: "🏠" },
            { key: "demo", label: "Demo-Modus", desc: "Test", icon: "🧪" },
          ].map(m => (
            <button key={m.key} onClick={() => setApiMode(m.key)}
              className={`p-3 rounded-xl border text-center transition-all text-sm ${apiMode === m.key
                ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
              <div className="text-lg mb-1">{m.icon}</div>
              <div>{m.label}</div>
              <div className="text-xs opacity-60 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Datenschutz-Badge je nach Modus */}
        {apiMode === "anthropic" && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
            <span className="text-xs text-amber-700 font-medium">Daten werden über das Internet gesendet (Anthropic API)</span>
          </div>
        )}
        {apiMode === "ollama" && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <Shield size={14} className="text-green-600 flex-shrink-0" />
            <span className="text-xs text-green-700 font-medium">DSGVO-konform — Daten bleiben lokal</span>
          </div>
        )}
      </Card>

      {apiMode === "anthropic" && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-sm text-gray-700">Anthropic API-Key</h3>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          <p className="text-xs text-gray-400">Modell: claude-sonnet-4-6 (optimiert für Bildanalyse)</p>
          <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <strong>Hinweis:</strong> Der API-Aufruf erfolgt direkt vom Browser. Falls CORS-Probleme auftreten, nutzen Sie den Demo-Modus oder Ollama.
            Der Header <code>anthropic-dangerous-direct-browser-access</code> wird automatisch gesetzt.
          </div>
        </Card>
      )}

      {apiMode === "ollama" && (
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-sm text-gray-700">Ollama-Konfiguration</h3>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Server-URL</label>
            <input type="text" value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vision-Modell</label>
            <div className="flex gap-2">
              <input type="text" value={ollamaModel} onChange={e => setOllamaModel(e.target.value)}
                placeholder="llava"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={ollamaModel} onChange={e => setOllamaModel(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="llava">llava</option>
                <option value="llava:13b">llava:13b</option>
                <option value="llava:34b">llava:34b</option>
                <option value="bakllava">bakllava</option>
                <option value="llava-llama3">llava-llama3</option>
                <option value="moondream">moondream</option>
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">Nur Vision-fähige Modelle (llava, bakllava, moondream, etc.) können Bilder analysieren.</p>
          </div>

          {/* Verbindungstest */}
          <div>
            <Btn onClick={handleTestOllama} variant="secondary" size="sm" icon={RefreshCw}
              disabled={ollamaTestLoading}>
              {ollamaTestLoading ? "Teste Verbindung..." : "Verbindung testen"}
            </Btn>
            {ollamaTestResult && (
              <div className={`mt-2 text-xs rounded-lg p-3 ${ollamaTestResult.ok
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"}`}>
                <div className="flex items-start gap-2">
                  {ollamaTestResult.ok
                    ? <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    : <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />}
                  <div>
                    <div className="font-medium">{ollamaTestResult.ok ? ollamaTestResult.message : "Verbindung fehlgeschlagen"}</div>
                    {!ollamaTestResult.ok && <div className="mt-1">{ollamaTestResult.error}</div>}
                    {ollamaTestResult.models && ollamaTestResult.models.length > 0 && (
                      <div className="mt-1 text-gray-500">Verfügbare Modelle: {ollamaTestResult.models.join(", ")}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 bg-green-50 border border-green-200 rounded-lg p-3">
            <strong>Lokal & kostenlos:</strong> Alle Daten bleiben auf Ihrem Rechner. Keine Internetverbindung nötig. Installieren Sie Ollama von <a href="https://ollama.com" target="_blank" rel="noopener" className="text-blue-500 hover:underline">ollama.com</a> und laden Sie ein Vision-Modell mit <code>ollama pull llava</code>.
          </div>
        </Card>
      )}

      {apiMode === "demo" && (
        <Card className="p-5">
          <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <strong>Demo-Modus:</strong> Verwendet simulierte Analyseergebnisse. Ideal zum Testen der Benutzeroberfläche ohne API-Zugang.
          </div>
        </Card>
      )}

      <Card className="p-5 space-y-2">
        <h3 className="font-semibold text-sm text-gray-700">Über WundScan AI</h3>
        <div className="text-xs text-gray-500 space-y-1">
          <p>Version {APP_VERSION} — Evidenzbasiertes klinisches Portfolio-Projekt</p>
          <p>Salzkammergut Klinikum Gmunden · Pflegefachassistenz</p>
          <p>Evidenzbasis: AMBOSS, Coloplast WundWegWeiser, OÖG Verbandstoffliste 2023, DFS-Vortrag DGKP K. Pointner</p>
          <p>Entwickelt zur Unterstützung der standardisierten Wunddokumentation gemäß aktuellen Leitlinien</p>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// ANSICHT: PATIENT / NEUER PATIENT
// ============================================================================
function PatientFormView({ patient, onChange, onSave, onBack, isNew }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <Btn onClick={onBack} variant="ghost" size="sm" icon={ArrowLeft} />
        <h2 className="text-lg font-bold text-gray-800">{isNew ? "Neues Assessment starten" : "Patient bearbeiten"}</h2>
      </div>
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name / Pseudonym *</label>
            <input type="text" value={patient.name} onChange={e => onChange({ ...patient, name: e.target.value })}
              placeholder="z.B. Patient A oder Initialen"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Geburtsdatum</label>
            <input type="date" value={patient.geburtsdatum} onChange={e => onChange({ ...patient, geburtsdatum: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Station</label>
            <input type="text" value={patient.station} onChange={e => onChange({ ...patient, station: e.target.value })}
              placeholder="z.B. Chirurgie 3A"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Wundlokalisation *</label>
            <input type="text" value={patient.wundlokalisation} onChange={e => onChange({ ...patient, wundlokalisation: e.target.value })}
              placeholder="z.B. Unterschenkel rechts lateral"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Wundätiologie</label>
            <select value={patient.aetiologie || ""} onChange={e => onChange({ ...patient, aetiologie: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— Bitte wählen —</option>
              <option value="venoes">Venös (Ulcus cruris venosum)</option>
              <option value="arteriell">Arteriell (pAVK)</option>
              <option value="diabetisch">Diabetisch (DFS)</option>
              <option value="dekubital">Dekubital (Druckgeschwür)</option>
              <option value="traumatisch">Traumatisch</option>
              <option value="postoperativ">Postoperativ</option>
              <option value="gemischt">Gemischt (z.B. venös-arteriell)</option>
              <option value="unbekannt">Unbekannte Ätiologie</option>
              <option value="sonstige">Sonstige</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grunderkrankung</label>
            <input type="text" value={patient.grunderkrankung || ""} onChange={e => onChange({ ...patient, grunderkrankung: e.target.value })}
              placeholder="z.B. Diabetes mellitus Typ 2, CVI, pAVK..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Zusatzinfo / Anamnese (ABCD-Schema: A = Anamnese)</label>
          <textarea value={patient.anamnese || ""} onChange={e => onChange({ ...patient, anamnese: e.target.value })}
            rows={3} placeholder="Relevante Vorerkrankungen, Allergien, bisherige Therapie, Wunddauer, Medikamente (z.B. Antikoagulanzien, Immunsuppressiva)..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <Btn onClick={onSave} icon={ChevronRight}
          disabled={!patient.name || !patient.wundlokalisation}>
          Weiter zum Bild-Upload
        </Btn>
      </Card>
    </div>
  );
}

// ============================================================================
// ANSICHT: BILD-UPLOAD
// ============================================================================
function UploadView({ onAnalyze, onBack, referenceObject, setReferenceObject }) {
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [mediaType, setMediaType] = useState("image/jpeg");
  const [notizen, setNotizen] = useState("");
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const dropRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setMediaType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const full = e.target.result;
      setImage(full);
      const base64 = full.split(",")[1];
      setImageData(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove("border-blue-500", "bg-blue-50");
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    dropRef.current?.classList.add("border-blue-500", "bg-blue-50");
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dropRef.current?.classList.remove("border-blue-500", "bg-blue-50");
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <Btn onClick={onBack} variant="ghost" size="sm" icon={ArrowLeft} />
        <h2 className="text-lg font-bold text-gray-800">Wundbild aufnehmen</h2>
      </div>

      {/* Upload-Bereich */}
      {!image ? (
        <Card className="p-5">
          <div ref={dropRef} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center transition-all">
            <Upload size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-600 font-medium mb-1">Wundbild hier ablegen</p>
            <p className="text-xs text-gray-400 mb-5">oder wählen Sie eine Option:</p>
            <div className="flex justify-center gap-3">
              <Btn onClick={() => fileRef.current?.click()} variant="secondary" icon={Image}>
                Datei wählen
              </Btn>
              <Btn onClick={() => cameraRef.current?.click()} variant="primary" icon={Camera}>
                Kamera
              </Btn>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
        </Card>
      ) : (
        <Card className="p-5">
          <div className="relative">
            <img src={image} alt="Wundbild" className="w-full max-h-64 object-contain rounded-xl border border-gray-200" />
            <button onClick={() => { setImage(null); setImageData(null); }}
              className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-red-50 transition-colors">
              <X size={16} className="text-red-500" />
            </button>
          </div>
        </Card>
      )}

      {/* Referenzobjekt */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Ruler size={16} className="text-blue-600" />
          <h3 className="font-semibold text-sm text-gray-700">Referenzobjekt für Größenschätzung</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(REFERENCE_OBJECTS).map(([key, obj]) => (
            <button key={key} onClick={() => setReferenceObject(key)}
              className={`p-2.5 rounded-xl border text-xs text-center transition-all ${referenceObject === key
                ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              {obj.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Legen Sie das Referenzobjekt neben die Wunde für eine genauere Größenschätzung.</p>
      </Card>

      {/* Notizen */}
      <Card className="p-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">Klinische Notizen (optional)</label>
        <textarea value={notizen} onChange={e => setNotizen(e.target.value)} rows={2}
          placeholder="Z.B. Verbandwechsel durchgeführt, Spülung mit NaCl..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </Card>

      {/* Analyse starten */}
      <Btn onClick={() => onAnalyze(imageData, mediaType, image, notizen)} size="lg"
        className="w-full" disabled={!imageData} icon={Activity}>
        KI-Analyse starten
      </Btn>
    </div>
  );
}

// ============================================================================
// ANSICHT: ERGEBNIS
// ============================================================================
function ResultView({ assessment, patient, onBack, onSaveAndNew, onExportPdf }) {
  const [showDebug, setShowDebug] = useState(false);
  const d = assessment?.ergebnis;

  if (!d) return (
    <div className="text-center py-12">
      <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
      <p className="text-sm text-gray-600">Kein Ergebnis vorhanden</p>
      <Btn onClick={onBack} variant="secondary" className="mt-4" icon={ArrowLeft}>Zurück</Btn>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Btn onClick={onBack} variant="ghost" size="sm" icon={ArrowLeft} />
          <h2 className="text-lg font-bold text-gray-800">Analyseergebnis</h2>
        </div>
        <div className="flex gap-2">
          <Btn onClick={onExportPdf} variant="secondary" size="sm" icon={Printer}>PDF</Btn>
          <Btn onClick={onSaveAndNew} variant="success" size="sm" icon={Plus}>Neues Bild</Btn>
        </div>
      </div>

      {/* Patient-Info */}
      <div className="bg-gray-50 rounded-xl px-4 py-2.5 text-xs text-gray-600 flex items-center gap-4">
        <span><strong>{patient?.name}</strong></span>
        <span>{patient?.wundlokalisation}</span>
        <span>{assessment.datum}</span>
      </div>

      {/* Wundbild */}
      {assessment.bild && (
        <Card className="p-3">
          <img src={assessment.bild} alt="Wundbild" className="w-full max-h-48 object-contain rounded-lg" />
        </Card>
      )}

      {/* Phase */}
      <PhaseBanner phase={d.wundphase} />

      {/* Zusammenfassung */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Zusammenfassung</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{d.zusammenfassung}</p>
      </Card>

      {/* Gewebeverteilung */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Gewebeverteilung</h3>
        <TissueBar tissues={d.gewebetypen} />
        <div className="mt-4">
          <TissuePieChart tissues={d.gewebetypen} />
        </div>
      </Card>

      {/* Exsudat & Wundrand & Wundumgebung */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Exsudat</h3>
          <ExsudatBadge exsudat={d.exsudat} />
          {d.exsudat?.geruch && d.exsudat.geruch !== "keiner" && (
            <div className="mt-2 text-xs text-orange-600 font-medium">Geruch: {d.exsudat.geruch}</div>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Wundrand</h3>
          <div className="bg-gray-50 rounded-xl p-3">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mb-2">
              {d.wundrand?.zustand}
            </span>
            <p className="text-xs text-gray-600">{d.wundrand?.beschreibung}</p>
          </div>
        </Card>
      </div>

      {/* Wundumgebung */}
      {d.wundumgebung && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Wundumgebung</h3>
          <WundumgebungBadge wundumgebung={d.wundumgebung} />
        </Card>
      )}

      {/* Infektionszeichen (NERDS/STONEES) */}
      <InfectionAlert infection={d.infektionszeichen} />

      {/* DFS-Klassifikation (Wagner-Armstrong) */}
      <DfsDisplay dfs={d.dfs_klassifikation} />

      {/* Überweisungskriterien */}
      <UeberweisungDisplay ueberweisung={d.ueberweisungskriterien} />

      {/* Größe */}
      <SizeDisplay size={d.groessenschaetzung} />

      {/* Verbandempfehlung (OÖG) */}
      <VerbandDisplay verband={d.verbandempfehlung} />

      {/* Nächste Evaluation */}
      {d.naechste_evaluation && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Calendar size={16} className="text-blue-600 flex-shrink-0" />
          <div>
            <div className="font-semibold text-sm text-blue-700">Nächste Evaluation</div>
            <div className="text-xs text-blue-600">{d.naechste_evaluation}</div>
          </div>
        </div>
      )}

      {/* Empfehlungen */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Empfehlungen</h3>
        <div className="space-y-2">
          {(d.empfehlungen || []).map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>{e}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Notizen */}
      {assessment.notizen && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Klinische Notizen</h3>
          <p className="text-sm text-gray-600">{assessment.notizen}</p>
        </Card>
      )}

      {/* Debug */}
      <div>
        <button onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <Info size={12} /> {showDebug ? "Debug ausblenden" : "Debug / Rohdaten anzeigen"}
        </button>
        {showDebug && (
          <pre className="mt-2 bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-auto max-h-64">
            {assessment.rawResponse || JSON.stringify(d, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ANSICHT: PATIENTENDETAIL / VERLAUF
// ============================================================================
function PatientDetailView({ patient, onBack, onNewAssessment, onViewAssessment, onExportPdf, onDeleteAssessment, onEditPatient }) {
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const assessments = patient.assessments || [];

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  };

  const compareAssessments = selectedIds.length === 2
    ? assessments.filter(a => selectedIds.includes(a.id))
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Btn onClick={onBack} variant="ghost" size="sm" icon={ArrowLeft} />
          <div>
            <h2 className="text-lg font-bold text-gray-800">{patient.name}</h2>
            <p className="text-xs text-gray-500">{patient.wundlokalisation} · {patient.station || "—"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn onClick={() => onExportPdf(patient, assessments)} variant="secondary" size="sm" icon={Printer}>PDF</Btn>
          <Btn onClick={onNewAssessment} size="sm" icon={Camera}>Neues Bild</Btn>
        </div>
      </div>

      {/* Verlaufsgrafiken */}
      {assessments.length >= 2 && (
        <Card className="p-5">
          <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-600" /> Wundheilungsverlauf
          </h3>
          <WoundTimelineChart assessments={assessments} />
        </Card>
      )}

      {/* Vergleichsmodus */}
      {assessments.length >= 2 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Layers size={16} className="text-blue-600" /> Vergleichsansicht
            </h3>
            <Btn onClick={() => { setCompareMode(!compareMode); setSelectedIds([]); }}
              variant={compareMode ? "primary" : "secondary"} size="sm">
              {compareMode ? "Vergleich beenden" : "Vergleichen"}
            </Btn>
          </div>
          {compareMode && (
            <p className="text-xs text-gray-500 mb-3">Wählen Sie 2 Assessments zum Vergleich aus.</p>
          )}
          {compareAssessments && (
            <CompareCards a={compareAssessments[0]} b={compareAssessments[1]} />
          )}
        </Card>
      )}

      {/* Assessment-Liste / Timeline */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Clock size={16} /> Assessments ({assessments.length})
        </h3>
        {assessments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-gray-500">Noch kein Assessment durchgeführt.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {[...assessments].reverse().map((a, i) => {
              const d = a.ergebnis;
              const phaseInfo = d ? WOUND_PHASES[d.wundphase] : null;
              const isSelected = selectedIds.includes(a.id);
              return (
                <Card key={a.id} hover={!compareMode}
                  onClick={() => compareMode ? toggleSelect(a.id) : onViewAssessment(a)}
                  className={`p-4 ${isSelected ? "ring-2 ring-blue-500" : ""}`}>
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    {a.bild ? (
                      <img src={a.bild} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Image size={20} className="text-gray-300" />
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-800">{a.datum}</span>
                        {phaseInfo && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: phaseInfo.bg, color: phaseInfo.color }}>
                            {d.wundphase}
                          </span>
                        )}
                      </div>
                      {d && (
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Exs: {d.exsudat?.menge}</span>
                          {d.groessenschaetzung?.flaeche_cm2 && <span>{d.groessenschaetzung.flaeche_cm2} cm²</span>}
                          {d.infektionszeichen?.vorhanden && (
                            <span className="text-red-500 font-medium">⚠ Infektion</span>
                          )}
                        </div>
                      )}
                      {/* Mini tissue bar */}
                      {d?.gewebetypen && (
                        <div className="flex rounded-full overflow-hidden h-2 mt-2 bg-gray-100">
                          {Object.entries(d.gewebetypen).filter(([,v]) => v > 0).map(([k, v]) => (
                            <div key={k} style={{ width: `${v}%`, background: TISSUE_COLORS[k]?.color }} />
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    {!compareMode && (
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onDeleteAssessment(a.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Löschen">
                          <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                        </button>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// VERGLEICHSKARTEN (vorher/nachher)
// ============================================================================
function CompareCards({ a, b }) {
  if (!a?.ergebnis || !b?.ergebnis) return null;
  const da = a.ergebnis, db = b.ergebnis;

  const flaecheA = da.groessenschaetzung?.flaeche_cm2;
  const flaecheB = db.groessenschaetzung?.flaeche_cm2;
  const flaecheDiff = (flaecheA && flaecheB) ? flaecheB - flaecheA : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Links: Älteres Assessment */}
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Vorher</div>
            <div className="font-semibold text-sm">{a.datum}</div>
          </div>
          {a.bild && <img src={a.bild} alt="" className="w-full h-32 object-contain rounded-lg border" />}
          <PhaseBanner phase={da.wundphase} />
          <TissueBar tissues={da.gewebetypen} />
        </div>
        {/* Rechts: Neueres Assessment */}
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Nachher</div>
            <div className="font-semibold text-sm">{b.datum}</div>
          </div>
          {b.bild && <img src={b.bild} alt="" className="w-full h-32 object-contain rounded-lg border" />}
          <PhaseBanner phase={db.wundphase} />
          <TissueBar tissues={db.gewebetypen} />
        </div>
      </div>

      {/* Zusammenfassung der Veränderungen */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="text-sm font-semibold text-blue-700 mb-2">Veränderungen</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {flaecheDiff !== null && (
            <div className="flex items-center gap-1">
              {flaecheDiff < 0
                ? <TrendingDown size={14} className="text-green-500" />
                : <TrendingUp size={14} className="text-red-500" />}
              <span className={flaecheDiff < 0 ? "text-green-700" : "text-red-700"}>
                Fläche: {flaecheDiff > 0 ? "+" : ""}{flaecheDiff.toFixed(1)} cm²
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Granulation: </span>
            <span className={db.gewebetypen?.granulation > da.gewebetypen?.granulation ? "text-green-700 font-medium" : "text-red-700"}>
              {da.gewebetypen?.granulation}% → {db.gewebetypen?.granulation}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Nekrose: </span>
            <span className={db.gewebetypen?.nekrose < da.gewebetypen?.nekrose ? "text-green-700 font-medium" : "text-red-700"}>
              {da.gewebetypen?.nekrose}% → {db.gewebetypen?.nekrose}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Exsudat: </span>
            <span>{da.exsudat?.menge} → {db.exsudat?.menge}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// FEHLER-ANSICHT
// ============================================================================
function ErrorView({ error, rawResponse, onBack, onRetry }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <Btn onClick={onBack} variant="ghost" size="sm" icon={ArrowLeft} />
        <h2 className="text-lg font-bold text-gray-800">Analysefehler</h2>
      </div>
      <Card className="p-5 bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-700 mb-1">Fehler bei der Analyse</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Btn onClick={onRetry} icon={RefreshCw}>Erneut versuchen</Btn>
        <Btn onClick={onBack} variant="secondary" icon={ArrowLeft}>Zurück</Btn>
      </div>

      {rawResponse && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug: Rohantwort der API</h3>
          <pre className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
            {rawResponse}
          </pre>
          <p className="text-xs text-gray-400 mt-2">
            Häufige Ursachen: Die KI hat einen Safety-Hinweis statt JSON zurückgegeben, oder das API-Key ist ungültig.
            Versuchen Sie den Demo-Modus in den Einstellungen.
          </p>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// HAUPTKOMPONENTE — APP-ROUTING & STATE-MANAGEMENT
// ============================================================================
export default function WundScanAI() {
  // === App State ===
  const [view, setView] = useState("home");
  const [patients, setPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);

  // === Einstellungen ===
  const [apiKey, setApiKey] = useState("");
  const [apiMode, setApiMode] = useState("demo");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llava");
  const [referenceObject, setReferenceObject] = useState("euro_1");

  // === Analyse-State ===
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [rawResponse, setRawResponse] = useState("");

  // Temporäre Upload-Daten für Retry
  const [pendingUpload, setPendingUpload] = useState(null);

  // === Navigation ===
  const navigate = useCallback((v, data) => {
    setView(v);
    setAnalysisError(null);
    setRawResponse("");
  }, []);

  // === Patient erstellen / bearbeiten ===
  const handleNewPatient = () => {
    setEditingPatient({ id: generateId(), name: "", geburtsdatum: "", station: "", wundlokalisation: "", anamnese: "", assessments: [] });
    navigate("patientForm");
  };

  const handleSavePatient = () => {
    if (!editingPatient) return;
    const existing = patients.find(p => p.id === editingPatient.id);
    if (existing) {
      setPatients(prev => prev.map(p => p.id === editingPatient.id ? { ...editingPatient, assessments: p.assessments } : p));
    } else {
      setPatients(prev => [...prev, editingPatient]);
    }
    setCurrentPatient(editingPatient);
    navigate("upload");
  };

  const handleSelectPatient = (p) => {
    setCurrentPatient(p);
    navigate("patientDetail");
  };

  // === Analyse durchführen ===
  const handleAnalyze = async (imageBase64, mediaType, fullImage, notizen) => {
    if (!imageBase64) return;

    // Speichere für Retry
    setPendingUpload({ imageBase64, mediaType, fullImage, notizen });
    setIsAnalyzing(true);
    setAnalysisError(null);
    navigate("analyzing");

    const result = await analyzeWound(imageBase64, mediaType, apiKey, apiMode, ollamaUrl, ollamaModel, referenceObject);

    setIsAnalyzing(false);

    if (result.success) {
      const newAssessment = {
        id: generateId(),
        datum: new Date().toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        bild: fullImage,
        ergebnis: result.data,
        notizen: notizen || "",
        rawResponse: result.raw,
      };

      // Assessment zum Patient hinzufügen
      setCurrentAssessment(newAssessment);
      setPatients(prev => prev.map(p => {
        if (p.id === currentPatient?.id) {
          const updated = { ...p, assessments: [...(p.assessments || []), newAssessment] };
          setCurrentPatient(updated);
          return updated;
        }
        return p;
      }));

      navigate("result");
    } else {
      setAnalysisError(result.error);
      setRawResponse(result.raw);
      navigate("error");
    }
  };

  const handleRetry = () => {
    if (pendingUpload) {
      handleAnalyze(pendingUpload.imageBase64, pendingUpload.mediaType, pendingUpload.fullImage, pendingUpload.notizen);
    }
  };

  // === Assessment löschen ===
  const handleDeleteAssessment = (assessmentId) => {
    setPatients(prev => prev.map(p => {
      if (p.id === currentPatient?.id) {
        const updated = { ...p, assessments: (p.assessments || []).filter(a => a.id !== assessmentId) };
        setCurrentPatient(updated);
        return updated;
      }
      return p;
    }));
  };

  // === PDF Export ===
  const handleExportPdf = (patient, assessments) => {
    const p = patient || currentPatient;
    const a = assessments || p?.assessments || [];
    if (p && a.length > 0) {
      generatePrintReport(p, a);
    }
  };

  // === Render ===
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("home")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Shield size={22} className="text-blue-600" />
            <span className="font-bold text-gray-800">WundScan AI</span>
            <span className="text-xs text-gray-400 hidden sm:inline">v{APP_VERSION}</span>
          </button>
          <div className="flex items-center gap-2">
            {/* Provider-Badge mit Datenschutz-Info */}
            {apiMode === "ollama" && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                <Shield size={10} /> Lokal
              </span>
            )}
            {apiMode === "anthropic" && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <AlertTriangle size={10} /> Internet
              </span>
            )}
            <span className={`inline-block w-2 h-2 rounded-full ${apiMode === "demo" ? "bg-yellow-400" : apiMode === "anthropic" ? "bg-amber-400" : "bg-green-400"}`} />
            <span className="text-xs text-gray-500">
              {apiMode === "demo" ? "Demo" : apiMode === "anthropic" ? "Claude API" : `Ollama (${ollamaModel})`}
            </span>
            <button onClick={() => navigate("settings")} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Settings size={18} className="text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {view === "home" && (
          <HomeView
            patients={patients}
            onNewPatient={handleNewPatient}
            onSelectPatient={handleSelectPatient}
            onGoSettings={() => navigate("settings")}
          />
        )}

        {view === "settings" && (
          <SettingsView
            apiKey={apiKey} setApiKey={setApiKey}
            apiMode={apiMode} setApiMode={setApiMode}
            ollamaUrl={ollamaUrl} setOllamaUrl={setOllamaUrl}
            ollamaModel={ollamaModel} setOllamaModel={setOllamaModel}
            onBack={() => navigate("home")}
          />
        )}

        {view === "patientForm" && (
          <PatientFormView
            patient={editingPatient}
            onChange={setEditingPatient}
            onSave={handleSavePatient}
            onBack={() => navigate("home")}
            isNew={!patients.find(p => p.id === editingPatient?.id)}
          />
        )}

        {view === "upload" && (
          <UploadView
            onAnalyze={handleAnalyze}
            onBack={() => currentPatient ? navigate("patientDetail") : navigate("home")}
            referenceObject={referenceObject}
            setReferenceObject={setReferenceObject}
          />
        )}

        {view === "analyzing" && (
          <LoadingSpinner text="KI analysiert das Wundbild..." />
        )}

        {view === "result" && (
          <ResultView
            assessment={currentAssessment}
            patient={currentPatient}
            onBack={() => navigate("patientDetail")}
            onSaveAndNew={() => navigate("upload")}
            onExportPdf={() => handleExportPdf(currentPatient, currentPatient?.assessments)}
          />
        )}

        {view === "patientDetail" && currentPatient && (
          <PatientDetailView
            patient={currentPatient}
            onBack={() => navigate("home")}
            onNewAssessment={() => navigate("upload")}
            onViewAssessment={(a) => { setCurrentAssessment(a); navigate("result"); }}
            onExportPdf={handleExportPdf}
            onDeleteAssessment={handleDeleteAssessment}
            onEditPatient={() => { setEditingPatient({ ...currentPatient }); navigate("patientForm"); }}
          />
        )}

        {view === "error" && (
          <ErrorView
            error={analysisError}
            rawResponse={rawResponse}
            onBack={() => navigate("upload")}
            onRetry={handleRetry}
          />
        )}
      </main>

      {/* Footer mit Quellenangaben */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          <div className="text-center text-xs text-gray-400">
            WundScan AI v{APP_VERSION} · Evidenzbasiertes Wunddokumentationssystem · Salzkammergut Klinikum Gmunden
          </div>
          <details className="text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-600 text-center font-medium">
              Quellenangaben & Evidenzbasis
            </summary>
            <div className="mt-2 bg-gray-50 rounded-xl p-4 space-y-1.5 text-gray-500">
              <p className="font-semibold text-gray-600 mb-2">Klinische Grundlagen basieren auf:</p>
              <p>• <strong>AMBOSS GmbH</strong> — Wundbeurteilung, Chronische Wunden, Wundbehandlung, Diabetisches Fußsyndrom (ABCD-Schema, Wagner-Armstrong-Klassifikation, NERDS/STONEES-Kriterien). <a href="https://www.amboss.com/de/wissen/chronische-wunden-und-wundbehandlung" target="_blank" rel="noopener" className="text-blue-500 hover:underline">amboss.com</a></p>
              <p>• <strong>Coloplast WundWegWeiser</strong> — „In 5 Schritten zur Wundheilung": Strukturiertes Wundassessment, Behandlungsplanung, 14-Tage-Regel, Überweisungskriterien, Glossar chronischer Wunden.</p>
              <p>• <strong>OÖG Verbandstoffliste 2023</strong> (Wundposter) — Zugelassene Verbandmaterialien der Oberösterreichischen Gesundheitsholding: Alginate, Hydrokolloide, Schaumstoffe, Hydrofasern, Superabsorber, Wundgele, Aktivkohle, Wundspüllösungen.</p>
              <p>• <strong>DGKP Klaus Pointner, OÖG</strong> — Vortrag Diabetisches Fußsyndrom: Polyneuropathie- und Angiopathie-Diagnostik, 5 Blicke und 5 Griffe, DFS-Prophylaxe, Screeningmethoden (Semmes-Weinstein-Monofilament, Stimmgabel C128, Tip-Therm).</p>
              <p className="mt-2 text-gray-400 italic">Dieses Tool ersetzt nicht die ärztliche oder pflegerische Beurteilung. Alle Empfehlungen sind als Unterstützung der klinischen Entscheidungsfindung zu verstehen.</p>
            </div>
          </details>
        </div>
      </footer>
    </div>
  );
}
