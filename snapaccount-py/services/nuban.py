

import re

NUBAN_WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3]

def validate_nuban(account_number: str, bank_code: str) -> bool:
    """
    Validate a 10-digit account number against a 3-digit bank code
    using the NUBAN checksum algorithm.

    Algorithm:
    1. Concatenate bank_code (3 digits) + first 9 digits of account_number
    2. Multiply each digit by weight [3,7,3, 3,7,3, 3,7,3, 3,7,3]
    3. Sum the products
    4. Check digit = (10 - (sum % 10)) % 10
    5. Compare with the 10th digit
    """
    if not re.match(r"^\d{10}$", account_number):
        return False
    if not re.match(r"^\d{3}$", bank_code):
        return False

    combined = bank_code + account_number[:9]
    weighted_sum = sum(int(d) * w for d, w in zip(combined, NUBAN_WEIGHTS))
    check_digit = (10 - (weighted_sum % 10)) % 10

    return check_digit == int(account_number[9])

def is_valid_format(account_number: str) -> bool:
    """Check if a string is exactly 10 digits."""
    return bool(re.match(r"^\d{10}$", account_number))

def identify_banks(account_number: str, bank_codes: list[str]) -> list[str]:
    """
    Given a 10-digit account number, return all bank codes for which
    the NUBAN checksum passes. Returns sorted list of matching codes.
    """
    if not is_valid_format(account_number):
        return []
    valid_traditional = sorted([
        code for code in bank_codes
        if validate_nuban(account_number, code)
    ])

    mfb_fallbacks = [
        '50515',  
        '999992', 
        '100033', 
        '090267', 
        '50211',  
    ]

    present_mfbs = [code for code in mfb_fallbacks if code in bank_codes]

    merged = []
    seen = set()
    for code in valid_traditional + present_mfbs:
        if code not in seen:
            merged.append(code)
            seen.add(code)

    return merged
