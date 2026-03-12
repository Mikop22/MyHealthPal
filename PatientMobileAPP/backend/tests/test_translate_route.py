from io import BytesIO

from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app


client = TestClient(app)


def test_translate_returns_400_when_image_is_missing():
    response = client.post("/translate")

    assert response.status_code == 400
    assert response.json() == {"error": "Image is required."}


def test_translate_returns_400_for_invalid_image_type():
    response = client.post(
        "/translate",
        files={"image": ("note.txt", BytesIO(b"hello"), "text/plain")},
    )

    assert response.status_code == 400
    assert response.json() == {"error": "Invalid image type. Use JPEG or PNG."}


def test_translate_returns_400_for_malformed_image_bytes():
    response = client.post(
        "/translate",
        files={"image": ("scan.png", BytesIO(b"not-a-real-png"), "image/png")},
    )

    assert response.status_code == 400
    assert response.json() == {"error": "Invalid image content."}


def test_translate_openapi_marks_image_as_required():
    response = client.get("/openapi.json")

    assert response.status_code == 200

    openapi = response.json()
    request_body = openapi["paths"]["/translate"]["post"]["requestBody"]
    schema_ref = request_body["content"]["multipart/form-data"]["schema"]["$ref"]
    schema_name = schema_ref.rsplit("/", 1)[-1]
    schema = openapi["components"]["schemas"][schema_name]

    assert request_body["required"] is True
    assert "image" in schema["required"]


def test_translate_uses_asyncio_to_thread_for_llm_call(monkeypatch):
    calls = {}

    def fake_medgemma(*args, **kwargs):
        raise AssertionError("route called sync medgemma client directly")

    async def fake_to_thread(func, *args, **kwargs):
        calls["func"] = func
        calls["kwargs"] = kwargs
        return (
            "SUMMARY:\n"
            "- One\n"
            "- Two\n"
            "- Three\n"
            "NUTRITIONAL_SWAP:\n"
            "Choose beans instead of processed chips."
        )

    monkeypatch.setattr(main_module, "call_medgemma", fake_medgemma)
    monkeypatch.setattr(main_module.asyncio, "to_thread", fake_to_thread)

    response = client.post(
        "/translate",
        files={"image": ("scan.png", BytesIO(b"\x89PNG\r\n\x1a\npayload"), "image/png")},
    )

    assert response.status_code == 200
    assert calls["func"] is fake_medgemma
    assert "messages" in calls["kwargs"]
    assert "image_b64" in calls["kwargs"]
    assert "image_media_type" in calls["kwargs"]


def test_translate_uses_default_size_when_max_image_size_env_is_invalid(monkeypatch):
    monkeypatch.setenv("MAX_IMAGE_SIZE_MB", "not-an-int")
    monkeypatch.setattr(main_module, "call_medgemma", lambda *args, **kwargs: (
        "SUMMARY:\n"
        "- One\n"
        "- Two\n"
        "- Three\n"
        "NUTRITIONAL_SWAP:\n"
        "Choose beans instead of processed chips."
    ))

    response = client.post(
        "/translate",
        files={"image": ("scan.png", BytesIO(b"\x89PNG\r\n\x1a\npayload"), "image/png")},
    )

    assert response.status_code == 200


def test_translate_returns_200_with_expected_shape(monkeypatch):
    monkeypatch.setattr(main_module, "call_medgemma", lambda *args, **kwargs: (
        "SUMMARY:\n"
        "- One\n"
        "- Two\n"
        "- Three\n"
        "NUTRITIONAL_SWAP:\n"
        "Choose beans instead of processed chips."
    ))

    response = client.post(
        "/translate",
        data={"culture": "Mexican", "diet": "vegetarian"},
        files={"image": ("scan.png", BytesIO(b"\x89PNG\r\n\x1a\npayload"), "image/png")},
    )

    assert response.status_code == 200
    assert response.json() == {
        "summaryBullets": ["One", "Two", "Three"],
        "nutritionalSwap": "Choose beans instead of processed chips.",
    }


def test_translate_returns_500_when_parsing_fails(monkeypatch):
    monkeypatch.setattr(main_module, "call_medgemma", lambda *args, **kwargs: "bad output")
    monkeypatch.setattr(main_module, "parse_translate_response", lambda *args, **kwargs: None)

    response = client.post(
        "/translate",
        files={"image": ("scan.png", BytesIO(b"\x89PNG\r\n\x1a\npayload"), "image/png")},
    )

    assert response.status_code == 500
    assert response.json() == {"error": "Could not process document"}


def test_translate_returns_502_on_medgemma_error(monkeypatch):
    def raise_runtime_error(*args, **kwargs):
        raise RuntimeError("upstream failed")

    monkeypatch.setattr(main_module, "call_medgemma", raise_runtime_error)

    response = client.post(
        "/translate",
        files={"image": ("scan.png", BytesIO(b"\x89PNG\r\n\x1a\npayload"), "image/png")},
    )

    assert response.status_code == 502
    assert response.json() == {"error": "Upstream service unavailable."}


def test_translate_returns_502_on_invalid_llm_response_shape(monkeypatch):
    def raise_invalid_response(*args, **kwargs):
        raise ValueError("MedGemma response did not include text content.")

    monkeypatch.setattr(main_module, "call_medgemma", raise_invalid_response)

    response = client.post(
        "/translate",
        files={"image": ("scan.png", BytesIO(b"\x89PNG\r\n\x1a\npayload"), "image/png")},
    )

    assert response.status_code == 502
    assert response.json() == {"error": "Upstream service unavailable."}


def test_translate_returns_504_on_timeout(monkeypatch):
    def raise_timeout(*args, **kwargs):
        raise TimeoutError("timed out")

    monkeypatch.setattr(main_module, "call_medgemma", raise_timeout)

    response = client.post(
        "/translate",
        files={"image": ("scan.png", BytesIO(b"\x89PNG\r\n\x1a\npayload"), "image/png")},
    )

    assert response.status_code == 504
    assert response.json() == {"error": "Upstream service timed out."}
