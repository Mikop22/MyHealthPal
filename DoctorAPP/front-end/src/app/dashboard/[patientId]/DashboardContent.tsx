"use client";

// ─── Layout ───────────────────────────────────────────────────────────────────
// Row 0  Patient header (name)
// Row 1  Clinical Intake 28% (narrative only) | ClinicalAbstract flex-1 (AI synthesis)
// Row 2  4× BiometricCharts (delta embedded in each header)
// Row 3  StratifiedProtocols 36% (actionable screening protocols) | DiagnosticNudgeAccordion flex-1
// ──────────────────────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { ClientCharts } from "./ClientCharts";
import { ClinicalAbstract } from "./ClinicalAbstract";
import { LongitudinalDrift } from "./LongitudinalDrift";
import { StratifiedProtocols } from "./StratifiedProtocols";
import { DiagnosticNudgeAccordion } from "@/app/_components/DiagnosticNudgeAccordion";
import type { AnalysisResponse, PatientPayload } from "@/lib/types";

const sectionVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

// ─── Demo data mirrors the CLAUDE.md mock payload ────────────────────────────
const DEMO_ACUTE_METRICS = {
  heartRateVariabilitySDNN: [
    { date: "2026-02-15", value: 48.2, unit: "ms" },
    { date: "2026-02-16", value: 47.1, unit: "ms" },
    { date: "2026-02-17", value: 45.9, unit: "ms" },
    { date: "2026-02-18", value: 22.4, unit: "ms" },
    { date: "2026-02-19", value: 24.1, unit: "ms" },
    { date: "2026-02-20", value: 28.5, unit: "ms" },
    { date: "2026-02-21", value: 31.0, unit: "ms" },
  ],
  restingHeartRate: [
    { date: "2026-02-15", value: 62, unit: "bpm" },
    { date: "2026-02-16", value: 63, unit: "bpm" },
    { date: "2026-02-17", value: 62, unit: "bpm" },
    { date: "2026-02-18", value: 78, unit: "bpm" },
    { date: "2026-02-19", value: 76, unit: "bpm" },
    { date: "2026-02-20", value: 74, unit: "bpm" },
    { date: "2026-02-21", value: 72, unit: "bpm" },
  ],
  appleSleepingWristTemperature: [
    { date: "2026-02-15", value: -0.12, unit: "degC_deviation" },
    { date: "2026-02-16", value: -0.10, unit: "degC_deviation" },
    { date: "2026-02-17", value: 0.05, unit: "degC_deviation" },
    { date: "2026-02-18", value: 0.85, unit: "degC_deviation" },
    { date: "2026-02-19", value: 0.92, unit: "degC_deviation" },
    { date: "2026-02-20", value: 0.80, unit: "degC_deviation" },
    { date: "2026-02-21", value: 0.75, unit: "degC_deviation" },
  ],
  respiratoryRate: [
    { date: "2026-02-15", value: 14.5, unit: "breaths/min" },
    { date: "2026-02-16", value: 14.6, unit: "breaths/min" },
    { date: "2026-02-17", value: 14.5, unit: "breaths/min" },
    { date: "2026-02-18", value: 18.2, unit: "breaths/min" },
    { date: "2026-02-19", value: 17.8, unit: "breaths/min" },
    { date: "2026-02-20", value: 16.5, unit: "breaths/min" },
    { date: "2026-02-21", value: 16.0, unit: "breaths/min" },
  ],
  walkingAsymmetryPercentage: [
    { date: "2026-02-15", value: 1.2, unit: "%" },
    { date: "2026-02-16", value: 1.5, unit: "%" },
    { date: "2026-02-17", value: 1.3, unit: "%" },
    { date: "2026-02-18", value: 8.5, unit: "%" },
    { date: "2026-02-19", value: 8.2, unit: "%" },
    { date: "2026-02-20", value: 6.0, unit: "%" },
    { date: "2026-02-21", value: 5.5, unit: "%" },
  ],
  stepCount: [
    { date: "2026-02-15", value: 8500, unit: "count" },
    { date: "2026-02-16", value: 8200, unit: "count" },
    { date: "2026-02-17", value: 8600, unit: "count" },
    { date: "2026-02-18", value: 1200, unit: "count" },
    { date: "2026-02-19", value: 1500, unit: "count" },
    { date: "2026-02-20", value: 2500, unit: "count" },
    { date: "2026-02-21", value: 3000, unit: "count" },
  ],
  sleepAnalysis_awakeSegments: [
    { date: "2026-02-15", value: 1, unit: "count" },
    { date: "2026-02-16", value: 1, unit: "count" },
    { date: "2026-02-17", value: 2, unit: "count" },
    { date: "2026-02-18", value: 6, unit: "count" },
    { date: "2026-02-19", value: 5, unit: "count" },
    { date: "2026-02-20", value: 4, unit: "count" },
    { date: "2026-02-21", value: 3, unit: "count" },
  ],
};


