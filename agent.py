"""WundScan-AI CLI entry point.

NOT A MEDICAL DEVICE. Decision-support / documentation only.
All outputs require qualified-clinician review before any clinical action.

Modern usage (typer):
    uv run python agent.py init
    uv run python agent.py assess <image> <patient_id> [--notes "..."]
    uv run python agent.py timeline <patient_id>
    uv run python agent.py show <visit_id>
    uv run python agent.py export <patient_id> [--out path.md]

Legacy positional form (kept for muscle memory):
    uv run python agent.py <image> <patient_id> [notes...]
"""
from __future__ import annotations

import sys
from pathlib import Path

from wundscan.cli import main

KNOWN_COMMANDS = {"init", "assess", "timeline", "show", "export", "--help", "-h"}


def _legacy_dispatch() -> None:
    """Translate legacy `agent.py <image> <patient> notes...` into typer form."""
    if len(sys.argv) < 2:
        return
    first = sys.argv[1]
    if first in KNOWN_COMMANDS or first.startswith("-"):
        return
    if not Path(first).exists() or len(sys.argv) < 3:
        return
    image, patient_id = sys.argv[1], sys.argv[2]
    notes = " ".join(sys.argv[3:])
    new_argv = [sys.argv[0], "assess", image, patient_id]
    if notes:
        new_argv += ["--notes", notes]
    sys.argv = new_argv


if __name__ == "__main__":
    _legacy_dispatch()
    main()
