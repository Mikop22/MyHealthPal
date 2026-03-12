import json
import os

import boto3


def _endpoint_name() -> str:
    """SageMaker endpoint name (set via SAGEMAKER_ENDPOINT_NAME)."""
    name = os.environ.get("SAGEMAKER_ENDPOINT_NAME", "").strip()
    if not name:
        raise ValueError(
            "Configure MedGemma by setting SAGEMAKER_ENDPOINT_NAME "
            "(e.g. 'medgemma-endpoint') in your environment."
        )
    return name


def _region() -> str:
    return os.environ.get("AWS_REGION", "us-east-1")


def _max_new_tokens() -> int:
    raw_value = os.environ.get("MEDGEMMA_MAX_NEW_TOKENS", "2048")
    try:
        parsed = int(raw_value)
    except (TypeError, ValueError):
        return 2048
    return parsed if parsed > 0 else 2048


def _get_sagemaker_client():
    """Create a boto3 SageMaker Runtime client."""
    return boto3.client("sagemaker-runtime", region_name=_region())


# ── Prompt formatting ────────────────────────────────────────────────────────
# Convert OpenAI-style messages array into the Gemma chat template that the
# TGI container on SageMaker expects.


def _extract_text_from_content(content) -> str:
    """Pull plain text out of an OpenAI 'content' field (string or list)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                parts.append(part.get("text", ""))
        return "\n".join(parts)
    return ""


def _format_prompt(messages, image_b64: str, image_media_type: str) -> str:
    """
    Build a Gemma chat-template prompt from OpenAI-style messages.

    Images are embedded inline using TGI's markdown syntax:
        ![](data:image/png;base64,<data>)

    The image is prepended to the first user turn.
    """
    prompt = ""
    image_injected = False

    for msg in messages:
        role = msg.get("role", "user")
        text = _extract_text_from_content(msg.get("content", ""))

        if role == "system":
            # Gemma doesn't have a system role — prepend as a user turn
            prompt += f"<start_of_turn>user\n{text}<end_of_turn>\n"
        elif role == "user":
            if not image_injected and image_b64:
                # Embed the image inline before the user text
                image_md = f"![](data:{image_media_type};base64,{image_b64})"
                text = f"{image_md}\n{text}"
                image_injected = True
            prompt += f"<start_of_turn>user\n{text}<end_of_turn>\n"
        elif role == "assistant":
            prompt += f"<start_of_turn>model\n{text}<end_of_turn>\n"

    # Signal the model to generate
    prompt += "<start_of_turn>model\n"
    return prompt


def _build_payload(prompt: str, max_new_tokens: int) -> str:
    """Build TGI-style JSON payload for SageMaker."""
    return json.dumps({
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": max_new_tokens,
            "temperature": 0.7,
            "return_full_text": False,
        },
    })


# ── Response parsing ─────────────────────────────────────────────────────────


def _strip_thinking(text: str) -> str:
    """
    Remove chain-of-thought output from MedGemma.

    MedGemma wraps reasoning in <unused94>thought ... <unused95> tokens.
    We strip everything up to and including the last boundary marker and
    only surface the final answer.
    """
    # <unused95> marks the end of thinking — take everything after it
    end_marker = "<unused95>"
    idx = text.rfind(end_marker)
    if idx != -1:
        text = text[idx + len(end_marker):]
    else:
        # No end marker: strip from <unused94> start marker if present
        start_marker = "<unused94>"
        idx = text.find(start_marker)
        if idx != -1:
            text = text[:idx]

    text = text.replace("<end_of_turn>", "")
    return text.strip()


def _extract_generated_text(response_body: bytes) -> str:
    """Parse the TGI response and pull out the generated text."""
    try:
        parsed = json.loads(response_body)
    except json.JSONDecodeError:
        raise ValueError("MedGemma response did not include text content.") from None

    # TGI returns either { generated_text: ... } or [{ generated_text: ... }]
    if isinstance(parsed, dict) and parsed.get("generated_text"):
        return _strip_thinking(parsed["generated_text"])
    if isinstance(parsed, list) and parsed and parsed[0].get("generated_text"):
        return _strip_thinking(parsed[0]["generated_text"])

    raise ValueError("MedGemma response did not include text content.")


# ── SageMaker invocation ─────────────────────────────────────────────────────


def _invoke_sagemaker(client, endpoint_name: str, payload: str) -> str:
    """Call SageMaker InvokeEndpoint and return the generated text."""
    try:
        response = client.invoke_endpoint(
            EndpointName=endpoint_name,
            ContentType="application/json",
            Accept="application/json",
            Body=payload.encode("utf-8"),
        )
    except client.exceptions.ModelError as exc:
        raise RuntimeError(f"SageMaker model error: {exc}") from exc
    except Exception as exc:
        msg = str(exc).lower()
        if "timed out" in msg or "timeout" in msg:
            raise TimeoutError("MedGemma SageMaker request timed out.") from exc
        raise RuntimeError(f"SageMaker invocation failed: {exc}") from exc

    body = response["Body"].read()
    return _extract_generated_text(body)


# ── Public API ───────────────────────────────────────────────────────────────


def call_medgemma(messages, image_b64: str, image_media_type: str) -> str:
    """
    Call MedGemma via the AWS SageMaker endpoint.

    Parameters match the old Featherless-based signature so the rest of the
    app (main.py, prompt.py) does not need to change.
    """
    endpoint_name = _endpoint_name()
    prompt = _format_prompt(messages, image_b64, image_media_type)
    payload = _build_payload(prompt, _max_new_tokens())
    client = _get_sagemaker_client()
    return _invoke_sagemaker(client, endpoint_name, payload)
