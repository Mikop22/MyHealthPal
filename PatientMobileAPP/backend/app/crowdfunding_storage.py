import json
import os
import tempfile
from pathlib import Path


EMPTY_DATA = {"campaigns": [], "contributions": []}


def _data_path() -> Path:
    configured_path = os.environ.get("CROWDFUNDING_DATA_PATH")
    if configured_path:
        return Path(configured_path)

    return Path(__file__).resolve().parent.parent / "data" / "crowdfunding.json"


def _empty_data() -> dict:
    return {"campaigns": [], "contributions": []}


def _validate_data_shape(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ValueError("Invalid crowdfunding data shape.")

    if set(data.keys()) != {"campaigns", "contributions"}:
        raise ValueError("Invalid crowdfunding data shape.")

    if not isinstance(data["campaigns"], list) or not isinstance(data["contributions"], list):
        raise ValueError("Invalid crowdfunding data shape.")

    return data


def get_data() -> dict:
    data_path = _data_path()
    if not data_path.exists():
        return _empty_data()

    with data_path.open("r", encoding="utf-8") as file:
        return _validate_data_shape(json.load(file))


def save_data(data: dict) -> None:
    validated_data = _validate_data_shape(data)
    data_path = _data_path()
    data_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=data_path.parent,
            delete=False,
        ) as file:
            temp_path = Path(file.name)
            json.dump(validated_data, file, indent=2)
            file.flush()
            os.fsync(file.fileno())

        os.replace(temp_path, data_path)
    except Exception:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()
        raise
