

import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import PORT, API_KEY, API_VERSION
from services.ocr import initialize_reader
from services.bank_registry import refresh_bank_registry

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run on startup and shutdown."""
    print("")
    print("  ╔══════════════════════════════════════╗")
    print("  ║     SnapAccount Python API v1.0      ║")
    print("  ╚══════════════════════════════════════╝")
    print("")

    print("[Server] Loading bank registry...")
    await refresh_bank_registry()

    initialize_reader()

    from config import PAYSTACK_SECRET_KEY
    if not PAYSTACK_SECRET_KEY or PAYSTACK_SECRET_KEY in ("sk_test_xxxx", "sk_test_your_key_here"):
        print("")
        print("  ⚠️  PAYSTACK_SECRET_KEY is not set or using a placeholder.")
        print("     Name enquiry (/bank/resolve) will fail.")
        print("     Set your key in .env to enable account verification.")
        print("")

    print(f"[Server] Listening on http://localhost:{PORT}")
    print(f"[Server] Health:    GET  http://localhost:{PORT}/v1/health")
    print(f"[Server] Banks:     GET  http://localhost:{PORT}/v1/banks")
    print(f"[Server] Recognize: POST http://localhost:{PORT}/v1/recognize")
    print(f"[Server] Validate:  POST http://localhost:{PORT}/v1/validate")
    print("")

    yield  

    print("[Server] Shutting down...")

app = FastAPI(
    title="SnapAccount API",
    version=API_VERSION,
    description="OCR-powered account number recognition for Nigerian banking",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Check API key on all routes except /v1/health and docs."""
    
    skip_paths = ["/v1/health", "/docs", "/openapi.json", "/redoc", "/"]
    if request.url.path in skip_paths:
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")

    if not auth_header:
        return JSONResponse(
            status_code=401,
            content={
                "status": "error",
                "error_code": "AUTH_INVALID_KEY",
                "message": "Missing Authorization header. Expected: Bearer <api_key>",
            },
        )

    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0] != "Bearer":
        return JSONResponse(
            status_code=401,
            content={
                "status": "error",
                "error_code": "AUTH_INVALID_KEY",
                "message": "Invalid Authorization format. Expected: Bearer <api_key>",
            },
        )

    if parts[1] != API_KEY:
        return JSONResponse(
            status_code=401,
            content={
                "status": "error",
                "error_code": "AUTH_INVALID_KEY",
                "message": "Invalid API key.",
            },
        )

    return await call_next(request)

from routes.health import router as health_router
from routes.banks import router as banks_router
from routes.validate import router as validate_router
from routes.recognize import router as recognize_router

app.include_router(health_router, prefix="/v1")
app.include_router(banks_router, prefix="/v1")
app.include_router(validate_router, prefix="/v1")
app.include_router(recognize_router, prefix="/v1")

@app.get("/")
async def root():
    return {
        "name": "SnapAccount API (Python)",
        "version": API_VERSION,
        "docs": f"http://localhost:{PORT}/docs",
        "health": "/v1/health",
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
