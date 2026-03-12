from app.parser import parse_translate_response


def test_parse_translate_response_returns_expected_shape():
    parsed = parse_translate_response(
        "SUMMARY:\n"
        "- First bullet\n"
        "- Second bullet\n"
        "- Third bullet\n"
        "NUTRITIONAL_SWAP:\n"
        "Try brown rice instead of white rice."
    )

    assert parsed == {
        "summaryBullets": [
            "First bullet",
            "Second bullet",
            "Third bullet",
        ],
        "nutritionalSwap": "Try brown rice instead of white rice.",
    }


def test_parse_translate_response_handles_five_bullets():
    parsed = parse_translate_response(
        "SUMMARY:\n"
        "- This is a blood test report.\n"
        "- Your cholesterol (a fat in your blood) is higher than normal.\n"
        "- Your blood sugar level is within a healthy range.\n"
        "- Your kidney numbers look good.\n"
        "- Ask your doctor about ways to lower cholesterol.\n"
        "NUTRITIONAL_SWAP:\n"
        "Try oatmeal for breakfast instead of sugary cereal — it can help lower cholesterol."
    )

    assert len(parsed["summaryBullets"]) == 5
    assert "blood test report" in parsed["summaryBullets"][0]
    assert "oatmeal" in parsed["nutritionalSwap"]


def test_parse_translate_response_pads_fewer_than_three_bullets():
    parsed = parse_translate_response(
        "SUMMARY:\n"
        "- Only one bullet here\n"
        "NUTRITIONAL_SWAP:\n"
        "Eat more vegetables."
    )

    assert parsed is not None
    assert len(parsed["summaryBullets"]) == 3
    assert parsed["summaryBullets"][0] == "Only one bullet here"
