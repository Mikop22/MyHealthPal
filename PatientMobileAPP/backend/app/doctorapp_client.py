"""Async HTTP client for communicating with the DoctorAPP backend.

All appointment-linked prep operations are owned by DoctorAPP.  This
module wraps the DoctorAPP ``/api/v1/mobile-prep`` endpoints so that
the PatientMobileAPP backend can proxy requests on behalf of the
mobile frontend without exposing internal service URLs.

Configuration
-------------
Set ``DOCTORAPP_BASE_URL`` in the environment (defaults to
``http://localhost:8001``).  An optional ``DOCTORAPP_TIMEOUT``
(seconds, default 30) controls per-request timeout.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

_PREFIX = "/api/v1/mobile-prep"


def _base_url() -> str:
    return os.environ.get("DOCTORAPP_BASE_URL", "http://localhost:8001")


def _timeout() -> float:
    try:
        return float(os.environ.get("DOCTORAPP_TIMEOUT", "30"))
    except (TypeError, ValueError):
        return 30.0


class DoctorAppClientError(Exception):
    """Raised when the upstream DoctorAPP returns a non-2xx status."""

    def __init__(self, status_code: int, detail: str = ""):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"DoctorAPP returned {status_code}: {detail}")


async def _request(
    method: str,
    path: str,
    *,
    json: Any = None,
) -> dict:
    """Send an HTTP request to the DoctorAPP backend and return the JSON body.

    Raises
    ------
    DoctorAppClientError
        For any non-2xx response from the upstream service.
    httpx.ConnectError, httpx.TimeoutException
        For network-level failures (caller should translate to 502/504).
    """
    url = f"{_base_url()}{_PREFIX}{path}"
    timeout = httpx.Timeout(_timeout())

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.request(method, url, json=json)

    if response.status_code >= 400:
        detail = ""
        try:
            body = response.json()
            detail = body.get("detail", str(body))
        except Exception:
            detail = response.text[:500]
        raise DoctorAppClientError(response.status_code, detail)

    return response.json()


# -- Public helpers wrapping each DoctorAPP mobile-prep endpoint -----------

async def resolve_invite(token: str) -> dict:
    """GET /invite/{token}"""
    return await _request("GET", f"/invite/{token}")


async def start_prep(token: str) -> dict:
    """POST /{token}/start"""
    return await _request("POST", f"/{token}/start")


async def save_checkin(token: str, payload: dict) -> dict:
    """POST /{token}/save-checkin"""
    return await _request("POST", f"/{token}/save-checkin", json=payload)


async def save_documents(token: str, payload: dict) -> dict:
    """POST /{token}/save-documents"""
    return await _request("POST", f"/{token}/save-documents", json=payload)


async def save_health_data(token: str, payload: dict) -> dict:
    """POST /{token}/save-health-data"""
    return await _request("POST", f"/{token}/save-health-data", json=payload)


async def submit_prep(token: str) -> dict:
    """POST /{token}/submit"""
    return await _request("POST", f"/{token}/submit")


async def get_summary(token: str) -> dict:
    """GET /{token}/summary"""
    return await _request("GET", f"/{token}/summary")


async def get_status(token: str) -> dict:
    """GET /{token}/status"""
    return await _request("GET", f"/{token}/status")