// Demo patient narrative — production value arrives via patient_payload.patient_narrative
const DEMO_NARRATIVE =
  "Over the past two weeks, the pain has become unbearable. It started slowly, " +
  "but then on the 18th I couldn't get out of bed — the cramping was so severe I " +
  "couldn't walk without hunching over. I counted six times waking up that night. " +
  "My heart was racing and I was sweating. I've had flares before but nothing like " +
  "this. Every step feels like something is twisting inside me. I've cut my movement " +
  "to almost nothing. I've been short of breath even just walking to the bathroom, " +
  "and nothing my last doctor suggested has helped at all.";

interface DashboardContentProps {
  data: AnalysisResponse & { patient_payload?: PatientPayload; patient_name?: string };
  patientId: string;
}

export function DashboardContent({ data, patientId }: DashboardContentProps) {
  const { clinical_brief, biometric_deltas, condition_matches, patient_payload } = data;
  const acuteMetrics = patient_payload?.data?.acute_7_day?.metrics || DEMO_ACUTE_METRICS;
  const narrative = patient_payload?.patient_narrative ?? DEMO_NARRATIVE;
  const patientName = data.patient_name ?? data.patient_id;

  const riskFactors = data.risk_profile?.factors || [];

  return (
    <>
      {/* ══ PATIENT HEADER ══════════════════════════════════════════════════ */}
      <motion.div
        custom={0}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="flex shrink-0 items-center justify-between"
      >
        <h1 className="text-[22px] font-semibold tracking-[-0.5px] text-[var(--text-primary)]">
          {patientName}
        </h1>
      </motion.div>

      {/* ══ TOP ROW: 25% Intake | 45% Abstract | 30% Longitudinal Drift ═══════ */}
      <motion.div
        custom={1}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="flex min-h-0 flex-[10] gap-8"
      >
        {/* Col 1 — Clinical Intake (25%): patient narrative */}
        <div className="glass-card flex w-[25%] shrink-0 flex-col overflow-hidden rounded-[24px]">
          <div className="flex shrink-0 items-center px-5 py-4">
            <span className="text-[15px] font-semibold tracking-[-0.2px] text-[var(--text-primary)]">
              Clinical Intake
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            <p className="text-[13px] leading-[1.65] text-[var(--text-body)]">
              {clinical_brief?.clinical_intake || narrative}
            </p>
          </div>
        </div>

        {/* Col 2 — Clinical Abstract (flex-1 ≈ 45%): AI synthesis */}
        <ClinicalAbstract
          clinicalBrief={clinical_brief}
          biometricDeltas={biometric_deltas}
          patientNarrative={narrative}
          acuteMetrics={acuteMetrics}
        />

        {/* Col 3 — Longitudinal Drift (30%): 6-month baseline vs acute */}
        <div className="flex w-[30%] shrink-0 flex-col">
          <LongitudinalDrift
            biometricDeltas={biometric_deltas}
            acuteMetrics={acuteMetrics}
          />
        </div>
      </motion.div>

      {/* ══ METRICS ROW: 4 Biometric Charts (delta embedded) ═══════════════ */}
      <motion.div
        custom={2}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="flex min-h-0 flex-[9] gap-8"
      >
        <ClientCharts biometricDeltas={biometric_deltas} acuteData={acuteMetrics} />
      </motion.div>

      {/* ══ BOTTOM ROW: Active Protocols + Possible Diagnosis ══════════════ */}
      <motion.div
        custom={3}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="flex min-h-0 flex-[12] gap-8"
      >
        {/* Stratified Protocols — replaces Risk Profile */}
        <div className="flex w-[36%] shrink-0 flex-col">
          <StratifiedProtocols
            riskFactors={riskFactors}
            biometricDeltas={biometric_deltas}
          />
        </div>

        {/* Possible Diagnosis — DiagnosticNudgeAccordion */}
        <div className="glass-card flex flex-1 flex-col overflow-hidden rounded-[24px]">
          <div className="flex shrink-0 items-center gap-2 px-[18px] py-3.5">
            <span className="text-[14px] font-semibold tracking-[-0.2px] text-[var(--text-primary)]">
              Possible Diagnosis
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-4">
            {condition_matches.length > 0 ? (
              <DiagnosticNudgeAccordion matches={condition_matches} />
            ) : (
              <span className="text-[12px] text-[var(--text-muted)]">
                No condition matches available.
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
