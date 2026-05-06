"""Typer-based CLI: init / assess / timeline / show / export."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from . import repository
from .config import DISCLAIMER, REPORTS
from .db import migrate
from .pipeline import assess as run_assess

app = typer.Typer(
    help="WundScan-AI — local wound-imaging decision-support agent. NOT a medical device.",
    no_args_is_help=True,
)
console = Console()


@app.command()
def init() -> None:
    """Initialize / migrate the local SQLite database (idempotent)."""
    version = migrate()
    console.print(f"[green]DB migrated.[/] schema_version={version}")


@app.command("assess")
def cmd_assess(
    image: Path = typer.Argument(..., exists=True, dir_okay=False, readable=True),
    patient_id: str = typer.Argument(...),
    notes: str = typer.Option("", "--notes", "-n", help="Free-text clinical note."),
    no_escalate: bool = typer.Option(
        False, "--no-escalate", help="Disable VLM escalation on low confidence."
    ),
) -> None:
    """Assess a wound image and persist the visit."""
    migrate()
    result = run_assess(
        image,
        patient_id=patient_id,
        notes=notes,
        escalate_on_low_confidence=not no_escalate,
    )
    console.print(
        f"\n[bold green]Visit #{result['visit_id']}[/]  "
        f"patient_hash=[cyan]{result['patient_hash']}[/]"
    )
    console.print(f"  report:        {result['report']}")
    console.print(f"  stored image:  {result['stored_image']}")
    console.print(f"  perception:    {result['vlm_used']}")
    console.print(f"  embedding dim: {result['embedding_dim']}")
    console.print(f"  history count: {result['history_count']}")
    if result["nearest_prior"]:
        console.print("  nearest prior visits:")
        for vid, sim in result["nearest_prior"]:
            console.print(f"    - visit#{vid}  similarity={sim:.4f}")
    console.print("\n[bold]Visual assessment[/]")
    console.print_json(data=result["assessment"])
    console.print("\n[bold]Clinical reasoning[/]")
    console.print_json(data=result["reasoning"])
    console.print(f"\n[dim]{DISCLAIMER}[/dim]")


@app.command()
def timeline(
    patient_id: str = typer.Argument(...),
    limit: int = typer.Option(20, "--limit", "-n"),
) -> None:
    """Show all visits for a patient (most recent first)."""
    migrate()
    h = repository.hash_patient_id(patient_id)
    visits = repository.list_visits(h, limit=limit)
    if not visits:
        console.print(f"[yellow]No visits for patient[/] (hash={h})")
        raise typer.Exit(0)

    table = Table(title=f"Timeline for patient hash {h}")
    table.add_column("visit#", justify="right")
    table.add_column("ts (UTC)")
    table.add_column("conf")
    table.add_column("stage")
    table.add_column("tissue g/s/e/ep")
    table.add_column("exudate")
    table.add_column("notes")
    for v in visits:
        a = v.assessment
        if a:
            tissue = (
                f"{a.tissue.granulation_pct}/{a.tissue.slough_pct}/"
                f"{a.tissue.eschar_pct}/{a.tissue.epithelial_pct}"
            )
            table.add_row(
                str(v.visit_id), v.ts, a.confidence, a.healing_stage,
                tissue, a.exudate, v.notes[:50],
            )
        else:
            table.add_row(str(v.visit_id), v.ts, "-", "-", "-", "-", v.notes[:50])
    console.print(table)


@app.command()
def show(visit_id: int = typer.Argument(...)) -> None:
    """Show a single visit's full assessment + reasoning."""
    migrate()
    v = repository.get_visit(visit_id)
    if not v:
        console.print(f"[red]No visit with id {visit_id}[/]")
        raise typer.Exit(1)
    console.print(
        f"[bold]Visit #{v.visit_id}[/]  patient_hash=[cyan]{v.patient_hash}[/]"
    )
    console.print(f"  ts:         {v.ts}")
    console.print(f"  image sha:  {v.image_sha}")
    console.print(f"  vlm_used:   {v.vlm_used}")
    console.print(f"  confidence: {v.confidence}")
    console.print(f"  notes:      {v.notes}")
    console.print(f"  report:     {v.report_path}")
    if v.assessment:
        console.print("\n[bold]Visual assessment[/]")
        console.print_json(data=v.assessment.model_dump())
    if v.reasoning:
        console.print("\n[bold]Clinical reasoning[/]")
        console.print_json(data=v.reasoning.model_dump())
    console.print(f"\n[dim]{DISCLAIMER}[/dim]")


@app.command()
def export(
    patient_id: str = typer.Argument(...),
    out: Optional[Path] = typer.Option(None, "--out", "-o"),
) -> None:
    """Export the patient's full timeline as a single Markdown file."""
    migrate()
    h = repository.hash_patient_id(patient_id)
    visits = repository.list_visits(h, limit=10_000)
    if not visits:
        console.print(f"[yellow]No visits for patient[/] (hash={h})")
        raise typer.Exit(0)

    out_path = out or (REPORTS / f"{h}_timeline.md")
    parts: list[str] = [
        f"# WundScan-AI timeline\n\n"
        f"- patient (hashed): `{h}`\n"
        f"- visits: {len(visits)}\n"
        f"- generated: {visits[0].ts}\n\n"
        f"---\n"
    ]
    for v in reversed(visits):  # chronological
        parts.append(f"\n## Visit #{v.visit_id}  {v.ts}\n")
        parts.append(f"- vlm_used: `{v.vlm_used}`  confidence: `{v.confidence}`\n")
        parts.append(f"- notes: {v.notes or '(none)'}\n")
        parts.append(f"- image sha256: `{v.image_sha}`\n")
        if v.assessment:
            parts.append(
                f"\n### Visual\n```json\n{v.assessment.model_dump_json(indent=2)}\n```\n"
            )
        if v.reasoning:
            parts.append(
                f"\n### Reasoning\n```json\n{v.reasoning.model_dump_json(indent=2)}\n```\n"
            )
        parts.append("\n---\n")
    parts.append(f"\n**{DISCLAIMER}**\n")
    out_path.write_text("".join(parts))
    console.print(f"[green]Exported:[/] {out_path}")


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
    )
    app()


if __name__ == "__main__":
    main()
