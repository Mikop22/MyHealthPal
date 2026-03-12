"""GET /api/v1/paper/{pmcid} — proxy PDF from Europe PMC with caching."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx

router = APIRouter(prefix="/api/v1", tags=["papers"])

# Simple in-memory PDF cache: pmcid -> bytes
_pdf_cache: dict[str, bytes] = {}
# Track failed lookups so we don't retry them
_failed: set[str] = set()


async def _fetch_pdf(pmcid: str) -> bytes:
    """Fetch PDF bytes from Europe PMC, using cache."""
    if pmcid in _pdf_cache:
        return _pdf_cache[pmcid]
    if pmcid in _failed:
        raise HTTPException(status_code=404, detail=f"PDF not available for {pmcid}")

    url = f"https://europepmc.org/backend/ptpmcrender.fcgi?accid={pmcid}&blobtype=pdf"

    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        resp = await client.get(url)

    if resp.status_code != 200 or "pdf" not in resp.headers.get("content-type", ""):
        _failed.add(pmcid)
        raise HTTPException(status_code=404, detail=f"PDF not available for {pmcid}")

    _pdf_cache[pmcid] = resp.content
    return resp.content


@router.get("/paper/{pmcid}")
async def proxy_paper(pmcid: str):
    """Return a cached or freshly-fetched PDF for the given PMCID."""
    pdf_bytes = await _fetch_pdf(pmcid)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={pmcid}.pdf"},
    )
