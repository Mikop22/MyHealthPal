#!/usr/bin/env python3
"""
Smoke-test the SageMaker MedGemma endpoint with one image.

Usage (from backend directory):
  python scripts/smoke_test_medgemma_endpoint.py [path/to/image.png]

If no image path is given, a tiny placeholder PNG is used so you can verify
the endpoint responds (payload shape may still need to match the container).
"""

import base64
import os
import sys

# Allow importing app when run from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from app.medgemma import call_medgemma
from app.parser import parse_translate_response
from app.prompt import build_messages


def _tiny_png_bytes():
    """Minimal valid PNG (1x1 transparent)."""
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )


def main():
    if len(sys.argv) >= 2:
        path = sys.argv[1]
        if not os.path.isfile(path):
            print(f"Not a file: {path}", file=sys.stderr)
            sys.exit(1)
        with open(path, "rb") as f:
            image_bytes = f.read()
        media_type = "image/png" if path.lower().endswith(".png") else "image/jpeg"
    else:
        image_bytes = _tiny_png_bytes()
        media_type = "image/png"
        print("No image path given; using tiny placeholder PNG.", file=sys.stderr)

    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    messages = build_messages(
        image_b64=image_b64,
        image_media_type=media_type,
        culture="Not provided",
        diet="Not provided",
        biometrics="Not provided",
    )

    if not os.environ.get("MEDGEMMA_BASE_URL", "").strip() and not os.environ.get("SAGEMAKER_ENDPOINT_NAME", "").strip():
        print("Set MEDGEMMA_BASE_URL (e.g. http://localhost:8001) or SAGEMAKER_ENDPOINT_NAME in .env", file=sys.stderr)
        sys.exit(1)

    print("Calling MedGemma...")
    print("-" * 60)

    try:
        text = call_medgemma(
            messages=messages,
            image_b64=image_b64,
            image_media_type=media_type,
        )
    except Exception as e:
        print(f"Endpoint call failed: {e}", file=sys.stderr)
        sys.exit(2)

    print("Raw model output:")
    print(text)
    print("-" * 60)

    parsed = parse_translate_response(text)
    if parsed:
        print("Parsed response:")
        print(f"  summaryBullets: {parsed.get('summaryBullets', [])}")
        print(f"  nutritionalSwap: {parsed.get('nutritionalSwap', '')}")
    else:
        print("(Parser could not extract summaryBullets/nutritionalSwap from this output.)")


if __name__ == "__main__":
    main()
