

import httpx
from config import PAYSTACK_SECRET_KEY

PAYSTACK_BASE = "https://api.paystack.co"

def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"}

async def resolve_account(
    account_number: str, bank_code: str
) -> dict:
    """
    Resolve an account number + bank code into the account holder's name.
    Uses Paystack's free /bank/resolve endpoint.

    Returns: {"account_name": "...", "account_number": "..."}
    Raises: ValueError on invalid account, RuntimeError on failure.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                f"{PAYSTACK_BASE}/bank/resolve",
                params={"account_number": account_number, "bank_code": bank_code},
                headers=_headers(),
            )

            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") and data.get("data"):
                    return {
                        "account_name": data["data"]["account_name"],
                        "account_number": data["data"]["account_number"],
                    }

            if resp.status_code == 422:
                raise ValueError(
                    f"Account not found: {account_number} at bank {bank_code}"
                )

            raise RuntimeError(
                f"Paystack error {resp.status_code}: {resp.text[:200]}"
            )

        except httpx.TimeoutException:
            raise RuntimeError("Paystack request timed out")
        except httpx.HTTPError as e:
            raise RuntimeError(f"Paystack HTTP error: {e}")

async def fetch_bank_list() -> list[dict]:
    """
    Fetch the list of Nigerian banks from Paystack.
    Returns raw bank data — the bank_registry module caches this.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                f"{PAYSTACK_BASE}/bank",
                params={"country": "nigeria", "perPage": 100},
                headers=_headers(),
            )

            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") and data.get("data"):
                    return data["data"]

            return []

        except Exception as e:
            print(f"[Paystack] Failed to fetch bank list: {e}")
            return []
