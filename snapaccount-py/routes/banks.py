

from fastapi import APIRouter
from config import API_VERSION
from services.bank_registry import get_all_banks, get_cache_info

router = APIRouter()

@router.get("/banks")
async def list_banks():
    """Return the cached bank list."""
    banks = get_all_banks()
    cache_info = get_cache_info()

    return {
        "status": "success",
        "data": {
            "banks": [
                {
                    "code": b["code"],
                    "name": b["name"],
                    "slug": b.get("slug", ""),
                    "active": b.get("active", True),
                }
                for b in banks
            ],
            "last_updated": cache_info["last_updated"],
            "total_count": cache_info["total_count"],
        },
        "metadata": {
            "api_version": API_VERSION,
        },
    }
