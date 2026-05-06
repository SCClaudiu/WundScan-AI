"""Image ingestion: orientation-correct, EXIF-strip, resize, hash, store."""
from __future__ import annotations

import hashlib
import io
from pathlib import Path

from PIL import Image, ImageOps

from .config import IMAGES, MAX_IMAGE_LONG_EDGE


def ingest_image(src: Path | str) -> tuple[bytes, str, Path]:
    """Strip metadata, normalize orientation, resize, write content-addressed.

    Returns (jpeg_bytes, sha256_hex, stored_path).
    """
    src = Path(src)
    if not src.exists():
        raise FileNotFoundError(src)

    img = Image.open(src)
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    img.thumbnail((MAX_IMAGE_LONG_EDGE, MAX_IMAGE_LONG_EDGE))

    # Reconstruct without ANY metadata (EXIF, GPS, ICC, XMP).
    clean = Image.new("RGB", img.size)
    clean.putdata(list(img.getdata()))

    buf = io.BytesIO()
    clean.save(buf, format="JPEG", quality=92, optimize=True)
    data = buf.getvalue()

    sha = hashlib.sha256(data).hexdigest()
    out = IMAGES / f"{sha}.jpg"
    if not out.exists():
        out.write_bytes(data)

    return data, sha, out
