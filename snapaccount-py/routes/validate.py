

import secrets
from fastapi import APIRouter
from pydantic import BaseModel

from config import API_VERSION
from services.nuban import validate_nuban, is_valid_format
from services.paystack import resolve_account
from services.bank_registry import get_bank_by_code

router = APIRouter()

class ValidateRequest(BaseModel):
    account_number: str
    bank_code: str

@router.post("/validate")
async def validate_account(body: ValidateRequest):
    """
    Validate a manually entered account number (no OCR).
    Runs NUBAN check and resolves the account holder via Paystack.
    """
    request_id = f"req_{secrets.token_hex(6)}"

    if not is_valid_format(body.account_number):
        return {
            "status": "error",
            "error_code": "INVALID_FORMAT",
            "message": "account_number must be exactly 10 digits.",
            "request_id": request_id,
        }

    nuban_valid = validate_nuban(body.account_number, body.bank_code)

    account_name = ""
    account_name_status = "not_found"

    try:
        resolved = await resolve_account(body.account_number, body.bank_code)
        account_name = resolved["account_name"]
        account_name_status = "verified"
    except ValueError:
        account_name_status = "not_found"
    except RuntimeError:
        account_name_status = "deferred"

    bank_info = get_bank_by_code(body.bank_code)

    return {
        "status": "success",
        "data": {
            "request_id": request_id,
            "account_number": body.account_number,
            "bank_code": body.bank_code,
            "bank_name": bank_info["name"] if bank_info else "Unknown Bank",
            "account_name": account_name,
            "account_name_status": account_name_status,
            "nuban_valid": nuban_valid,
        },
        "metadata": {
            "api_version": API_VERSION,
        },
    }
