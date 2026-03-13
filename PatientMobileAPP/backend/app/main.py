import asyncio
import base64
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

logger = logging.getLogger(__name__)

from dotenv import load_dotenv

load_dotenv()

import app.crowdfunding as crowdfunding_module
from fastapi import FastAPI, File, Form, Request, UploadFile
from pydantic import ValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.check_in import router as check_in_router
from app.labels import router as labels_router
from app.prep import router as prep_router
from app.doctorapp_client import close_client as _close_doctorapp_client
from app.triage import router as triage_router
from app.medgemma import call_medgemma
from app.parser import parse_translate_response
from app.prompt import build_messages
from app.schemas import TranslateResponse
from app.validation import validate_image


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await _close_doctorapp_client()


app = FastAPI(title="MyHealthPal Document Translator", lifespan=lifespan)
# Allow any localhost / 127.0.0.1 origin (any port) for local dev (Expo, Vite, etc.)
_cors_origin_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(crowdfunding_module.router)
app.include_router(check_in_router)
app.include_router(labels_router)
app.include_router(prep_router)
app.include_router(triage_router)


@app.exception_handler(RequestValidationError)
async def handle_request_validation_error(request: Request, exc: RequestValidationError):
    if request.url.path.startswith("/campaigns"):
        errors = exc.errors()
        detail = errors[0]["msg"] if errors else "Invalid input."
        return JSONResponse(status_code=400, content={"detail": detail})
    if request.url.path == "/translate":
        return JSONResponse(status_code=400, content={"error": "Image is required."})

    return await request_validation_exception_handler(request, exc)

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _max_image_size_mb() -> int:
    configured_value = os.environ.get("MAX_IMAGE_SIZE_MB", "10")
    try:
        max_size_mb = int(configured_value)
    except (TypeError, ValueError):
        return 10

    return max_size_mb if max_size_mb > 0 else 10


def _translate_error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": message})


@app.post("/translate", response_model=TranslateResponse)
async def translate(
    image: UploadFile = File(...),
    culture: Optional[str] = Form(None),
    diet: Optional[str] = Form(None),
    biometrics: Optional[str] = Form(None),
) -> TranslateResponse:
    validation_error = validate_image(image, max_size_mb=_max_image_size_mb())
    if validation_error:
        return _translate_error(400, validation_error)

    image_bytes = await image.read()
    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    messages = build_messages(
        image_b64=image_b64,
        image_media_type=image.content_type,
        culture=culture,
        diet=diet,
        biometrics=biometrics,
    )

    try:
        llm_output = await asyncio.to_thread(
            call_medgemma,
            messages=messages,
            image_b64=image_b64,
            image_media_type=image.content_type,
        )
    except TimeoutError as exc:
        return _translate_error(504, "Upstream service timed out.")
    except (RuntimeError, ValueError) as exc:
        return _translate_error(502, "Upstream service unavailable.")

    parsed = parse_translate_response(llm_output)
    if parsed is None:
        snippet = (llm_output or "")[:800].replace("\n", " ")
        logger.warning("Translate parse failed. LLM output snippet: %s", snippet)
        return _translate_error(500, "Could not process document")

    try:
        return TranslateResponse(**parsed)
    except ValidationError as e:
        logger.warning("Translate response validation failed: %s", e)
        return _translate_error(500, "Could not process document")
