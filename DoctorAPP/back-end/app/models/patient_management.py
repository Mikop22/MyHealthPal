"""Pydantic models for patient management and appointments."""

from pydantic import BaseModel
from typing import Union


class PatientCreate(BaseModel):
    name: str
    email: str


class PatientRecord(BaseModel):
    id: str
    name: str
    email: str
    xrp_wallet_address: str
    xrp_wallet_seed: str
    created_at: str
    status: str = "Pending"
    concern: str = ""


class AppointmentCreate(BaseModel):
    patient_id: str
    date: str
    time: str


class AppointmentRecord(BaseModel):
    id: str
    patient_id: str
    date: str
    time: str
    status: str = "scheduled"
    form_token: str
    created_at: str
