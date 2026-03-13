"""Unit tests for the patient-safe summary generator and prep transform."""

from __future__ import annotations

import pytest

from app.models.prep_episode import (
    CheckinPayload,
    DocumentItem,
    ExtractedSymptom,
    HealthDataPayload,
    PrepEpisode,
    PrepStatus,
)
from app.services.patient_safe_summary import generate_patient_safe_summary
from app.services.prep_transform import prep_episode_to_patient_payload


# ===========================================================================
# Patient-safe summary tests
# ===========================================================================

class TestPatientSafeSummary:
    """Verify that the patient-safe summary generator produces neutral output."""

    def test_empty_inputs_produce_fallback(self):
        result = generate_patient_safe_summary()
        assert len(result["summary"]) == 1
        assert "received" in result["summary"][0].lower()
        assert len(result["questions_to_ask"]) > 0

    def test_checkin_only(self):
        checkin = CheckinPayload(
            raw_text="I have headaches",
            extracted_symptoms=[
                ExtractedSymptom(id="s1", label="headache", severity=3),
            ],
            confirmed_symptoms=["s1"],
        )
        result = generate_patient_safe_summary(checkin=checkin)
        assert any("shared" in s.lower() or "concerns" in s.lower() for s in result["summary"])
        assert any("1 symptom" in s for s in result["summary"])

    def test_multiple_confirmed_symptoms(self):
        checkin = CheckinPayload(
            raw_text="Pain and fatigue",
            confirmed_symptoms=["s1", "s2", "s3"],
        )
        result = generate_patient_safe_summary(checkin=checkin)
        assert any("3 symptoms" in s for s in result["summary"])

    def test_documents_included(self):
        docs = [
            DocumentItem(document_id="d1", title="Lab", shared=True),
            DocumentItem(document_id="d2", title="X-ray", shared=False),
        ]
        result = generate_patient_safe_summary(documents=docs)
        assert any("1 document" in s for s in result["summary"])

    def test_health_data_included(self):
        hd = HealthDataPayload(source="apple_health", shared=True)
        result = generate_patient_safe_summary(health_data=hd)
        assert any("Apple Health" in s for s in result["summary"])

    def test_health_data_not_shared(self):
        hd = HealthDataPayload(source="apple_health", shared=False)
        result = generate_patient_safe_summary(health_data=hd)
        # Should NOT mention health data when shared=False
        assert not any("Apple Health" in s for s in result["summary"])

    def test_no_diagnosis_language(self):
        """Summary must never include diagnosis, probability, or severity."""
        checkin = CheckinPayload(raw_text="chest pain and shortness of breath")
        result = generate_patient_safe_summary(checkin=checkin)
        combined = " ".join(result["summary"] + result["questions_to_ask"]).lower()
        for forbidden in ["diagnosis", "probability", "risk score", "alarming"]:
            assert forbidden not in combined

    def test_questions_always_present(self):
        result = generate_patient_safe_summary()
        assert len(result["questions_to_ask"]) >= 1


# ===========================================================================
# Prep transform tests
# ===========================================================================

class TestPrepTransform:
    """Verify the PrepEpisode → PatientPayload conversion."""

    def _make_episode(self, **overrides) -> PrepEpisode:
        defaults = {
            "id": "prep_t1",
            "patient_id": "pt_t1",
            "appointment_id": "appt_t1",
            "invite_token": "tok_t1",
            "status": PrepStatus.in_progress,
            "created_at": "2026-03-13T10:00:00+00:00",
            "updated_at": "2026-03-13T10:00:00+00:00",
        }
        defaults.update(overrides)
        return PrepEpisode(**defaults)

    def test_basic_conversion(self):
        episode = self._make_episode(
            checkin_payload=CheckinPayload(raw_text="I feel unwell"),
        )
        payload = prep_episode_to_patient_payload(episode)
        assert payload.patient_id == "pt_t1"
        assert "unwell" in payload.patient_narrative
        assert payload.hardware_source == "mobile_prep"

    def test_confirmed_symptoms_appended(self):
        episode = self._make_episode(
            checkin_payload=CheckinPayload(
                raw_text="Headache",
                extracted_symptoms=[
                    ExtractedSymptom(id="s1", label="headache"),
                    ExtractedSymptom(id="s2", label="nausea"),
                ],
                confirmed_symptoms=["s1", "s2"],
            ),
        )
        payload = prep_episode_to_patient_payload(episode)
        assert "headache" in payload.patient_narrative
        assert "nausea" in payload.patient_narrative

    def test_empty_narrative_fallback(self):
        episode = self._make_episode()
        payload = prep_episode_to_patient_payload(episode)
        assert "without a written narrative" in payload.patient_narrative

    def test_biometric_stubs_present(self):
        episode = self._make_episode(
            checkin_payload=CheckinPayload(raw_text="Test"),
        )
        payload = prep_episode_to_patient_payload(episode)
        # Pipeline expects at least minimal biometric structure
        assert payload.data.acute_7_day is not None
        assert payload.data.longitudinal_6_month is not None

    def test_risk_profile_empty(self):
        episode = self._make_episode()
        payload = prep_episode_to_patient_payload(episode)
        assert payload.risk_profile.factors == []
