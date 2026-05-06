"""Append-only JSON-line audit log with file-locking and fsync.

Every assess() invocation must produce a contiguous chain of audit events
sufficient to reconstruct what the model saw and what it returned.
"""
from __future__ import annotations

import fcntl
import json
import os
from datetime import datetime, timezone
from typing import Any

from .config import AUDIT_LOG


def audit(event: str, **fields: Any) -> None:
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "pid": os.getpid(),
        "event": event,
        **fields,
    }
    line = json.dumps(record, sort_keys=True, default=str) + "\n"
    with AUDIT_LOG.open("a") as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        try:
            f.write(line)
            f.flush()
            os.fsync(f.fileno())
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
