

import time
from config import BANK_CACHE_TTL_SECONDS
from services.paystack import fetch_bank_list

_bank_cache: list[dict] = []
_bank_code_map: dict[str, dict] = {}
_last_fetched_at: float = 0

async def refresh_bank_registry() -> None:
    """Load or refresh the bank list from Paystack."""
    global _bank_cache, _bank_code_map, _last_fetched_at

    try:
        raw_banks = await fetch_bank_list()

        if raw_banks:
            _bank_cache = [
                {
                    "code": b["code"],
                    "name": b["name"],
                    "slug": b.get("slug", ""),
                    "longcode": b.get("longcode", ""),
                    "active": b.get("active", True),
                }
                for b in raw_banks
                if b.get("active") and not b.get("is_deleted")
            ]
            _bank_code_map = {b["code"]: b for b in _bank_cache}
            _last_fetched_at = time.time()
            print(f"[BankRegistry] Loaded {len(_bank_cache)} banks from Paystack")
            return

    except Exception as e:
        print(f"[BankRegistry] Failed to refresh: {e}")

    if not _bank_cache:
        _bank_cache = list(FALLBACK_BANKS)
        _bank_code_map = {b["code"]: b for b in _bank_cache}
        print(f"[BankRegistry] Using fallback bank list ({len(_bank_cache)} banks)")

def get_all_banks() -> list[dict]:
    """Get all cached banks."""
    return _bank_cache

def get_all_bank_codes() -> list[str]:
    """Get all bank codes (for NUBAN identification)."""
    return [b["code"] for b in _bank_cache]

def get_bank_by_code(code: str) -> dict | None:
    """Look up a bank by its code."""
    return _bank_code_map.get(code)

def is_cache_stale() -> bool:
    """Check if the cache needs a refresh."""
    return time.time() - _last_fetched_at > BANK_CACHE_TTL_SECONDS

def get_cache_info() -> dict:
    """Get cache metadata."""
    from datetime import datetime, timezone

    return {
        "last_updated": (
            datetime.fromtimestamp(_last_fetched_at, tz=timezone.utc).isoformat()
            if _last_fetched_at
            else "never"
        ),
        "total_count": len(_bank_cache),
    }

FALLBACK_BANKS: list[dict] = [
    {"code": "044", "name": "Access Bank", "slug": "access-bank", "longcode": "044150149", "active": True},
    {"code": "023", "name": "Citibank Nigeria", "slug": "citibank-nigeria", "longcode": "023150005", "active": True},
    {"code": "050", "name": "Ecobank Nigeria", "slug": "ecobank-nigeria", "longcode": "050150010", "active": True},
    {"code": "070", "name": "Fidelity Bank", "slug": "fidelity-bank", "longcode": "070150003", "active": True},
    {"code": "011", "name": "First Bank of Nigeria", "slug": "first-bank-of-nigeria", "longcode": "011150007", "active": True},
    {"code": "214", "name": "First City Monument Bank", "slug": "first-city-monument-bank", "longcode": "214150018", "active": True},
    {"code": "058", "name": "Guaranty Trust Bank", "slug": "guaranty-trust-bank", "longcode": "058152036", "active": True},
    {"code": "030", "name": "Heritage Bank", "slug": "heritage-bank", "longcode": "030159992", "active": True},
    {"code": "301", "name": "Jaiz Bank", "slug": "jaiz-bank", "longcode": "301080020", "active": True},
    {"code": "082", "name": "Keystone Bank", "slug": "keystone-bank", "longcode": "082150017", "active": True},
    {"code": "076", "name": "Polaris Bank", "slug": "polaris-bank", "longcode": "076151006", "active": True},
    {"code": "101", "name": "Providus Bank", "slug": "providus-bank", "longcode": "101000001", "active": True},
    {"code": "221", "name": "Stanbic IBTC Bank", "slug": "stanbic-ibtc-bank", "longcode": "221159522", "active": True},
    {"code": "068", "name": "Standard Chartered Bank", "slug": "standard-chartered-bank", "longcode": "068150015", "active": True},
    {"code": "232", "name": "Sterling Bank", "slug": "sterling-bank", "longcode": "232150016", "active": True},
    {"code": "032", "name": "Union Bank of Nigeria", "slug": "union-bank-of-nigeria", "longcode": "032150006", "active": True},
    {"code": "033", "name": "United Bank For Africa", "slug": "united-bank-for-africa", "longcode": "033153513", "active": True},
    {"code": "215", "name": "Unity Bank", "slug": "unity-bank", "longcode": "215154097", "active": True},
    {"code": "035", "name": "Wema Bank", "slug": "wema-bank", "longcode": "035150103", "active": True},
    {"code": "057", "name": "Zenith Bank", "slug": "zenith-bank", "longcode": "057150013", "active": True},
    {"code": "090267", "name": "Kuda Microfinance Bank", "slug": "kuda-bank", "longcode": "", "active": True},
    {"code": "100004", "name": "OPay", "slug": "opay", "longcode": "", "active": True},
    {"code": "50515", "name": "Moniepoint MFB", "slug": "moniepoint-mfb", "longcode": "", "active": True},
    {"code": "100033", "name": "PalmPay", "slug": "palmpay", "longcode": "", "active": True},
]
