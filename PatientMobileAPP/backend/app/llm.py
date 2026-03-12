import os

from openai import OpenAI


def call_gpt4o_text(messages, api_key=None, timeout_sec=60):
    client = OpenAI(api_key=api_key or os.environ.get("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        timeout=timeout_sec,
    )
    if not response.choices:
        raise ValueError("OpenAI response did not include any choices.")

    return _extract_message_text(response.choices[0].message.content)


def _extract_message_text(content):
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text" and isinstance(part.get("text"), str):
                text_parts.append(part["text"])

        if text_parts:
            return "".join(text_parts)

    raise ValueError("OpenAI response did not include text content.")


def call_gpt4o_vision(messages, api_key=None, timeout_sec=60):
    return call_gpt4o_text(messages=messages, api_key=api_key, timeout_sec=timeout_sec)
