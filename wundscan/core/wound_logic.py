"""Regelbasierte Wundlogik (Offline-Modus, ohne AI).

Portiert aus der buildLocalAnalysis()-Funktion des alten JS-Codes
und erweitert um saubere Strukturierung.
"""

from __future__ import annotations

from datetime import datetime

from models.wound_data import (
    AnalysisResult,
    ExudateAmount,
    InfectionSign,
    WoundAssessment,
    WoundBed,
    WoundEdge,
)


def offline_analyse(a: WoundAssessment) -> AnalysisResult:
    """Erzeugt eine regelbasierte Analyse ohne AI-Provider."""
    pflege = _build_pflegefachlich(a)
    patient = _build_patienten_info(a)
    return AnalysisResult(
        pflegefachliche_einschaetzung=pflege,
        patienten_information=patient,
        source="offline",
        model_name="Regelbasiert (kein AI-Modell)",
        timestamp=datetime.now(),
        disclaimer=(
            "Diese Zusammenfassung wurde regelbasiert ohne AI erstellt. "
            "Sie gibt die eingegebenen Daten strukturiert wieder. "
            "Keine klinische Interpretation enthalten."
        ),
    )


def _estimate_phase(wundgrund: list[WoundBed]) -> str:
    beds = {w for w in wundgrund}
    has_epithel = WoundBed.EPITHEL in beds
    has_granulation = WoundBed.GRANULATION in beds
    has_nekrose = WoundBed.NEKROSE in beds
    has_fibrin = WoundBed.FIBRIN in beds

    if has_epithel and not has_nekrose and not has_fibrin:
        return "Epithelisierungsphase"
    elif has_granulation and not has_nekrose:
        return "Granulationsphase"
    elif has_nekrose or has_fibrin:
        return "Reinigungsphase / Exsudationsphase"
    return "Nicht eindeutig bestimmbar"


def _build_pflegefachlich(a: WoundAssessment) -> str:
    lines: list[str] = []
    lines.append("=== PFLEGEFACHLICHE EINSCHÄTZUNG ===\n")

    # 1. Wundbeurteilung
    lines.append("1. WUNDBEURTEILUNG")
    lines.append(f"   Wundart: {a.wundart.value}")
    lines.append(f"   Lokalisation: {a.lokalisation}")
    lines.append(
        f"   Größe: {a.groesse.laenge_cm} × {a.groesse.breite_cm} "
        f"× {a.groesse.tiefe_cm} cm"
    )
    if a.wundgrund:
        lines.append(f"   Wundgrund: {', '.join(w.value for w in a.wundgrund)}")
    if a.wundrand:
        lines.append(f"   Wundrand: {', '.join(w.value for w in a.wundrand)}")
    phase = _estimate_phase(a.wundgrund)
    lines.append(f"   Heilungsphase (geschätzt): {phase}")
    lines.append("")

    # 2. Infektionsrisiko
    lines.append("2. INFEKTIONSRISIKO")
    if a.infektionszeichen:
        lines.append("   INFEKTIONSZEICHEN VORHANDEN:")
        for z in a.infektionszeichen:
            lines.append(f"   - {z.value}")
        if len(a.infektionszeichen) >= 3:
            lines.append("   → Mehrere Zeichen — dringende ärztliche Begutachtung empfohlen.")
            lines.append("   → Wundabstrich für mikrobiologische Diagnostik erwägen.")
        else:
            lines.append("   → Ärztliche Begutachtung empfohlen.")
    else:
        lines.append("   Keine Infektionszeichen dokumentiert.")
    lines.append("")

    # 3. Exsudat
    lines.append("3. EXSUDAT")
    lines.append(f"   Menge: {a.exsudat.menge.value} / Art: {a.exsudat.art.value}")
    lines.append("")

    # 4. Schmerz
    lines.append("4. SCHMERZ")
    lines.append(f"   VAS: {a.schmerz_vas}/10")
    if a.schmerz_vas >= 7:
        lines.append("   Starke Schmerzen — Schmerzmanagement prüfen.")
    lines.append("")

    # 5. Bemerkungen
    if a.bemerkungen:
        lines.append("5. BEMERKUNGEN")
        lines.append(f"   {a.bemerkungen}")
        lines.append("")

    # 6. Empfehlungen
    lines.append("6. EMPFEHLUNGEN")
    if WoundBed.NEKROSE in a.wundgrund:
        lines.append("   - Nekrose: Debridement-Bedarf prüfen (ärztliche Anordnung)")
    if WoundBed.FIBRIN in a.wundgrund:
        lines.append("   - Fibrin: Wundreinigung intensivieren, autolytisches Debridement erwägen")
    if a.exsudat.menge == ExudateAmount.STARK:
        lines.append("   - Starkes Exsudat: Superabsorber oder Alginate empfohlen")
    if WoundEdge.MAZERIERT in a.wundrand:
        lines.append("   - Mazerierter Wundrand: Hautschutz auftragen")
    lines.append("   - Nächste Evaluation in 14 Tagen (14-Tage-Regel)")

    return "\n".join(lines)


def _build_patienten_info(a: WoundAssessment) -> str:
    lines: list[str] = []
    lines.append("Liebe Patientin, lieber Patient,\n")
    lines.append("Ihre Wunde wurde heute dokumentiert und beurteilt.")

    if a.infektionszeichen:
        lines.append(
            "Es wurden Zeichen festgestellt, die auf eine mögliche Entzündung "
            "hinweisen. Das Pflegeteam wird die weitere Behandlung mit dem "
            "ärztlichen Team besprechen."
        )
    else:
        lines.append("Aktuell zeigt die Wunde keine Entzündungszeichen.")

    lines.append("\nBitte beachten Sie:")
    lines.append(
        "- Melden Sie sich sofort beim Pflegepersonal, wenn die Wunde stark "
        "schmerzt, sich rötet oder Eiter austritt."
    )
    lines.append("- Halten Sie die Wundauflage sauber und trocken.")
    lines.append(
        "- Versuchen Sie nicht, den Verband selbständig zu wechseln oder "
        "an der Wunde zu manipulieren."
    )
    lines.append("- Der nächste Verbandwechsel ist durch das Pflegeteam geplant.")

    return "\n".join(lines)
