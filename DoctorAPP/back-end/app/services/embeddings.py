"""PubMedBERT embedding service using sentence-transformers."""

import os
from sentence_transformers import SentenceTransformer
from app.config import settings


def load_embedding_model() -> SentenceTransformer:
    """Load the ModernPubMedBERT model, setting HF token if available."""
    if settings.HUGGINGFACE_TOKEN:
        os.environ["HF_TOKEN"] = settings.HUGGINGFACE_TOKEN
    model = SentenceTransformer("lokeshch19/ModernPubMedBERT")
    return model


def encode_text(model: SentenceTransformer, text: str) -> list:
    """Encode text into a normalized embedding vector."""
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()
