import threading
import time
from typing import Optional

from fastapi.testclient import TestClient

from app.crowdfunding_models import CampaignCreate
import app.main as main_module
from app.main import app


client = TestClient(app)


@app.get("/_validation-scope-check")
def validation_scope_check(count: int):
    return {"count": count}


def _create_campaign(payload: Optional[dict] = None):
    campaign_payload = {
        "owner_identifier": "wallet-123",
        "title": "Kidney treatment fund",
        "description": "Helping with medical bills",
        "goal_amount": 5000,
        "deadline": "2025-04-01",
    }
    if payload:
        campaign_payload.update(payload)

    return client.post("/campaigns", json=campaign_payload)


def test_create_campaign_and_list_campaigns(monkeypatch, tmp_path):
    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(tmp_path / "crowdfunding.json"))

    create_response = _create_campaign()

    assert create_response.status_code == 200
    created_campaign = create_response.json()
    assert created_campaign["id"]
    assert created_campaign["status"] == "active"
    assert created_campaign["title"] == "Kidney treatment fund"
    assert created_campaign["created_at"]

    list_response = client.get("/campaigns")

    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed) == 1
    assert listed[0]["id"] == created_campaign["id"]
    assert listed[0]["title"] == created_campaign["title"]
    assert listed[0]["total_raised"] == 0.0


def test_get_campaign_by_id_returns_total_raised(monkeypatch, tmp_path):
    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(tmp_path / "crowdfunding.json"))

    campaign_id = _create_campaign().json()["id"]
    contribution_response = client.post(
        f"/campaigns/{campaign_id}/contributions",
        json={
            "contributor_identifier": "donor-1",
            "amount": 75,
            "message": "Wishing you healing",
        },
    )

    assert contribution_response.status_code == 200

    response = client.get(f"/campaigns/{campaign_id}")

    assert response.status_code == 200
    assert response.json()["id"] == campaign_id
    assert response.json()["total_raised"] == 75


def test_campaign_routes_return_404_for_unknown_campaign(monkeypatch, tmp_path):
    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(tmp_path / "crowdfunding.json"))

    assert client.get("/campaigns/missing-campaign").status_code == 404
    assert client.post(
        "/campaigns/missing-campaign/contributions",
        json={"contributor_identifier": "donor-1", "amount": 25, "message": "Good luck"},
    ).status_code == 404
    assert client.get("/campaigns/missing-campaign/contributions").status_code == 404


def test_create_and_list_contributions_for_campaign(monkeypatch, tmp_path):
    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(tmp_path / "crowdfunding.json"))

    campaign_id = _create_campaign().json()["id"]

    create_response = client.post(
        f"/campaigns/{campaign_id}/contributions",
        json={
            "contributor_identifier": "donor-1",
            "amount": 25,
            "message": "Good luck",
        },
    )

    assert create_response.status_code == 200
    created_contribution = create_response.json()
    assert created_contribution["id"]
    assert created_contribution["campaign_id"] == campaign_id
    assert created_contribution["amount"] == 25

    list_response = client.get(f"/campaigns/{campaign_id}/contributions")

    assert list_response.status_code == 200
    assert list_response.json() == [created_contribution]


def test_invalid_campaign_input_returns_400(monkeypatch, tmp_path):
    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(tmp_path / "crowdfunding.json"))

    response = _create_campaign({"title": " ", "goal_amount": -1})

    assert response.status_code == 400


def test_invalid_campaign_deadline_returns_400(monkeypatch, tmp_path):
    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(tmp_path / "crowdfunding.json"))

    response = _create_campaign({"deadline": "not-a-date"})

    assert response.status_code == 400


def test_invalid_contribution_input_returns_400(monkeypatch, tmp_path):
    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(tmp_path / "crowdfunding.json"))
    campaign_id = _create_campaign().json()["id"]

    response = client.post(
        f"/campaigns/{campaign_id}/contributions",
        json={"contributor_identifier": "donor-1", "amount": -5, "message": "Good luck"},
    )

    assert response.status_code == 400


def test_campaign_read_failures_return_500(monkeypatch, tmp_path):
    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(tmp_path / "crowdfunding.json"))

    def raise_read_error():
        raise OSError("boom")

    monkeypatch.setattr(main_module.crowdfunding_module, "get_data", raise_read_error)

    response = client.get("/campaigns")

    assert response.status_code == 500


def test_campaign_write_failures_return_500(monkeypatch, tmp_path):
    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(tmp_path / "crowdfunding.json"))

    def raise_write_error(data):
        raise OSError("boom")

    monkeypatch.setattr(main_module.crowdfunding_module, "save_data", raise_write_error)

    response = _create_campaign()

    assert response.status_code == 500


def test_malformed_crowdfunding_storage_returns_500(monkeypatch, tmp_path):
    data_path = tmp_path / "crowdfunding.json"

    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(data_path))
    data_path.write_text('{"foo": []}', encoding="utf-8")

    response = client.get("/campaigns")

    assert response.status_code == 500
    assert response.json() == {"detail": "Could not read crowdfunding data."}


def test_non_crowdfunding_validation_errors_keep_default_422():
    response = client.get("/_validation-scope-check", params={"count": "bad"})

    assert response.status_code == 422


def test_create_campaign_serializes_overlapping_writes(monkeypatch):
    load_call_count = 0
    save_call_count = 0
    first_save_started = threading.Event()
    release_first_save = threading.Event()

    def fake_load_data():
        nonlocal load_call_count
        load_call_count += 1
        return {"campaigns": [], "contributions": []}

    def fake_save_data(data):
        nonlocal save_call_count
        save_call_count += 1
        if save_call_count == 1:
            first_save_started.set()
            assert release_first_save.wait(timeout=1), "timed out waiting to release first save"

    monkeypatch.setattr(main_module.crowdfunding_module, "_load_data", fake_load_data)
    monkeypatch.setattr(main_module.crowdfunding_module, "_save_data", fake_save_data)

    first_payload = CampaignCreate(
        owner_identifier="wallet-1",
        title="Campaign one",
        description="Description one",
        goal_amount=10,
        deadline="2025-04-01",
    )
    second_payload = CampaignCreate(
        owner_identifier="wallet-2",
        title="Campaign two",
        description="Description two",
        goal_amount=20,
        deadline="2025-04-02",
    )

    first_thread = threading.Thread(
        target=main_module.crowdfunding_module.create_campaign,
        args=(first_payload,),
    )
    second_thread = threading.Thread(
        target=main_module.crowdfunding_module.create_campaign,
        args=(second_payload,),
    )

    first_thread.start()
    assert first_save_started.wait(timeout=1), "first create_campaign call did not reach save"

    second_thread.start()
    time.sleep(0.1)

    assert load_call_count == 1

    release_first_save.set()
    first_thread.join(timeout=1)
    second_thread.join(timeout=1)
