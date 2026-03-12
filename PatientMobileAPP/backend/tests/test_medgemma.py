import json
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest

from app.medgemma import (
    _build_payload,
    _extract_generated_text,
    _extract_text_from_content,
    _format_prompt,
    _max_new_tokens,
    _strip_thinking,
    call_medgemma,
)


# ── _extract_text_from_content ───────────────────────────────────────────────


def test_extract_text_from_string():
    assert _extract_text_from_content("hello") == "hello"


def test_extract_text_from_content_list():
    content = [
        {"type": "text", "text": "first"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,abc"}},
        {"type": "text", "text": "second"},
    ]
    assert _extract_text_from_content(content) == "first\nsecond"


# ── _format_prompt ───────────────────────────────────────────────────────────


def test_format_prompt_builds_gemma_template_with_image():
    messages = [
        {"role": "system", "content": "You are a summarizer."},
        {"role": "user", "content": [{"type": "text", "text": "Summarize this."}]},
    ]
    prompt = _format_prompt(messages, image_b64="AAAA", image_media_type="image/png")

    assert "<start_of_turn>user\nYou are a summarizer.<end_of_turn>" in prompt
    assert "![](data:image/png;base64,AAAA)" in prompt
    assert "Summarize this." in prompt
    assert prompt.endswith("<start_of_turn>model\n")


def test_format_prompt_without_image():
    messages = [{"role": "user", "content": "Hi"}]
    prompt = _format_prompt(messages, image_b64="", image_media_type="")

    assert "![](data:" not in prompt
    assert "<start_of_turn>user\nHi<end_of_turn>" in prompt


def test_format_prompt_multi_turn():
    messages = [
        {"role": "user", "content": "What is this?"},
        {"role": "assistant", "content": "It is a lab report."},
        {"role": "user", "content": "Summarize it."},
    ]
    prompt = _format_prompt(messages, image_b64="", image_media_type="")

    assert "<start_of_turn>model\nIt is a lab report.<end_of_turn>" in prompt
    assert prompt.count("<start_of_turn>user") == 2


# ── _strip_thinking ─────────────────────────────────────────────────────────


def test_strip_thinking_removes_unused95_marker():
    text = "internal reasoning here<unused95>The actual answer."
    assert _strip_thinking(text) == "The actual answer."


def test_strip_thinking_removes_unused94_start_marker():
    text = "Some prefix<unused94>thought\nlong reasoning that got cut off"
    assert _strip_thinking(text) == "Some prefix"


def test_strip_thinking_handles_both_markers():
    text = "<unused94>thought\nlong reasoning<unused95>SUMMARY:\n- bullet"
    assert _strip_thinking(text) == "SUMMARY:\n- bullet"


def test_strip_thinking_removes_end_of_turn():
    text = "Some response<end_of_turn>"
    assert _strip_thinking(text) == "Some response"


def test_strip_thinking_plain_text_unchanged():
    assert _strip_thinking("hello world") == "hello world"


# ── _build_payload ───────────────────────────────────────────────────────────


def test_build_payload_produces_tgi_shape():
    payload = json.loads(_build_payload("prompt text", max_new_tokens=256))

    assert payload["inputs"] == "prompt text"
    assert payload["parameters"]["max_new_tokens"] == 256
    assert payload["parameters"]["temperature"] == 0.7
    assert payload["parameters"]["return_full_text"] is False


# ── _extract_generated_text ──────────────────────────────────────────────────


def test_extract_generated_text_from_dict():
    body = json.dumps({"generated_text": "answer"}).encode()
    assert _extract_generated_text(body) == "answer"


def test_extract_generated_text_from_array():
    body = json.dumps([{"generated_text": "answer"}]).encode()
    assert _extract_generated_text(body) == "answer"


def test_extract_generated_text_raises_on_empty():
    body = json.dumps({"other": "stuff"}).encode()
    with pytest.raises(ValueError, match="MedGemma response did not include text content"):
        _extract_generated_text(body)


def test_extract_generated_text_raises_on_bad_json():
    with pytest.raises(ValueError, match="MedGemma response did not include text content"):
        _extract_generated_text(b"not json")


# ── _max_new_tokens ──────────────────────────────────────────────────────────


def test_max_new_tokens_falls_back_to_default_for_invalid_values(monkeypatch):
    monkeypatch.setenv("MEDGEMMA_MAX_NEW_TOKENS", "bad-value")
    assert _max_new_tokens() == 2048

    monkeypatch.setenv("MEDGEMMA_MAX_NEW_TOKENS", "0")
    assert _max_new_tokens() == 2048


# ── call_medgemma (integration) ──────────────────────────────────────────────


def test_call_medgemma_invokes_sagemaker_endpoint(monkeypatch):
    monkeypatch.setenv("SAGEMAKER_ENDPOINT_NAME", "test-endpoint")
    monkeypatch.setenv("AWS_REGION", "us-east-1")

    # Mock the response body as a streaming object
    response_body = json.dumps([{"generated_text": "SUMMARY:\n- a\n- b\n- c\nNUTRITIONAL_SWAP:\nBeans."}])
    mock_stream = MagicMock()
    mock_stream.read.return_value = response_body.encode("utf-8")

    mock_client = MagicMock()
    mock_client.invoke_endpoint.return_value = {"Body": mock_stream}
    mock_client.exceptions = MagicMock()
    mock_client.exceptions.ModelError = type("ModelError", (Exception,), {})

    monkeypatch.setattr("app.medgemma._get_sagemaker_client", lambda: mock_client)

    text = call_medgemma(
        messages=[
            {"role": "system", "content": "You are a summarizer."},
            {"role": "user", "content": [{"type": "text", "text": "Summarize this."}]},
        ],
        image_b64="ZmFrZQ==",
        image_media_type="image/png",
    )

    assert text.startswith("SUMMARY:")
    mock_client.invoke_endpoint.assert_called_once()

    call_kwargs = mock_client.invoke_endpoint.call_args[1]
    assert call_kwargs["EndpointName"] == "test-endpoint"
    assert call_kwargs["ContentType"] == "application/json"

    # Verify the image was embedded in the payload
    sent_payload = json.loads(call_kwargs["Body"].decode("utf-8"))
    assert "![](data:image/png;base64,ZmFrZQ==)" in sent_payload["inputs"]


def test_call_medgemma_raises_when_no_endpoint_configured(monkeypatch):
    monkeypatch.delenv("SAGEMAKER_ENDPOINT_NAME", raising=False)

    with pytest.raises(ValueError, match="Configure MedGemma by setting SAGEMAKER_ENDPOINT_NAME"):
        call_medgemma(
            messages=[{"role": "system", "content": "hi"}],
            image_b64="ZmFrZQ==",
            image_media_type="image/png",
        )


def test_call_medgemma_raises_runtime_error_on_sagemaker_failure(monkeypatch):
    monkeypatch.setenv("SAGEMAKER_ENDPOINT_NAME", "test-endpoint")

    mock_client = MagicMock()
    ModelError = type("ModelError", (Exception,), {})
    mock_client.exceptions.ModelError = ModelError
    mock_client.invoke_endpoint.side_effect = ModelError("model failed")

    monkeypatch.setattr("app.medgemma._get_sagemaker_client", lambda: mock_client)

    with pytest.raises(RuntimeError, match="SageMaker model error"):
        call_medgemma(
            messages=[{"role": "user", "content": "test"}],
            image_b64="ZmFrZQ==",
            image_media_type="image/png",
        )


def test_call_medgemma_raises_timeout_on_sagemaker_timeout(monkeypatch):
    monkeypatch.setenv("SAGEMAKER_ENDPOINT_NAME", "test-endpoint")

    mock_client = MagicMock()
    mock_client.exceptions = MagicMock()
    mock_client.exceptions.ModelError = type("ModelError", (Exception,), {})
    mock_client.invoke_endpoint.side_effect = Exception("Connection timed out")

    monkeypatch.setattr("app.medgemma._get_sagemaker_client", lambda: mock_client)

    with pytest.raises(TimeoutError, match="timed out"):
        call_medgemma(
            messages=[{"role": "user", "content": "test"}],
            image_b64="ZmFrZQ==",
            image_media_type="image/png",
        )
