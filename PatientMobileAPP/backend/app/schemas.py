from typing import List

from pydantic import BaseModel


class TranslateResponse(BaseModel):
    summaryBullets: List[str]
    nutritionalSwap: str
    followUpQuestions: List[str] = []


class TranslateFollowUpResponse(BaseModel):
    answer: str
