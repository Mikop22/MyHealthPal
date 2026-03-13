"""Profile endpoint — persist and retrieve patient demographics.

Uses JSON file storage following the same pattern as crowdfunding_storage
so that no additional database dependency is required.
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/profile", tags=["profile"])
_WRITE_LOCK = threading.Lock()


class ProfilePayload(BaseModel):
    age: Optional[int] = None
    sex: Optional[str] = None
    primary_language: Optional[str] = None
    ethnicity: list[str] = []
    email: Optional[str] = None


def _data_path() -> Path:
    configured = os.environ.get("PROFILE_DATA_PATH")
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parent.parent / "data" / "profiles.json"


def _load_profiles() -> dict[str, dict]:
    path = _data_path()
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        return {}
    return data


def _save_profiles(data: dict[str, dict]) -> None:
    path = _data_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, str(path))
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


@router.get("/{patient_id}", response_model=ProfilePayload)
async def get_profile(patient_id: str):
    """Return the profile for a patient, or defaults if none exists."""
    profiles = _load_profiles()
    data = profiles.get(patient_id, {})
    return ProfilePayload(**data)


@router.put("/{patient_id}", response_model=ProfilePayload)
async def update_profile(patient_id: str, payload: ProfilePayload):
    """Create or update a patient profile."""
    with _WRITE_LOCK:
        profiles = _load_profiles()
        profiles[patient_id] = payload.model_dump()
        _save_profiles(profiles)
    return payload
