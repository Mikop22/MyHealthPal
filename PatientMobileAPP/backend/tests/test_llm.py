from unittest.mock import MagicMock, patch

from app.llm import call_gpt4o_vision


@patch("app.llm.OpenAI")
def test_call_gpt4o_vision_returns_message_content(mock_openai):
    fake_response = MagicMock()
    fake_response.choices = [
        MagicMock(message=MagicMock(content="SUMMARY:\n- a\n- b\n- c\nNUTRITIONAL_SWAP:\nUse beans."))
    ]
    client = MagicMock()
    client.chat.completions.create.return_value = fake_response
    mock_openai.return_value = client

    content = call_gpt4o_vision(
        messages=[{"role": "user", "content": "hello"}],
        api_key="test-key",
        timeout_sec=12,
    )

    assert content.startswith("SUMMARY:")
    mock_openai.assert_called_once_with(api_key="test-key")
    client.chat.completions.create.assert_called_once_with(
        model="gpt-4o",
        messages=[{"role": "user", "content": "hello"}],
        timeout=12,
    )


@patch("app.llm.OpenAI")
def test_call_gpt4o_vision_raises_when_choices_are_missing(mock_openai):
    fake_response = MagicMock()
    fake_response.choices = []
    client = MagicMock()
    client.chat.completions.create.return_value = fake_response
    mock_openai.return_value = client

    try:
        call_gpt4o_vision(messages=[{"role": "user", "content": "hello"}], api_key="test-key")
    except ValueError as exc:
        assert str(exc) == "OpenAI response did not include any choices."
    else:
        raise AssertionError("Expected ValueError for missing choices")


@patch("app.llm.OpenAI")
def test_call_gpt4o_vision_handles_structured_text_content(mock_openai):
    fake_response = MagicMock()
    fake_response.choices = [
        MagicMock(
            message=MagicMock(
                content=[
                    {"type": "text", "text": "SUMMARY:\n- a\n- b\n- c\n"},
                    {"type": "text", "text": "NUTRITIONAL_SWAP:\nUse beans."},
                ]
            )
        )
    ]
    client = MagicMock()
    client.chat.completions.create.return_value = fake_response
    mock_openai.return_value = client

    content = call_gpt4o_vision(
        messages=[{"role": "user", "content": "hello"}],
        api_key="test-key",
    )

    assert content == "SUMMARY:\n- a\n- b\n- c\nNUTRITIONAL_SWAP:\nUse beans."


@patch("app.llm.OpenAI")
def test_call_gpt4o_vision_raises_when_content_is_empty(mock_openai):
    fake_response = MagicMock()
    fake_response.choices = [MagicMock(message=MagicMock(content=None))]
    client = MagicMock()
    client.chat.completions.create.return_value = fake_response
    mock_openai.return_value = client

    try:
        call_gpt4o_vision(messages=[{"role": "user", "content": "hello"}], api_key="test-key")
    except ValueError as exc:
        assert str(exc) == "OpenAI response did not include text content."
    else:
        raise AssertionError("Expected ValueError for empty content")
