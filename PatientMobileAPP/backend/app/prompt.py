def build_messages(
    image_b64,
    image_media_type,
    culture=None,
    diet=None,
    biometrics=None,
):
    culture = culture or "Not provided"
    diet = diet or "Not provided"
    biometrics = biometrics or "Not provided"

    instructions = (
        "Look at this health-related document and help a regular person understand it.\n\n"
        "Write 3 to 5 bullet points that:\n"
        "1. Start by saying what kind of document this is (e.g. \"This is a blood test report\").\n"
        "2. Explain any medical terms in everyday words — for example, say "
        "\"cholesterol (a fat in your blood)\" instead of just \"cholesterol\".\n"
        "3. Call out which results are normal and which are outside the normal range. "
        "For anything flagged, explain what it means for the person's body in simple language "
        "(e.g. \"Your blood sugar is higher than normal, which means your body may have "
        "trouble processing sugar\").\n"
        "4. End with one practical thing the person could ask their doctor about.\n\n"
        "Then suggest one concrete, affordable food swap that relates to the document's findings. "
        f"Patient context — culture/cuisine: {culture}; diet: {diet}; biometrics: {biometrics}. "
        "If no culture is given, suggest a universally accessible swap.\n\n"
        "Important: Use a 6th-grade reading level. Do NOT diagnose or prescribe — "
        "only explain what the document says and what the numbers mean.\n\n"
        "Return output in exactly this format:\n"
        "SUMMARY:\n"
        "- first bullet\n"
        "- second bullet\n"
        "- third bullet\n"
        "- (optional) fourth bullet\n"
        "- (optional) fifth bullet\n"
        "NUTRITIONAL_SWAP:\n"
        "one concrete food swap suggestion based on the document's findings.\n"
        "Between 3 and 5 bullet points are required."
    )

    return [
        {
            "role": "system",
            "content": (
                "You are a friendly health-literacy assistant. You help regular people "
                "understand medical documents by explaining them in simple, everyday language. "
                "You translate medical jargon into plain words, highlight what is normal versus "
                "what needs attention, and suggest one practical food swap. "
                "You never diagnose, prescribe, or give medical advice — you only explain "
                "what the document says so the person can have a better conversation with their doctor."
            ),
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": instructions},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{image_media_type};base64,{image_b64}"},
                },
            ],
        },
    ]
