from datetime import datetime
import uuid
from typing import Literal, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator


def valid_timezone(value):
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError):
        raise ValueError("Choose a valid IANA timezone")
    return value


def valid_timestamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include a timezone")
    return parsed.isoformat()


class HealthLogInput(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")
    kind: Literal["water", "sleep", "activity"]
    value: float = Field(ge=0, le=20000)
    unit: Literal["ml", "hours", "minutes"]
    occurred_at: str
    timezone: str = "Asia/Kolkata"
    mutation_id: Optional[str] = Field(default=None, max_length=100)
    payload_hash: Optional[str] = Field(default=None, max_length=100)
    _timezone = field_validator("timezone")(valid_timezone)
    _timestamp = field_validator("occurred_at")(valid_timestamp)

    @field_validator("mutation_id")
    @classmethod
    def valid_mutation_id(cls, value):
        return str(uuid.UUID(value)) if value is not None else None

    @model_validator(mode="after")
    def check_units(self):
        expected = {
            "water": ("ml", 20000),
            "sleep": ("hours", 24),
            "activity": ("minutes", 1440),
        }
        unit, maximum = expected[self.kind]
        if self.unit != unit or self.value > maximum:
            raise ValueError("Invalid unit or value for this habit")
        return self
