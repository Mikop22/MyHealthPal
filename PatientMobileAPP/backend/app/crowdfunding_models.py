from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _validate_required_text(value: str) -> str:
    stripped_value = value.strip()
    if not stripped_value:
        raise ValueError("Field must not be empty.")
    return stripped_value


class CampaignCreate(BaseModel):
    owner_identifier: str
    title: str
    description: str
    goal_amount: float = Field(ge=0)
    deadline: Optional[str] = None

    @field_validator("owner_identifier", "title", "description")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        return _validate_required_text(value)

    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        try:
            return date.fromisoformat(value).isoformat()
        except ValueError as exc:
            raise ValueError("Input should be a valid date in YYYY-MM-DD format.") from exc


class CampaignResponse(BaseModel):
    id: str
    owner_identifier: str
    title: str
    description: str
    goal_amount: float
    status: str
    deadline: Optional[str] = None
    created_at: str


class CampaignDetailResponse(CampaignResponse):
    total_raised: float


class ContributionCreate(BaseModel):
    contributor_identifier: str
    amount: float = Field(ge=0)
    message: Optional[str] = None

    @field_validator("contributor_identifier")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        return _validate_required_text(value)


class ContributionResponse(BaseModel):
    id: str
    campaign_id: str
    contributor_identifier: str
    amount: float
    message: Optional[str] = None
    created_at: str
