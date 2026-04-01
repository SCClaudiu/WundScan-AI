"""Pydantic-Modelle fuer Wunddokumentation.

Alle Enums und Felder orientieren sich an ICW-Standards und dem
ABCD-Schema der Wundbeurteilung, angepasst fuer oesterreichische Pflege.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field


# --- Enums ---

class WoundType(str, Enum):
    ULCUS_CRURIS_VENOSUM = "Ulcus cruris venosum"
    ULCUS_CRURIS_ARTERIOSUM = "Ulcus cruris arteriosum"
    ULCUS_CRURIS_MIXTUM = "Ulcus cruris mixtum"
    DEKUBITUS = "Dekubitus"
    DIABETISCHES_FUSSSYNDROM = "Diabetisches Fußsyndrom"
    POSTOPERATIV = "Postoperative Wunde"
    TRAUMATISCH = "Traumatische Wunde"
    VERBRENNUNG = "Verbrennung"
    TUMORWUNDE = "Tumorwunde"
    SONSTIGE = "Sonstige"


class WoundBed(str, Enum):
    GRANULATION = "Granulation"
    EPITHEL = "Epithelgewebe"
    FIBRIN = "Fibrin"
    NEKROSE = "Nekrose"
    BIOFILM = "Biofilm-Verdacht"


class ExudateAmount(str, Enum):
    KEIN = "kein"
    GERING = "gering"
    MAESSIG = "mäßig"
    STARK = "stark"


class ExudateType(str, Enum):
    SEROES = "serös"
    SANGUINOLENT = "sanguinolent"
    SEROSANGUINOLENT = "serosanguinolent"
    PURULENT = "purulent"
    NICHT_BEURTEILBAR = "nicht beurteilbar"


class WoundEdge(str, Enum):
    GLATT = "glatt"
    UNREGEMAESSIG = "unregelmäßig"
    UNTERMINIERT = "unterminiert"
    MAZERIERT = "mazeriert"
    KALOOES = "kallös"
    EPITHELISIEREND = "epithelisierend"


class InfectionSign(str, Enum):
    ROETUNG = "Rötung"
    UEBERERWAERMUNG = "Übererwärmung"
    SCHWELLUNG = "Schwellung"
    SCHMERZZUNAHME = "Schmerzzunahme"
    GERUCH = "Foetor"
    PURULENTES_EXSUDAT = "Purulentes Exsudat"
    VERZÖGERTE_HEILUNG = "Verzögerte Heilung"


# --- Daten-Modelle ---

class PatientData(BaseModel):
    patient_id: str = ""
    nachname: str = ""
    vorname: str = ""
    geburtsdatum: date | None = None
    station: str = ""
    zimmer: str = ""


class WoundSize(BaseModel):
    laenge_cm: float = 0.0
    breite_cm: float = 0.0
    tiefe_cm: float = 0.0

    @property
    def flaeche_cm2(self) -> float:
        return round(self.laenge_cm * self.breite_cm, 2)


class Exudate(BaseModel):
    menge: ExudateAmount = ExudateAmount.KEIN
    art: ExudateType = ExudateType.NICHT_BEURTEILBAR


class WoundAssessment(BaseModel):
    """Kompletter Wund-Assessment-Datensatz."""
    wundart: WoundType = WoundType.SONSTIGE
    lokalisation: str = ""
    groesse: WoundSize = Field(default_factory=WoundSize)
    wundgrund: list[WoundBed] = Field(default_factory=list)
    exsudat: Exudate = Field(default_factory=Exudate)
    wundrand: list[WoundEdge] = Field(default_factory=list)
    infektionszeichen: list[InfectionSign] = Field(default_factory=list)
    schmerz_vas: int = Field(default=0, ge=0, le=10)
    bemerkungen: str = ""
    foto_base64: str | None = None
    datum: datetime = Field(default_factory=datetime.now)
    patient: PatientData = Field(default_factory=PatientData)


class AnalysisResult(BaseModel):
    """Strukturiertes Ergebnis der AI- oder regelbasierten Analyse."""
    pflegefachliche_einschaetzung: str = ""
    patienten_information: str = ""
    source: str = ""  # "ollama", "claude", "offline"
    model_name: str = ""
    timestamp: datetime = Field(default_factory=datetime.now)
    fachliche_grundlagen: list[str] = Field(default_factory=lambda: [
        "ABCD-Schema der Wundbeurteilung",
        "NERDS/STONEES-Kriterien",
        "Coloplast WundWegWeiser (5-Schritte-Modell, 14-Tage-Regel)",
        "OÖG-Verbandstoffliste",
        "DGKP K. Pointner, DFS Wagner-Armstrong",
    ])
    disclaimer: str = (
        "Diese Einschätzung wurde AI-gestützt generiert und ersetzt keine "
        "ärztliche Diagnose. Alle Angaben müssen fachlich geprüft werden."
    )
