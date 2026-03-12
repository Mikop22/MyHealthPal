// shared/api-contract.ts
// Canonical API types — backend Python mirrors these exactly.

export interface MetricDataPoint {
  date: string;
  value: number;
  unit: string;
  flag?: string;
}

export interface LongitudinalDataPoint {
  week_start: string;
  value: number;
  unit: string;
  trend?: string;
}

export interface AcuteMetrics {
  heartRateVariabilitySDNN: MetricDataPoint[];
  restingHeartRate: MetricDataPoint[];
  appleSleepingWristTemperature: MetricDataPoint[];
  respiratoryRate: MetricDataPoint[];
  walkingAsymmetryPercentage: MetricDataPoint[];
  stepCount: MetricDataPoint[];
  sleepAnalysis_awakeSegments: MetricDataPoint[];
}

export interface LongitudinalMetrics {
  restingHeartRate: LongitudinalDataPoint[];
  walkingAsymmetryPercentage: LongitudinalDataPoint[];
}

export interface PatientPayload {
  patient_id: string;
  sync_timestamp: string;
  hardware_source: string;
  patient_narrative: string;
  data: {
    acute_7_day: {
      granularity: string;
      metrics: AcuteMetrics;
    };
    longitudinal_6_month: {
      granularity: string;
      metrics: LongitudinalMetrics;
    };
  };
}

export interface ClinicalBrief {
  summary: string;
  key_symptoms: string[];
  severity_assessment: string;
  recommended_actions: string[];
}

export interface BiometricDelta {
  metric: string;
  acute_avg: number;
  longitudinal_avg: number;
  delta: number;
  unit: string;
  clinically_significant: boolean;
}

export interface ConditionMatch {
  condition: string;
  similarity_score: number;
  pmcid: string;
  title: string;
  snippet: string;
}

export interface AnalysisResponse {
  patient_id: string;
  clinical_brief: ClinicalBrief;
  biometric_deltas: BiometricDelta[];
  condition_matches: ConditionMatch[];
}
