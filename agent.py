"""WundScan-AI CLI entry point.

NOT A MEDICAL DEVICE. Decision-support / documentation only.
All outputs require qualified-clinician review before clinical action.

Usage:
    uv run python agent.py <image_path> [patient_id] [notes...]

Examples:
    uv run python agent.py /tmp/test.jpg patient_001 "left heel pressure ulcer, day 7"
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

from wundscan.pipeline import assess

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    image = Path(sys.argv[1])
    patient = sys.argv[2] if len(sys.argv) > 2 else "anon"
    notes = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""

    result = assess(image, patient_id=patient, notes=notes)

    print(f"\n[+] report:        {result['report']}")
    print(f"[+] stored image:  {result['stored_image']}")
    print(f"[+] perception:    {result['vlm_used']}")
    print(f"[+] embedding dim: {result['embedding_dim']}\n")
    print("=== Visual assessment ===")
    print(json.dumps(result["assessment"], indent=2))
    print("\n=== Clinical reasoning ===")
    print(json.dumps(result["reasoning"], indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
