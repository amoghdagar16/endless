from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field, model_validator


class PeriodCommand(BaseModel):
    start: date
    end: date

    @model_validator(mode="after")
    def validate_dates(self) -> "PeriodCommand":
        if self.start > self.end:
            raise ValueError("start must be on or before end")
        return self


class PeriodResponse(BaseModel):
    start: date
    end: date
    status: str


class PeriodLockRequest(PeriodCommand):
    override: bool = Field(default=False, description="Allow override when permitted")
