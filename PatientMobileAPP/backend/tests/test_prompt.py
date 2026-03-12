from app.prompt import build_messages


def test_build_messages_includes_context_and_format_rules():
    messages = build_messages(
        image_b64="encoded-image",
        image_media_type="image/png",
        culture="Mexican",
        diet="vegetarian",
        biometrics='{"steps": 9000}',
    )

    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"

    user_text = messages[1]["content"][0]["text"]
    assert "Mexican" in user_text
    assert "vegetarian" in user_text
    assert '{"steps": 9000}' in user_text
    assert "Between 3 and 5 bullet points" in user_text
    assert "NUTRITIONAL_SWAP:" in user_text
    assert "6th-grade reading level" in user_text
    assert messages[1]["content"][1]["image_url"]["url"].startswith("data:image/png;base64,")


def test_build_messages_falls_back_to_not_provided():
    messages = build_messages(image_b64="encoded-image", image_media_type="image/jpeg")

    user_text = messages[1]["content"][0]["text"]
    assert "culture/cuisine: Not provided" in user_text
    assert "diet: Not provided" in user_text
    assert "biometrics: Not provided" in user_text


def test_build_messages_system_prompt_is_educational():
    messages = build_messages(image_b64="x", image_media_type="image/png")
    system = messages[0]["content"]
    assert "health-literacy" in system
    assert "never diagnose" in system.lower() or "never diagnose" in system
