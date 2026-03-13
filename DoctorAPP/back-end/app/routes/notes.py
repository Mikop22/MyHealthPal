"""Notes routes — CRUD operations for clinical notes."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from app.models.notes import ClinicalNote, ClinicalNoteCreate, ClinicalNoteUpdate

router = APIRouter(prefix="/api/v1", tags=["notes"])


@router.get("/patients/{patient_id}/notes", response_model=list[ClinicalNote])
async def list_notes(patient_id: str, request: Request):
    """Return all notes for a patient, ordered by updated_at descending."""
    db = request.app.state.mongo_client[request.app.state.db_name]
    cursor = db.notes.find({"patient_id": patient_id}, {"_id": 0}).sort(
        "updated_at", -1
    )
    return [ClinicalNote(**doc) for doc in cursor]


@router.post("/patients/{patient_id}/notes", response_model=ClinicalNote)
async def create_note(patient_id: str, body: ClinicalNoteCreate, request: Request):
    """Create a new clinical note for a patient."""
    db = request.app.state.mongo_client[request.app.state.db_name]

    now = datetime.now(timezone.utc).isoformat()
    note = ClinicalNote(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        appointment_id=body.appointment_id,
        content=body.content,
        created_at=now,
        updated_at=now,
    )
    db.notes.insert_one(note.model_dump())
    return note


@router.put(
    "/patients/{patient_id}/notes/{note_id}", response_model=ClinicalNote
)
async def update_note(
    patient_id: str,
    note_id: str,
    body: ClinicalNoteUpdate,
    request: Request,
):
    """Update a clinical note's content."""
    db = request.app.state.mongo_client[request.app.state.db_name]

    existing = db.notes.find_one(
        {"id": note_id, "patient_id": patient_id}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")

    now = datetime.now(timezone.utc).isoformat()
    db.notes.update_one(
        {"id": note_id},
        {"$set": {"content": body.content, "updated_at": now}},
    )

    existing["content"] = body.content
    existing["updated_at"] = now
    return ClinicalNote(**existing)


@router.delete("/patients/{patient_id}/notes/{note_id}")
async def delete_note(patient_id: str, note_id: str, request: Request):
    """Delete a clinical note."""
    db = request.app.state.mongo_client[request.app.state.db_name]

    result = db.notes.delete_one({"id": note_id, "patient_id": patient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")

    return {"status": "deleted"}
