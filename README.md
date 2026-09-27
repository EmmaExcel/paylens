# paylens

Paylens is an OCR powered account number recognition API for Nigerian banking. It allows users to capture an account number from an image, identify the associated bank, and confirm the account holder without manual entry.

The project contains two parallel backend implementations:
* A Node.js API using TypeScript and Express
* A Python API using FastAPI

## Features

* OCR Account Recognition: Extracts 10 digit Nigerian account numbers from images.
* Bank Resolution: Retrieves and caches the Nigerian bank registry.
* Account Validation: Confirms the account holder name via Paystack.

## Repository Structure

* `/` contains the Node.js implementation.
* `/snapaccount-py` contains the Python implementation.

## Node.js API

The Node.js implementation uses Google Cloud Vision for image text extraction.

### Prerequisites

* Node.js
* Google Cloud Vision API credentials

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables. Copy `.env.example` to `.env` and update the values:
```env
PORT=3000
PAYSTACK_SECRET_KEY=sk_test_your_key_here
SNAPACCOUNT_API_KEY=snap_test_key_123
OCR_CONFIDENCE_THRESHOLD=0.5
GOOGLE_APPLICATION_CREDENTIALS_JSON=
```

3. Start the development server:
```bash
npm run dev
```

## Python API

The Python implementation uses EasyOCR for local image processing.

### Prerequisites

* Python 3.10 or higher

### Installation

1. Navigate to the Python directory:
```bash
cd snapaccount-py
```

2. Create and activate a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables. Copy `.env.example` to `.env` and update the values:
```env
PAYSTACK_SECRET_KEY=sk_test_xxxx
API_KEY=your_snapaccount_api_key
PORT=8000
CONFIDENCE_THRESHOLD=0.75
```

5. Start the server:
```bash
python main.py
```

## API Endpoints

Both implementations provide the following endpoints. Authenticated endpoints require an API key in the header format `Authorization: Bearer <API_KEY>`.

* `GET /v1/health`
Returns the server status. No authentication required.

* `GET /v1/banks`
Returns the cached list of supported Nigerian banks.

* `POST /v1/recognize`
Accepts an image upload and returns the recognized account number.

* `POST /v1/validate`
Validates an account number and bank code to resolve the account name.
