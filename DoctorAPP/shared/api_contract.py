"""Canonical API types — frontend TypeScript mirrors these exactly."""

from pydantic import BaseModel
from typing import Union


class MetricDataPoint(BaseModel):
    date: str
    value: float
    unit: str
    flag: Union[str, None] = None


class LongitudinalDataPoint(BaseModel):
    week_start: str
    value: float
    unit: str
    trend: Union[str, None] = None


class AcuteMetrics(BaseModel):
    heartRateVariabilitySDNN: list[MetricDataPoint]
    restingHeartRate: list[MetricDataPoint]
    appleSleepingWristTemperature: list[MetricDataPoint]
    respiratoryRate: list[MetricDataPoint]
    walkingAsymmetryPercentage: list[MetricDataPoint]
    stepCount: list[MetricDataPoint]
    sleepAnalysis_awakeSegments: list[MetricDataPoint]


class LongitudinalMetrics(BaseModel):
    restingHeartRate: list[LongitudinalDataPoint]
    walkingAsymmetryPercentage: list[LongitudinalDataPoint]


class AcuteData(BaseModel):
    granularity: str
    metrics: AcuteMetrics


class LongitudinalData(BaseModel):
    granularity: str
    metrics: LongitudinalMetrics


class PatientData(BaseModel):
    acute_7_day: AcuteData
    longitudinal_6_month: LongitudinalData


class PatientPayload(BaseModel):
    patient_id: str
    sync_timestamp: str
    hardware_source: str
    patient_narrative: str
    data: PatientData


class ClinicalBrief(BaseModel):
    summary: str
    key_symptoms: list[str]
    severity_assessment: str
    recommended_actions: list[str]


class BiometricDelta(BaseModel):
    metric: str
    acute_avg: float
    longitudinal_avg: float
    delta: float
    unit: str
    clinically_significant: bool


class ConditionMatch(BaseModel):
    condition: str
    similarity_score: float
    pmcid: str
    title: str
    snippet: str


class AnalysisResponse(BaseModel):
    patient_id: str
    clinical_brief: ClinicalBrief
    biometric_deltas: list[BiometricDelta]
    condition_matches: list[ConditionMatch]
