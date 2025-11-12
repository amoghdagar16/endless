from __future__ import annotations

from typing import Any, Optional


class APIError(Exception):
    def __init__(self, code: str, message: str, *, details: Optional[list[dict[str, Any]]] = None):
        self.code = code
        self.message = message
        self.details = details or []
        super().__init__(message)


class ValidationError(APIError):
    def __init__(self, message: str, *, details: Optional[list[dict[str, Any]]] = None):
        super().__init__("VALIDATION_ERROR", message, details=details)


class ConflictError(APIError):
    def __init__(self, message: str, *, details: Optional[list[dict[str, Any]]] = None):
        super().__init__("CONFLICT", message, details=details)


class NotFoundError(APIError):
    def __init__(self, message: str, *, details: Optional[list[dict[str, Any]]] = None):
        super().__init__("NOT_FOUND", message, details=details)


class PeriodLockedError(APIError):
    def __init__(self, message: str, *, details: Optional[list[dict[str, Any]]] = None):
        super().__init__("PERIOD_LOCKED", message, details=details)


class UnbalancedEntryError(APIError):
    def __init__(self, message: str, *, details: Optional[list[dict[str, Any]]] = None):
        super().__init__("UNBALANCED_ENTRY", message, details=details)
