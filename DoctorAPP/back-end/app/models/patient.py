"""Pydantic models for patient data — mirrors shared/api_contract.py."""

from pydantic import BaseModel, ConfigDict
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


class StringMetricDataPoint(BaseModel):
    date: str
    value: str
    unit: str
    flag: Union[str, None] = None


class AcuteMetrics(BaseModel):
    heartRateVariabilitySDNN: list[MetricDataPoint]
    restingHeartRate: list[MetricDataPoint]
    appleSleepingWristTemperature: list[MetricDataPoint]
    respiratoryRate: list[MetricDataPoint]
    walkingAsymmetryPercentage: list[MetricDataPoint]
    stepCount: list[MetricDataPoint]
    sleepAnalysis_awakeSegments: list[MetricDataPoint]
    bloodOxygenSaturation: list[MetricDataPoint] = []
    walkingStepLength: list[MetricDataPoint] = []
    walkingDoubleSupportPercentage: list[MetricDataPoint] = []
    menstrualCyclePhase: list[StringMetricDataPoint] = []


class LongitudinalMetrics(BaseModel):
    restingHeartRate: list[LongitudinalDataPoint]
    walkingAsymmetryPercentage: list[LongitudinalDataPoint]
    bloodOxygenSaturation: list[LongitudinalDataPoint] = []
    walkingStepLength: list[LongitudinalDataPoint] = []
    walkingDoubleSupportPercentage: list[LongitudinalDataPoint] = []


class AcuteData(BaseModel):
    granularity: str
    metrics: AcuteMetrics


class LongitudinalData(BaseModel):
    granularity: str
    metrics: LongitudinalMetrics


class PatientData(BaseModel):
    acute_7_day: AcuteData
    longitudinal_6_month: LongitudinalData


class RiskFactor(BaseModel):
    category: str
    factor: str
    description: str
    severity: str
    weight: int

class RiskProfile(BaseModel):
    factors: list[RiskFactor]

class PatientPayload(BaseModel):
    patient_id: str
    sync_timestamp: str
    hardware_source: str
    patient_narrative: str
    data: PatientData
    risk_profile: RiskProfile
class ClinicalBrief(BaseModel):
    summary: str
    clinical_intake: str
    primary_concern: str
    key_symptoms: list[str]
    severity_assessment: str
    recommended_actions: list[str]
    cited_sources: list[str]
    guiding_questions: list[str]


class BiometricDelta(BaseModel):
    metric: str
    acute_avg: float
    longitudinal_avg: float
    delta: float
    unit: str
    clinically_significant: bool
    changepoint_detected: bool = False
    changepoint_date: Union[str, None] = None
    changepoint_direction: Union[str, None] = None


class ConditionMatch(BaseModel):
    condition: str
    similarity_score: float
    pmcid: str
    title: str
    snippet: str


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    patient_id: str
    clinical_brief: ClinicalBrief
    biometric_deltas: list[BiometricDelta]
    condition_matches: list[ConditionMatch]
    risk_profile: Union[RiskProfile, None] = None
