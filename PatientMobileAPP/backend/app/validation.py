ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
JPEG_SIGNATURE = b"\xff\xd8\xff"


def _has_valid_signature(upload_file):
    upload_file.file.seek(0)
    header = upload_file.file.read(len(PNG_SIGNATURE))
    upload_file.file.seek(0)

    if upload_file.content_type == "image/png":
        return header.startswith(PNG_SIGNATURE)

    if upload_file.content_type == "image/jpeg":
        return header.startswith(JPEG_SIGNATURE)

    return False


def validate_image(upload_file, max_size_mb=10):
    if upload_file.content_type not in ALLOWED_MIME_TYPES:
        return "Invalid image type. Use JPEG or PNG."

    if not _has_valid_signature(upload_file):
        return "Invalid image content."

    upload_file.file.seek(0, 2)
    size_bytes = upload_file.file.tell()
    upload_file.file.seek(0)

    if size_bytes > max_size_mb * 1024 * 1024:
        return "Image too large."

    return None
