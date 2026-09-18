

import base64
import io

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
from PIL import Image

from config import API_VERSION, MAX_IMAGE_SIZE_BYTES, MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT
from services.pipeline import run

router = APIRouter()

class Base64Request(BaseModel):
    image: str  
    hint: Optional[str] = None  

def _format_result(result) -> dict:
    """Convert a RecognitionResult to the Node.js compatible API response format."""
    if result.error_code:
        return {
            "status": "error",
            "error": {
                "code": result.error_code,
                "message": result.error_message,
                "details": {
                    "suggestion": "Retake the photo with better lighting or crop the image.",
                    "image_quality": result.image_quality,
                    "processing_time_ms": result.processing_time_ms,
                    "fallback": "manual_entry"
                }
            }
        }

    return {
        "status": "success",
        "data": {
            "account_number": result.account_number,
            "bank_code": result.bank_code,
            "bank_name": result.bank_name,
            "account_name": result.account_name,
        },
        "meta": {
            "confidence": result.confidence,
            "processing_time_ms": result.processing_time_ms,
            "source": "ocr"
        }
    }

def _validate_image_bytes(image_bytes: bytes) -> None:
    """Validate image size and dimensions."""
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "error_code": "IMAGE_TOO_LARGE",
                "message": f"Image exceeds maximum size of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)} MB.",
            },
        )

    try:
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        if width < MIN_IMAGE_WIDTH or height < MIN_IMAGE_HEIGHT:
            raise HTTPException(
                status_code=400,
                detail={
                    "status": "error",
                    "error_code": "IMAGE_TOO_SMALL",
                    "message": f"Image resolution ({width}×{height}) is below minimum ({MIN_IMAGE_WIDTH}×{MIN_IMAGE_HEIGHT}).",
                },
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "error_code": "IMAGE_FORMAT_UNSUPPORTED",
                "message": "Could not read image. Accepted formats: JPEG, PNG, WebP.",
            },
        )

@router.post("/recognize")
async def recognize_multipart(image: UploadFile = File(...)):
    """
    POST /v1/recognize — multipart image upload.

    Send a photo as multipart/form-data with field name "image".
    Returns the recognised account number, bank, and holder name.
    """
    image_bytes = await image.read()
    _validate_image_bytes(image_bytes)

    result = await run(image_bytes)
    return _format_result(result)

@router.post("/recognize/base64")
async def recognize_base64(body: Base64Request):
    """
    POST /v1/recognize/base64 — JSON with base64-encoded image.

    Send {"image": "<base64>", "hint": "GTBank"} in JSON body.
    Useful for server-to-server integrations.
    """
    try:
        image_bytes = base64.b64decode(body.image)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "error_code": "INVALID_REQUEST",
                "message": "Invalid base64 encoding for image field.",
            },
        )

    _validate_image_bytes(image_bytes)

    result = await run(image_bytes)
    return _format_result(result)
