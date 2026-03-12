import json
import threading
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.crowdfunding_models import (
    CampaignCreate,
    CampaignDetailResponse,
    CampaignResponse,
    ContributionCreate,
    ContributionResponse,
)
from app.crowdfunding_storage import get_data, save_data


router = APIRouter(prefix="/campaigns", tags=["crowdfunding"])
_WRITE_LOCK = threading.Lock()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_data() -> dict:
    try:
        return get_data()
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=500, detail="Could not read crowdfunding data.") from exc


def _save_data(data: dict) -> None:
    try:
        save_data(data)
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not save crowdfunding data.") from exc


def _get_campaign_or_404(data: dict, campaign_id: str) -> dict:
    for campaign in data["campaigns"]:
        if campaign["id"] == campaign_id:
            return campaign

    raise HTTPException(status_code=404, detail="Campaign not found.")


@router.post("", response_model=CampaignResponse)
def create_campaign(payload: CampaignCreate) -> CampaignResponse:
    with _WRITE_LOCK:
        data = _load_data()
        campaign = {
            "id": uuid4().hex,
            "owner_identifier": payload.owner_identifier,
            "title": payload.title,
            "description": payload.description,
            "goal_amount": payload.goal_amount,
            "status": "active",
            "deadline": payload.deadline,
            "created_at": _utc_now_iso(),
        }
        data["campaigns"].append(campaign)
        _save_data(data)
        return CampaignResponse(**campaign)


@router.get("", response_model=list[CampaignResponse])
def list_campaigns() -> list[CampaignResponse]:
    data = _load_data()
    return [CampaignResponse(**campaign) for campaign in data["campaigns"]]


@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
def get_campaign(campaign_id: str) -> CampaignDetailResponse:
    data = _load_data()
    campaign = _get_campaign_or_404(data, campaign_id)
    total_raised = sum(
        contribution["amount"]
        for contribution in data["contributions"]
        if contribution["campaign_id"] == campaign_id
    )
    return CampaignDetailResponse(**campaign, total_raised=total_raised)


@router.post("/{campaign_id}/contributions", response_model=ContributionResponse)
def create_contribution(
    campaign_id: str,
    payload: ContributionCreate,
) -> ContributionResponse:
    with _WRITE_LOCK:
        data = _load_data()
        _get_campaign_or_404(data, campaign_id)

        contribution = {
            "id": uuid4().hex,
            "campaign_id": campaign_id,
            "contributor_identifier": payload.contributor_identifier,
            "amount": payload.amount,
            "message": payload.message,
            "created_at": _utc_now_iso(),
        }
        data["contributions"].append(contribution)
        _save_data(data)
        return ContributionResponse(**contribution)


@router.get("/{campaign_id}/contributions", response_model=list[ContributionResponse])
def list_contributions(campaign_id: str) -> list[ContributionResponse]:
    data = _load_data()
    _get_campaign_or_404(data, campaign_id)
    return [
        ContributionResponse(**contribution)
        for contribution in data["contributions"]
        if contribution["campaign_id"] == campaign_id
    ]
