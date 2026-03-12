from typing import List

from pydantic import BaseModel


class TranslateResponse(BaseModel):
    summaryBullets: List[str]
    nutritionalSwap: str
