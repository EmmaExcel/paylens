

import re
import io
from typing import Optional
from dataclasses import dataclass, field

import easyocr
from PIL import Image, ImageEnhance, ImageFilter

_reader: Optional[easyocr.Reader] = None

@dataclass
class OcrResult:
    """Result of OCR processing."""
    candidates: list[str] = field(default_factory=list)
    raw_texts: list[str] = field(default_factory=list)
    confidence: float = 0.0
    image_quality: dict = field(default_factory=dict)

def initialize_reader() -> None:
    """
    Initialize the EasyOCR reader. Call once at startup.
    This downloads the model on first run (~100MB).
    """
    global _reader
    print("[OCR] Initializing EasyOCR reader (this may take a moment on first run)...")
    _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    print("[OCR] EasyOCR reader ready")

def is_reader_ready() -> bool:
    """Check if the EasyOCR reader is initialized."""
    return _reader is not None

def _preprocess_image(image_bytes: bytes) -> tuple[bytes, dict]:
    """
    Preprocess an image for optimal OCR:
    - Resize to minimum 720p width if too small
    - Convert to greyscale
    - Enhance contrast
    - Sharpen

    Returns (processed_bytes, quality_info).
    """
    img = Image.open(io.BytesIO(image_bytes))
    width, height = img.size

    greyscale = img.convert("L")
    pixels = list(greyscale.getdata())
    avg_brightness = sum(pixels) / len(pixels) if pixels else 128

    quality_info = {
        "brightness": (
            "too_dark" if avg_brightness < 50
            else "too_bright" if avg_brightness > 220
            else "adequate"
        ),
        "sharpness": (
            "blurry" if width < 640 or height < 480
            else "acceptable" if width < 1200
            else "good"
        ),
        "resolution": (
            "too_small" if width < 640 or height < 480
            else "acceptable" if width < 1200
            else "good"
        ),
    }

    if width < 720:
        ratio = 720 / width
        new_size = (720, int(height * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    img = img.convert("L")

    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)

    img = img.filter(ImageFilter.SHARPEN)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue(), quality_info

def _extract_candidates(raw_texts: list[tuple]) -> tuple[list[str], float]:
    """
    Extract 10-digit account number candidates from EasyOCR output.

    EasyOCR returns: [(bbox, text, confidence), ...]

    Strategy:
    1. Collect all detected text blocks
    2. Clean non-digit characters
    3. Find exact 10-digit sequences
    4. If none, try concatenating adjacent blocks
    5. Return candidates with best confidence
    """
    candidates: list[str] = []
    best_confidence: float = 0.0

    for _bbox, text, conf in raw_texts:
        
        clean = re.sub(r"[^\d\s]", "", text)

        matches = re.findall(r"(?<!\d)\d{10}(?!\d)", clean)
        if matches:
            candidates.extend(matches)
            best_confidence = max(best_confidence, conf)

    if not candidates:
        all_digits = ""
        total_conf = 0.0
        count = 0
        for _bbox, text, conf in raw_texts:
            digits_only = re.sub(r"\D", "", text)
            all_digits += digits_only
            total_conf += conf
            count += 1

        if len(all_digits) >= 10:
            
            matches = re.findall(r"\d{10}", all_digits)
            if matches:
                candidates.extend(matches)
                best_confidence = total_conf / count if count > 0 else 0.0

    seen = set()
    unique = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            unique.append(c)

    return unique, best_confidence

def recognize_image(image_bytes: bytes) -> OcrResult:
    """
    Run OCR on an image and extract account number candidates.

    Returns an OcrResult with candidates, confidence, and quality info.
    """
    if _reader is None:
        raise RuntimeError("EasyOCR reader not initialized. Call initialize_reader() first.")

    processed_bytes, quality_info = _preprocess_image(image_bytes)

    raw_results = _reader.readtext(
        processed_bytes,
        allowlist="0123456789 -",
        detail=1,
    )

    candidates, confidence = _extract_candidates(raw_results)

    raw_texts = [text for _bbox, text, _conf in raw_results]

    return OcrResult(
        candidates=candidates,
        raw_texts=raw_texts,
        confidence=confidence,
        image_quality=quality_info,
    )
