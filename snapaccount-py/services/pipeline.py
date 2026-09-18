

import time
import secrets
from dataclasses import dataclass, field
from typing import Optional

from config import CONFIDENCE_THRESHOLD
from services.ocr import recognize_image
from services.nuban import identify_banks, is_valid_format
from services.paystack import resolve_account
from services.bank_registry import get_all_bank_codes, get_bank_by_code

@dataclass
class RecognitionResult:
    """Full result from the recognition pipeline."""
    request_id: str = ""
    account_number: str = ""
    confidence: float = 0.0
    bank_code: str = ""
    bank_name: str = ""
    account_name: str = ""
    account_name_status: str = ""  
    nuban_valid: bool = False
    image_quality: dict = field(default_factory=dict)
    processing_time_ms: int = 0
    error_code: Optional[str] = None
    error_message: Optional[str] = None

async def run(image_bytes: bytes) -> RecognitionResult:
    """
    Run the full recognition pipeline on an image.

    Steps:
    1. OCR the image → extract 10-digit candidates
    2. If confidence < threshold → LOW_CONFIDENCE
    3. NUBAN validation → identify matching banks
    4. Paystack resolve → get account holder name
    5. Return full result
    """
    start_time = time.time()
    request_id = f"req_{secrets.token_hex(6)}"

    result = RecognitionResult(request_id=request_id)

    ocr_result = recognize_image(image_bytes)
    result.image_quality = ocr_result.image_quality

    if not ocr_result.candidates:
        result.error_code = "NO_NUMBER_FOUND"
        result.error_message = "No account number detected in the image."
        result.confidence = ocr_result.confidence
        result.processing_time_ms = int((time.time() - start_time) * 1000)
        return result

    if ocr_result.confidence < CONFIDENCE_THRESHOLD:
        result.error_code = "LOW_CONFIDENCE"
        result.error_message = "Image quality too low. Prompt user to retake."
        result.confidence = ocr_result.confidence
        result.account_number = ocr_result.candidates[0]
        result.processing_time_ms = int((time.time() - start_time) * 1000)
        return result

    best_candidate = ocr_result.candidates[0]
    result.account_number = best_candidate
    result.confidence = ocr_result.confidence

    if not is_valid_format(best_candidate):
        result.error_code = "INVALID_FORMAT"
        result.error_message = "Detected text is not a valid 10-digit account number."
        result.processing_time_ms = int((time.time() - start_time) * 1000)
        return result

    all_bank_codes = get_all_bank_codes()
    matching_banks = identify_banks(best_candidate, all_bank_codes)

    if matching_banks:
        result.nuban_valid = True
        result.bank_code = matching_banks[0]
        bank_info = get_bank_by_code(matching_banks[0])
        result.bank_name = bank_info["name"] if bank_info else matching_banks[0]
    else:

        result.nuban_valid = False

    banks_to_try = matching_banks if matching_banks else []

    for bank_code in banks_to_try:
        try:
            resolved = await resolve_account(best_candidate, bank_code)
            result.account_name = resolved["account_name"]
            result.account_name_status = "verified"
            result.bank_code = bank_code
            bank_info = get_bank_by_code(bank_code)
            result.bank_name = bank_info["name"] if bank_info else bank_code
            break  
        except ValueError:
            
            continue
        except RuntimeError:
            
            result.account_name_status = "deferred"
            continue

    if not result.account_name_status:
        result.account_name_status = "not_found"

    result.processing_time_ms = int((time.time() - start_time) * 1000)
    return result
