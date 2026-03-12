"""MongoDB Atlas hybrid search service (vector + BM25 via $rankFusion)."""

from pymongo import MongoClient
from app.config import settings


def get_mongo_client() -> MongoClient:
    """Create and return a MongoDB client."""
    return MongoClient(settings.MONGODB_URI)


def get_collection(client: MongoClient, collection_name: str = "medical_conditions"):
    """Get a collection from the configured database."""
    db = client[settings.MONGODB_DB_NAME]
    return db[collection_name]


async def search_conditions(
    client: MongoClient,
    query_vector: list,
    query_text: str = "",
    top_k: int = 5,
) -> list:
    """Run hybrid search combining $vectorSearch (semantic) and $search (BM25).

    Uses $rankFusion to merge results from both pipelines via Reciprocal
    Rank Fusion, producing more accurate matches than either alone.

    Falls back to pure vector search if query_text is empty or if
    $rankFusion is unavailable (older Atlas clusters).
    """
    collection = get_collection(client)

    if query_text:
        # Hybrid search: vector + BM25 via $rankFusion
        try:
            pipeline = [
                {
                    "$rankFusion": {
                        "input": {
                            "pipelines": {
                                "vector": [
                                    {
                                        "$vectorSearch": {
                                            "index": "vector_index",
                                            "path": "embedding",
                                            "queryVector": query_vector,
                                            "numCandidates": top_k * 20,
                                            "limit": top_k,
                                        }
                                    }
                                ],
                                "text": [
                                    {
                                        "$search": {
                                            "index": "text_index",
                                            "text": {
                                                "query": query_text,
                                                "path": [
                                                    {"value": "condition", "multi": 3.0},
                                                    "title",
                                                    "snippet",
                                                ],
                                            },
                                        }
                                    }
                                ],
                            }
                        }
                    }
                },
                {"$limit": top_k},
                {
                    "$project": {
                        "condition": 1,
                        "title": 1,
                        "snippet": 1,
                        "pmcid": 1,
                        "score": {"$meta": "score"},
                        "_id": 0,
                    }
                },
            ]
            results = list(collection.aggregate(pipeline))
            if results:
                return results
        except Exception:
            # $rankFusion may not be available — fall back to vector-only
            pass

    # Fallback: pure vector search
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": top_k * 20,
                "limit": top_k,
            }
        },
        {
            "$project": {
                "condition": 1,
                "title": 1,
                "snippet": 1,
                "pmcid": 1,
                "score": {"$meta": "vectorSearchScore"},
                "_id": 0,
            }
        },
    ]
    results = list(collection.aggregate(pipeline))
    return results
