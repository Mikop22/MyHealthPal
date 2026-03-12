// Types copied from shared/api-contract.ts

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
  risk_profile?: RiskProfile;
}

export interface ClinicalBrief {
  summary: string;
  clinical_intake: string;
  primary_concern: string;
  key_symptoms: string[];
  severity_assessment: string;
  recommended_actions: string[];
  cited_sources: string[];
  guiding_questions: string[];
}

export interface BiometricDelta {
  metric: string;
  acute_avg: number;
  longitudinal_avg: number;
  delta: number;
  unit: string;
  clinically_significant: boolean;
  changepoint_detected: boolean;
  changepoint_date?: string;
  changepoint_direction?: string;
}

export interface ConditionMatch {
  condition: string;
  similarity_score: number;
  pmcid: string;
  title: string;
  snippet: string;
}

export interface RiskFactor {
  category: string;
  factor: string;
  description: string;
  severity: string;
  weight: number;
}

export interface RiskProfile {
  factors: RiskFactor[];
}

export interface AnalysisResponse {
  patient_id: string;
  clinical_brief: ClinicalBrief;
  biometric_deltas: BiometricDelta[];
  condition_matches: ConditionMatch[];
  risk_profile?: RiskProfile;
}


// --- Patient Management Types ---

export interface PatientRecord {
  id: string;
  name: string;
  email: string;
  xrp_wallet_address: string;
  xrp_wallet_seed: string;
  created_at: string;
  status: string;
  concern: string;
}

export interface AppointmentRecord {
  id: string;
  patient_id: string;
  date: string;
  time: string;
  status: string;
  form_token: string;
  created_at: string;
}

