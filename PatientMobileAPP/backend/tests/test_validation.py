import io

from app.validation import validate_image


class FakeUploadFile:
    def __init__(self, content_type, data):
        self.content_type = content_type
        self.file = io.BytesIO(data)


def test_validate_image_rejects_missing_content_type():
    error = validate_image(FakeUploadFile(None, b"abc"))

    assert error == "Invalid image type. Use JPEG or PNG."


def test_validate_image_rejects_oversized_payload():
    error = validate_image(
        FakeUploadFile("image/png", b"\x89PNG\r\n\x1a\n" + b"x" * (1024 * 1024 + 1)),
        max_size_mb=1,
    )

    assert error == "Image too large."


def test_validate_image_accepts_supported_type_within_size_limit():
    error = validate_image(FakeUploadFile("image/jpeg", b"\xff\xd8\xff" + b"x" * 10))

    assert error is None


def test_validate_image_rejects_malformed_png_bytes():
    error = validate_image(FakeUploadFile("image/png", b"not-a-real-png"))

    assert error == "Invalid image content."
