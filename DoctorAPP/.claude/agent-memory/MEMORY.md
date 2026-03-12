# Web Research Agent Memory

## Key Technology References

- FastAPI + ML model serving: use lifespan context manager for singleton model loading; set TOKENIZERS_PARALLELISM=false before imports when using uvicorn workers
- OpenAI structured outputs: gpt-4o-2024-08-06+ scores 100% on complex JSON schema compliance; strict=True requires all fields required + Optional must be Union[T, None]
- LangChain with_structured_output: pass `method="json_schema", strict=True`; Pydantic v2 Optional fields cause schema conflicts with strict mode
- MongoDB Atlas $vectorSearch: must be first stage in aggregation pipeline; numCandidates should be 10-20x the limit value; requires Atlas Search index (not standard index)
- lokeshch19/ModernPubMedBERT: fine-tuned from BioClinical-ModernBERT-base via InfoNCE on PubMed title-abstract pairs; supports 2048 token context; likely 768-dim embeddings

## Detailed Notes

See: `/Users/user/Desktop/diagnostic/.claude/agent-memory/web-research/fastapi-langchain-mongodb.md`

## Next.js 15 + Recharts Clinical Dashboard (2026-02-21)
- Next.js 15 App Router: all components are Server Components by default; opt into client with `"use client"`
- Route groups `(group)` organize routes without affecting URLs; private folders `_folder` colocate non-routable files
- Feature colocation dominant 2025 pattern: `app/(dashboard)/patients/_components/VitalsChart.tsx`
- Recharts dual-axis: `yAxisId` prop wires `YAxis` to series; `ReferenceLine` needs matching `yAxisId`
- `strokeDasharray="3 3"` on `ReferenceLine` produces dashed clinical threshold lines
- `ReferenceArea` with `fillOpacity` ideal for "normal range" zones
- Clinical palette: slate/zinc neutrals + emerald-600 (normal), amber-500 (caution), red-600 (critical)
- Tremor (tremor.so): strong Tailwind+Radix component library purpose-built for dashboards
- Accessible accordion: github.com/samuelfuchs/accessible-accordion (WCAG 2.1 AA, Next.js+Tailwind)
- Recharts Context7 library ID: `/recharts/recharts` (112 snippets, High reputation)

See: `/Users/user/Desktop/diagnostic/.claude/agent-memory/web-research/clinical-dashboard-research.md`
