# PayLens

PayLens is a fintech proof of concept that identifies bank account details from a photograph. A user can capture or upload an account number instead of manually typing the number, selecting a bank, or entering a sort code.

The product is intended for banks, fintech platforms, payment providers, and commerce applications that want to reduce payment-entry friction while adding an account verification step before a transfer is initiated.

## Product concept

Manual bank-detail entry creates avoidable friction and introduces transcription errors. PayLens uses image processing and OCR to:

1. Extract an account number from an image.
2. Validate the detected number against known bank rules.
3. Check compatible banks through account name enquiry.
4. Return only banks where the account number and account name are confirmed.
5. Present the verified details for user confirmation.

The current implementation focuses on Nigerian bank accounts and NUBAN validation. The architecture is designed to support additional markets, including UK accounts using sort codes, when suitable bank-directory and account-verification providers are integrated.

## Target audience

PayLens is designed for teams building:

- Consumer and business banking applications
- Digital wallets and payment applications
- Payment gateways and transfer platforms
- Merchant checkout and payout workflows
- Fintech onboarding and beneficiary-management products
- Internal payment operations tools

The project demonstrates the core interaction and API contract that could be embedded into an existing payment flow rather than functioning as a standalone banking application.

## Current capabilities

- Camera-based account-number capture
- Image upload as an alternative to camera capture
- OCR extraction of 10-digit account numbers
- Image-size and image-quality checks
- Nigerian NUBAN checksum validation
- Bank registry loading and caching
- Paystack account name enquiry
- Verification across multiple checksum-compatible banks
- Multiple confirmed bank matches in a single response
- API-key authentication
- Request rate limiting
- JSON API responses for frontend and partner integration
- React and Vite proof-of-concept interface

## Architecture

The repository contains two service implementations:

### TypeScript API

The primary API is an Express and TypeScript service in the repository root. It handles:

- Authentication and rate limiting
- Image upload and validation
- OCR processing
- NUBAN and bank matching
- Paystack integration
- Recognition and validation endpoints

### React frontend

The frontend is located in [`snapaccount-web`](./snapaccount-web). It provides the focused PayLens scanner experience and proxies `/v1` requests to the local API during development.

### Python service

The [`snapaccount-py`](./snapaccount-py) directory contains an alternative FastAPI implementation using EasyOCR. It is kept as an experimental service path and is not required to run the primary TypeScript application.

## Requirements

- Node.js 18 or newer
- npm
- A Paystack account and secret key for account name enquiry
- A browser with camera support for camera capture

## Configuration

Copy the API environment template:

```bash
cp .env.example .env
```

Set the server values:

```env
PORT=3000
PAYSTACK_SECRET_KEY=your_paystack_secret_key
SNAPACCOUNT_API_KEY=your_private_api_key
OCR_CONFIDENCE_THRESHOLD=0.5
```

Configure the frontend key in `snapaccount-web/.env.local`:

```env
VITE_SNAPACCOUNT_API_KEY=the_same_value_as_SNAPACCOUNT_API_KEY
```

The frontend API key is exposed in the browser bundle because it is used by the browser to call the API. For a production deployment, route requests through a trusted backend or issue scoped, short-lived credentials instead of exposing a long-lived private key.

Never commit `.env`, `.env.local`, Paystack credentials, cloud credentials, or uploaded images.

## Running locally

Install the API dependencies:

```bash
npm install
```

Install the frontend dependencies:

```bash
cd snapaccount-web
npm install
cd ..
```

Start the API:

```bash
npm run dev
```

In another terminal, start the frontend:

```bash
cd snapaccount-web
npm run dev
```

The default local addresses are:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

## API endpoints

All endpoints except health checks require:

```http
Authorization: Bearer <api-key>
```

### Health check

```http
GET /v1/health
```

### Bank registry

```http
GET /v1/banks
```

### Image recognition

```http
POST /v1/recognize
Content-Type: multipart/form-data
```

Upload the image using the `image` field:

```bash
curl -X POST http://localhost:3000/v1/recognize \
  -H "Authorization: Bearer $SNAPACCOUNT_API_KEY" \
  -F "image=@account-number.jpg"
```

The recognition response includes the detected account number, the confirmed primary bank, the confirmed account name, image metadata, confidence, and any additional banks that independently confirmed the account through name enquiry.

### Account validation

```http
POST /v1/validate
Content-Type: application/json
```

Example request:

```json
{
  "account_number": "0123456789",
  "bank_code": "058"
}
```

## Verification behavior

A bank is not considered confirmed solely because the account number passes a checksum. For each compatible bank, PayLens performs account name enquiry and requires:

- A successful provider response
- The returned account number to match the detected number
- A non-empty account name

If no bank confirms the account, the interface asks the user to retake the image and confirm the account details before continuing.

## Production considerations

This repository is a proof of concept and should be hardened before production use. A production integration should include:

- A server-side or tokenized frontend authentication model
- Secret management through the deployment platform
- Provider-specific timeout, retry, and circuit-breaker policies
- Audit logging that excludes unnecessary personal and account data
- Data-retention and deletion policies for uploaded images
- Consent, privacy, and regulatory review
- Monitoring for OCR accuracy and false matches
- Market-specific validation and account-verification providers
- Secure deployment behind HTTPS

## Validation

Run the available checks before publishing changes:

```bash
npm run build
cd snapaccount-web
npm run build
npm run lint
```

## License

No open-source license has been specified yet. Add a license before distributing the project outside its owning organization.
