import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"  # MUST be before any ML imports

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.embeddings import load_embedding_model
    from app.services.vector_search import get_mongo_client
    app.state.embedding_model = load_embedding_model()
    app.state.mongo_client = get_mongo_client()
    app.state.db_name = settings.MONGODB_DB_NAME
    yield
    app.state.mongo_client.close()

app = FastAPI(title="Diagnostic API", version="0.1.0", lifespan=lifespan)
_raw = settings.ALLOWED_ORIGINS.strip()
_origins = ["*"] if _raw == "*" else [o.strip() for o in _raw.split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_credentials=_raw != "*", allow_methods=["*"], allow_headers=["*"])

from app.routes.analyze import router as analyze_router
from app.routes.paper import router as paper_router
from app.routes.patients import router as patients_router
from app.routes.appointments import router as appointments_router
from app.routes.intake import router as intake_router
from app.routes.webhook import router as webhook_router
app.include_router(analyze_router)
app.include_router(paper_router)
app.include_router(patients_router)
app.include_router(appointments_router)
app.include_router(intake_router)
app.include_router(webhook_router)

@app.get("/health")
async def health():
    return {"status": "ok"}

