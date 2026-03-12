import json

import app.crowdfunding_storage as storage_module
from app.crowdfunding_storage import EMPTY_DATA, get_data, save_data


def test_get_data_returns_empty_structure_when_file_is_missing(monkeypatch, tmp_path):
    data_path = tmp_path / "crowdfunding.json"

    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(data_path))

    assert get_data() == EMPTY_DATA
    assert not data_path.exists()


def test_save_data_persists_campaigns_and_contributions(monkeypatch, tmp_path):
    data_path = tmp_path / "crowdfunding.json"
    payload = {
        "campaigns": [{"id": "campaign-1", "title": "Care fund"}],
        "contributions": [{"id": "contribution-1", "campaign_id": "campaign-1"}],
    }

    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(data_path))

    save_data(payload)

    assert data_path.exists()
    assert get_data() == payload


def test_get_data_rejects_malformed_top_level_shape(monkeypatch, tmp_path):
    data_path = tmp_path / "crowdfunding.json"

    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(data_path))
    data_path.write_text(json.dumps({"foo": []}), encoding="utf-8")

    try:
        get_data()
        assert False, "expected malformed crowdfunding data to be rejected"
    except ValueError as exc:
        assert str(exc) == "Invalid crowdfunding data shape."


def test_save_data_rejects_malformed_top_level_shape(monkeypatch, tmp_path):
    data_path = tmp_path / "crowdfunding.json"

    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(data_path))

    try:
        save_data({"campaigns": []})
        assert False, "expected malformed crowdfunding data to be rejected"
    except ValueError as exc:
        assert str(exc) == "Invalid crowdfunding data shape."


def test_save_data_keeps_existing_file_when_write_fails(monkeypatch, tmp_path):
    data_path = tmp_path / "crowdfunding.json"
    original_payload = {
        "campaigns": [{"id": "campaign-1", "title": "Original"}],
        "contributions": [],
    }

    monkeypatch.setenv("CROWDFUNDING_DATA_PATH", str(data_path))
    save_data(original_payload)

    def partial_dump(data, file_obj, indent):
        file_obj.write('{"campaigns": [')
        raise OSError("interrupted write")

    monkeypatch.setattr(storage_module.json, "dump", partial_dump)

    try:
        save_data({"campaigns": [{"id": "campaign-2"}], "contributions": []})
        assert False, "expected save_data to raise when atomic write fails"
    except OSError as exc:
        assert str(exc) == "interrupted write"

    assert get_data() == original_payload
