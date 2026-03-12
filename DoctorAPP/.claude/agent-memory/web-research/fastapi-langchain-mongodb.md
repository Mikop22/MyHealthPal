# FastAPI + LangChain + MongoDB Atlas + sentence-transformers Research Notes

Date researched: 2026-02-21

## OpenAI Model Selection for Clinical Structured Extraction

- gpt-4o-2024-08-06 is the recommended model for structured outputs (100% schema compliance on evals)
- gpt-4.1 and gpt-4.1-mini also support structured outputs as of 2025
- o-series models (o3, o4-mini) support structured outputs but add latency due to reasoning tokens - overkill for extraction tasks
- For pure extraction (not reasoning), gpt-4o hits >0.97 accuracy on clinical classification tasks per peer-reviewed 2025 studies
- GPT-4.1-mini achieved F1=55.6 on structured medical extraction benchmarks (2025)
- Recommendation: use gpt-4o (latest snapshot) with strict=True structured outputs

## LangChain with_structured_output Gotchas

- Use `.with_structured_output(MyModel, method="json_schema", strict=True)`
- strict=True requires ALL fields to be marked required in the JSON schema
- Pydantic v2 Optional[T] generates "anyOf" with null - this BREAKS OpenAI strict mode
- Fix: use `Union[T, None] = None` and ensure all fields appear in `required` array
- LangChain issue #28106: LangChain incorrectly handles Union types in strict mode schema generation
- Workaround: use `include_raw=True` to get both raw and parsed output for debugging

## MongoDB Atlas $vectorSearch

- Must be the FIRST stage in the aggregation pipeline (cannot have stages before it)
- Requires a dedicated Vector Search index (Atlas UI or Atlas CLI, NOT standard Mongo index)
- Index definition needs: field path, numDimensions, similarity metric (cosine/euclidean/dotProduct)
- numCandidates: recommended 10-20x the limit; controls ANN recall vs latency tradeoff
- filter parameter: supports MQL operators ($eq, $in, $gte, etc.) on non-vector indexed fields
- The filter fields must also be indexed in the vector search index definition
- 2025 GA feature: Views support - pre-filter/transform documents before vector indexing
- Hybrid search: combine $vectorSearch + $search with reciprocal rank fusion

## sentence-transformers / lokeshch19/ModernPubMedBERT

- Model: fine-tuned from thomas-sounack/BioClinical-ModernBERT-base
- Training: InfoNCE contrastive learning on PubMed title-abstract pairs
- Context: 2048 token max sequence length (vs 512 for classic BERT)
- Embedding dimensions: likely 768 (base variant of ModernBERT), verify with model.get_sentence_embedding_dimension()
- Similarity: cosine is standard for sentence-transformers models
- TOKENIZERS_PARALLELISM deadlock: set os.environ["TOKENIZERS_PARALLELISM"] = "false" BEFORE any imports in main.py when using uvicorn with multiple workers
- FastAPI pattern: load model once in lifespan context manager, store in app.state

## Authoritative Sources

- OpenAI structured outputs: https://platform.openai.com/docs/guides/structured-outputs
- LangChain structured output docs: https://docs.langchain.com/oss/python/langchain/structured-output
- MongoDB $vectorSearch reference: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
- lokeshch19/ModernPubMedBERT: https://huggingface.co/lokeshch19/ModernPubMedBERT
- Clinical ModernBERT paper: https://arxiv.org/abs/2504.03964
