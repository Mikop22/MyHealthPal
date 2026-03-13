"""Appointment-prep proxy routes for PatientMobileAPP.

These endpoints proxy the DoctorAPP ``/api/v1/mobile-prep`` surface so
the mobile frontend only needs to talk to its own backend.  Each route
validates the request locally, forwards it to DoctorAPP, and returns
the upstream response.

Endpoints
---------
GET  /prep/invite/{token}           — resolve invite token
POST /prep/{token}/start            — mark prep as started
POST /prep/{token}/save-checkin     — save symptom narrative + cards
POST /prep/{token}/save-documents   — save scanned document metadata
POST /prep/{token}/save-health-data — save wearable / vitals payload
POST /prep/{token}/submit           — finalise & trigger analysis
GET  /prep/{token}/summary          — retrieve patient-safe summary
GET  /prep/{token}/status           — lightweight status polling
"""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException

from app.doctorapp_client import (
    DoctorAppClientError,
    resolve_invite as _resolve_invite,
    start_prep as _start_prep,
    save_checkin as _save_checkin,
    save_documents as _save_documents,
    save_health_data as _save_health_data,
    submit_prep as _submit_prep,
    get_summary as _get_summary,
    get_status as _get_status,
)
from app.prep_schemas import (
    CheckinPayload,
    DocumentsPayload,
    HealthDataPayload,
    InviteResolutionResponse,
    PrepStatusResponse,
    SaveResponse,
    StartPrepResponse,
    SubmitResponse,
    SummaryResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prep", tags=["prep"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _upstream_error(exc: DoctorAppClientError) -> HTTPException:
    """Convert a DoctorAppClientError into an HTTPException."""
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


def _network_error(exc: Exception) -> HTTPException:
    """Convert a network-level failure into a 502."""
    logger.exception("DoctorAPP unreachable: %s", exc)
    return HTTPException(status_code=502, detail="DoctorAPP service unreachable.")


def _timeout_error() -> HTTPException:
    return HTTPException(status_code=504, detail="DoctorAPP request timed out.")


# ---------------------------------------------------------------------------
# GET /prep/invite/{token}
# ---------------------------------------------------------------------------

@router.get("/invite/{token}", response_model=InviteResolutionResponse)
async def resolve_invite(token: str):
    """Resolve an invite token and return patient-safe appointment context."""
    try:
        data = await _resolve_invite(token)
    except DoctorAppClientError as exc:
        raise _upstream_error(exc) from exc
    except httpx.TimeoutException as exc:
        raise _timeout_error() from exc
    except httpx.ConnectError as exc:
        raise _network_error(exc) from exc

    return InviteResolutionResponse(**data)


# ---------------------------------------------------------------------------
# POST /prep/{token}/start
# ---------------------------------------------------------------------------

@router.post("/{token}/start", response_model=StartPrepResponse)
async def start_prep(token: str):
    """Mark prep as started and return any existing draft."""
    try:
        data = await _start_prep(token)
    except DoctorAppClientError as exc:
        raise _upstream_error(exc) from exc
    except httpx.TimeoutException as exc:
        raise _timeout_error() from exc
    except httpx.ConnectError as exc:
        raise _network_error(exc) from exc

    return StartPrepResponse(**data)


# ---------------------------------------------------------------------------
# POST /prep/{token}/save-checkin
# ---------------------------------------------------------------------------

@router.post("/{token}/save-checkin", response_model=SaveResponse)
async def save_checkin(token: str, body: CheckinPayload):
    """Save symptom narrative and confirmed symptom cards."""
    try:
        data = await _save_checkin(token, body.model_dump())
    except DoctorAppClientError as exc:
        raise _upstream_error(exc) from exc
    except httpx.TimeoutException as exc:
        raise _timeout_error() from exc
    except httpx.ConnectError as exc:
        raise _network_error(exc) from exc

    return SaveResponse(**data)


# ---------------------------------------------------------------------------
# POST /prep/{token}/save-documents
# ---------------------------------------------------------------------------

@router.post("/{token}/save-documents", response_model=SaveResponse)
async def save_documents(token: str, body: DocumentsPayload):
    """Save scanned/uploaded document metadata and summaries."""
    try:
        data = await _save_documents(token, body.model_dump())
    except DoctorAppClientError as exc:
        raise _upstream_error(exc) from exc
    except httpx.TimeoutException as exc:
        raise _timeout_error() from exc
    except httpx.ConnectError as exc:
        raise _network_error(exc) from exc

    return SaveResponse(**data)


# ---------------------------------------------------------------------------
# POST /prep/{token}/save-health-data
# ---------------------------------------------------------------------------

@router.post("/{token}/save-health-data", response_model=SaveResponse)
async def save_health_data(token: str, body: HealthDataPayload):
    """Save wearable/vitals payload."""
    try:
        data = await _save_health_data(token, body.model_dump())
    except DoctorAppClientError as exc:
        raise _upstream_error(exc) from exc
    except httpx.TimeoutException as exc:
        raise _timeout_error() from exc
    except httpx.ConnectError as exc:
        raise _network_error(exc) from exc

    return SaveResponse(**data)


# ---------------------------------------------------------------------------
# POST /prep/{token}/submit
# ---------------------------------------------------------------------------

@router.post("/{token}/submit", response_model=SubmitResponse)
async def submit_prep(token: str):
    """Finalise the prep package and trigger analysis."""
    try:
        data = await _submit_prep(token)
    except DoctorAppClientError as exc:
        raise _upstream_error(exc) from exc
    except httpx.TimeoutException as exc:
        raise _timeout_error() from exc
    except httpx.ConnectError as exc:
        raise _network_error(exc) from exc

    return SubmitResponse(**data)


# ---------------------------------------------------------------------------
# GET /prep/{token}/summary
# ---------------------------------------------------------------------------

@router.get("/{token}/summary", response_model=SummaryResponse)
async def get_summary(token: str):
    """Return the patient-safe summary and questions to ask."""
    try:
        data = await _get_summary(token)
    except DoctorAppClientError as exc:
        raise _upstream_error(exc) from exc
    except httpx.TimeoutException as exc:
        raise _timeout_error() from exc
    except httpx.ConnectError as exc:
        raise _network_error(exc) from exc

    return SummaryResponse(**data)


# ---------------------------------------------------------------------------
# GET /prep/{token}/status
# ---------------------------------------------------------------------------

@router.get("/{token}/status", response_model=PrepStatusResponse)
async def get_status(token: str):
    """Lightweight polling endpoint for the mobile app."""
    try:
        data = await _get_status(token)
    except DoctorAppClientError as exc:
        raise _upstream_error(exc) from exc
    except httpx.TimeoutException as exc:
        raise _timeout_error() from exc
    except httpx.ConnectError as exc:
        raise _network_error(exc) from exc

    return PrepStatusResponse(**data)
