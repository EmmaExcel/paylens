

from fastapi import APIRouter
from config import API_VERSION, PAYSTACK_SECRET_KEY
from services.ocr import is_reader_ready
from services.bank_registry import get_cache_info

router = APIRouter()

@router.get("/health")
async def health():
    """Service health check — no auth required."""
    cache_info = get_cache_info()

    return {
        "status": "healthy",
        "version": API_VERSION,
        "dependencies": {
            "ocr_engine": "ready" if is_reader_ready() else "not_loaded",
            "name_enquiry": (
                "configured"
                if PAYSTACK_SECRET_KEY and PAYSTACK_SECRET_KEY != "sk_test_xxxx"
                else "not_configured"
            ),
            "bank_registry": "healthy" if cache_info["total_count"] > 0 else "empty",
        },
        "bank_registry": cache_info,
    }
