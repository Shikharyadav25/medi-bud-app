"""Bound image decoding and strip camera metadata before provider processing."""

import io
from PIL import Image, UnidentifiedImageError


def normalize_image(raw):
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if (
                image.format not in ("JPEG", "PNG")
                or image.width * image.height > 16_000_000
            ):
                raise ValueError("Choose a JPEG or PNG below 16 megapixels.")
            image.load()
            output = io.BytesIO()
            image.convert("RGB").save(output, format="JPEG", quality=90)
            return output.getvalue(), "image/jpeg"
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError(
            "The image is corrupt, unsupported, or too large to process."
        ) from exc
