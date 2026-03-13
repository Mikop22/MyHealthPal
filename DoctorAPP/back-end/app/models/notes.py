"""Pydantic models for clinical notes."""

from typing import Optional

from pydantic import BaseModel


class ClinicalNoteCreate(BaseModel):
    content: str
    appointment_id: Optional[str] = None


class ClinicalNoteUpdate(BaseModel):
    content: str


class ClinicalNote(BaseModel):
    id: str
    patient_id: str
    appointment_id: Optional[str] = None
    content: str
    created_at: str
    updated_at: str
