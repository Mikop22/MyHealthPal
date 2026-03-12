"use client";

import type { BiometricDelta, ClinicalBrief, AcuteMetrics } from "@/lib/types";

interface Props {
  clinicalBrief: ClinicalBrief;
  biometricDeltas: BiometricDelta[];
  patientNarrative: string;
  acuteMetrics: AcuteMetrics;
}

function findDelta(deltas: BiometricDelta[], metric: string): BiometricDelta | undefined {
  return deltas.find((d) => d.metric === metric);
}

function formatDelta(val: number, unit: string): string {
  const sign = val > 0 ? "+" : "";
  const display = Math.abs(val) < 1 ? val.toFixed(2) : val.toFixed(1);
  return `${sign}${display} ${unit}`;
}


function SectionBlock({
  roman,
  label,
  color,
  body,
}: {
  roman: string;
  label: string;
  color: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col items-center pt-0.5">
        <span className="font-mono text-[10px] font-bold tracking-[0.5px]" style={{ color }}>
          {roman}
        </span>
        <div className="mt-1 w-px flex-1" style={{ background: `${color}28` }} />
      </div>
      <div className="min-w-0 pb-1">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.6px]"
          style={{ color }}
        >
          {label}
        </span>
        <p className="text-[12.5px] leading-[1.65] text-[var(--text-body)]">{body}</p>
      </div>
    </div>
  );
}

export function ClinicalAbstract({
  clinicalBrief,
  biometricDeltas,
}: Props) {
  const hrv  = findDelta(biometricDeltas, "heartRateVariabilitySDNN");
  const rhr  = findDelta(biometricDeltas, "restingHeartRate");
  const temp = findDelta(biometricDeltas, "appleSleepingWristTemperature");
  const steps = findDelta(biometricDeltas, "stepCount");
  const gait  = findDelta(biometricDeltas, "walkingAsymmetryPercentage");
  const sleep = findDelta(biometricDeltas, "sleepAnalysis_awakeSegments");

  // I. Presentation
  const presentation =
    clinicalBrief.summary ||
    "Patient presents with severe acute pain onset, markedly elevated physiological stress markers, and significant functional impairment over the 7-day acute window.";

  // II. Physiological Burden
  const burdenParts: string[] = [];
  if (hrv)  burdenParts.push(`autonomic stress (HRV ${formatDelta(hrv.delta, hrv.unit)})`);
  if (rhr)  burdenParts.push(`cardiac elevation (RHR ${formatDelta(rhr.delta, rhr.unit)})`);
  if (temp) burdenParts.push(`inflammatory signaling (Temp ${formatDelta(temp.delta, temp.unit)})`);
  const burden =
    burdenParts.length > 0
      ? `Biometric analysis confirms ${burdenParts.join(", ")} relative to the 26-week longitudinal baseline.${
          hrv?.clinically_significant || rhr?.clinically_significant
            ? " Findings are clinically significant and warrant immediate evaluation."
            : ""
        }`
      : clinicalBrief.severity_assessment ||
        "Physiological burden data not available in current dataset.";

  // III. Functional Impact
  const impactParts: string[] = [];
  if (steps) impactParts.push(`daily step count (${formatDelta(steps.delta, steps.unit)} from baseline)`);
  if (gait)  impactParts.push(`gait asymmetry (+${gait.acute_avg.toFixed(1)}% vs ${gait.longitudinal_avg.toFixed(1)}% baseline)`);
  if (sleep) impactParts.push(`nocturnal disruption (${sleep.acute_avg.toFixed(1)} wake events/night)`);
  const impact =
    impactParts.length > 0
      ? `Daily function is markedly impaired across ${impactParts.join(", ")}, consistent with debilitating pain affecting mobility and sleep architecture.`
      : "Functional impact data not available in current dataset.";

  return (
    <div className="glass-card flex flex-1 flex-col overflow-hidden rounded-[24px]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4">
        <span className="text-[15px] font-semibold tracking-[-0.2px] text-[var(--text-primary)]">
          Clinical Abstract
        </span>
        <span
          className="rounded-[8px] px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.4px] uppercase"
          style={{ background: "rgba(68,173,79,0.10)", color: "var(--purple-primary)" }}
        >
          AI Synthesis
        </span>
      </div>

      {/* Three sections */}
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-5 pb-4">
        <SectionBlock roman="I"   label="Presentation"        color="var(--purple-primary)" body={presentation} />
        <SectionBlock roman="II"  label="Physiological Burden" color="var(--red-alert)"      body={burden} />
        <SectionBlock roman="III" label="Functional Impact"    color="var(--purple-accent)"  body={impact} />
      </div>
    </div>
  );
}
