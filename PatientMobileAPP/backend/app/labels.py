import os
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from supabase import Client, create_client


router = APIRouter(prefix="/labels", tags=["labels"])


class LabelPayload(BaseModel):
    flow: str = Field(
        ...,
        description="Which pipeline produced this label, e.g. check_in_extract, check_in_action_plan, vision_translate, vitals.",
    )
    raw_input: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Original input to the model (transcript, image metadata, biometric series, etc.).",
    )
    model_output: Dict[str, Any] = Field(
        ...,
        description="Structured model output that was shown to the user.",
    )
    user_corrected: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional user-corrected labels or edits applied to the model_output.",
    )
    truth_diagnosis: Optional[str] = Field(
        default=None,
        description="Ground-truth diagnosis or outcome label, when known.",
    )
    diversity_region: Optional[str] = None
    diversity_language: Optional[str] = None
    diversity_age_bucket: Optional[str] = None
    notes: Optional[str] = Field(
        default=None,
        description="Free-form notes (edge cases, cultural context, etc.).",
    )


def _get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).")
    return create_client(url, key)


@router.post("", status_code=201)
async def create_label(payload: LabelPayload) -> Dict[str, Any]:
    """
    Persist a single label row into the Supabase `labels` table.
    """
    try:
        client = _get_supabase_client()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    row = payload.model_dump()

    try:
        response = client.table("labels").insert(row).execute()
    except Exception as exc:  # supabase-py raises generic exceptions
        raise HTTPException(status_code=502, detail="Failed to persist label to Supabase.") from exc

    # supabase-py returns data under .data; surface id if present
    data = getattr(response, "data", None) or {}
    if isinstance(data, list) and data:
        return {"id": data[0].get("id"), "flow": data[0].get("flow")}

    return {"status": "ok", "flow": payload.flow}

