from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.routes import accounts, health, opening_balances, periods, reports, transactions
from app.core.exceptions import APIError
from app.core.logging import configure_logging


configure_logging()

app = FastAPI(title="AI Accounting Backend", version="0.1.0")

# Configure CORS - allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(APIError)
async def api_error_handler(_: Request, exc: APIError) -> JSONResponse:
    return JSONResponse(status_code=_status_for_error(exc), content={
        "error": {
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        }
    })


def _status_for_error(exc: APIError) -> int:
    mapping = {
        "VALIDATION_ERROR": 422,
        "CONFLICT": 409,
        "NOT_FOUND": 404,
        "PERIOD_LOCKED": 409,
        "UNBALANCED_ENTRY": 400,
    }
    return mapping.get(exc.code, 400)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation failed",
                "details": exc.errors(),
            }
        },
    )


app.include_router(health.router, prefix="/v1")
app.include_router(accounts.router, prefix="/v1")
app.include_router(transactions.router, prefix="/v1")
app.include_router(opening_balances.router, prefix="/v1")
app.include_router(periods.router, prefix="/v1")
app.include_router(reports.router, prefix="/v1")
