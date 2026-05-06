"""BiomedCLIP image embeddings.

Lazy-loaded so the rest of the pipeline runs even if torch / open_clip
are not yet installed. Returns None when unavailable; never returns a
silent stub vector — medical code must not fabricate features.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from .config import BIOMEDCLIP_HF

log = logging.getLogger(__name__)

_model = None
_preprocess = None
_load_attempted = False


def _try_load() -> bool:
    global _model, _preprocess, _load_attempted
    if _load_attempted:
        return _model is not None
    _load_attempted = True
    try:
        import torch  # noqa: F401
        from open_clip import create_model_from_pretrained

        log.info("Loading BiomedCLIP from %s ...", BIOMEDCLIP_HF)
        _model, _preprocess = create_model_from_pretrained(BIOMEDCLIP_HF)
        _model.eval()
        log.info("BiomedCLIP loaded.")
        return True
    except ImportError as e:
        log.warning(
            "BiomedCLIP unavailable (missing dep: %s). "
            "Install with: uv add open_clip_torch torch numpy",
            e,
        )
        return False
    except Exception as e:
        log.warning("BiomedCLIP load failed: %s. Embeddings disabled.", e)
        return False


def embed_image(path: Path | str):
    """Return a 1D numpy float32 embedding, or None if BiomedCLIP unavailable."""
    if not _try_load():
        return None

    import numpy as np
    import torch
    from PIL import Image

    img = Image.open(path).convert("RGB")
    x = _preprocess(img).unsqueeze(0)
    with torch.no_grad():
        feats = _model.encode_image(x)
        feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.cpu().numpy()[0].astype(np.float32)
