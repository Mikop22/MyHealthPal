from typing import List

from pydantic import BaseModel, Field


class TranslateResponse(BaseModel):
    summaryBullets: List[str]
    nutritionalSwap: str
    followUpQuestions: List[str] = Field(default_factory=list)


class TranslateFollowUpResponse(BaseModel):
    answer: str
