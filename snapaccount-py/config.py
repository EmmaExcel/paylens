

import os
from dotenv import load_dotenv

load_dotenv()

PAYSTACK_SECRET_KEY: str = os.getenv("PAYSTACK_SECRET_KEY", "")
API_KEY: str = os.getenv("API_KEY", "snap_test_key_123")
PORT: int = int(os.getenv("PORT", "8000"))
CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.75"))

MAX_IMAGE_SIZE_BYTES: int = 10 * 1024 * 1024  
MIN_IMAGE_WIDTH: int = 300
MIN_IMAGE_HEIGHT: int = 300

API_VERSION: str = "1.0"

BANK_CACHE_TTL_SECONDS: int = 24 * 60 * 60
