"use client";

import { motion } from "framer-motion";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import type { BiometricDelta, AcuteMetrics } from "@/lib/types";

// ─── Demo data for new Apple Health metrics not yet in the live payload ───────
// Chart 3: Pelvic Guarding — walkingStepLength (cm) drops as pain forces shortened gait;
// walkingDoubleSupportPercentage (%) spikes as patient guards both legs simultaneously.
const DEMO_PELVIC = [
  { time: "02/15", stepLen: 68.5, dblSupport: 23.1 },
  { time: "02/16", stepLen: 67.8, dblSupport: 23.5 },
  { time: "02/17", stepLen: 68.2, dblSupport: 23.2 },
  { time: "02/18", stepLen: 42.1, dblSupport: 38.4 }, // pain onset
  { time: "02/19", stepLen: 44.5, dblSupport: 36.8 },
  { time: "02/20", stepLen: 51.2, dblSupport: 31.5 },
  { time: "02/21", stepLen: 55.0, dblSupport: 29.2 },
];

// Chart 4: SpO2 — dips below clinical threshold (95%) during acute phase
const DEMO_SPO2 = [
  { time: "02/15", value: 98.2 },
  { time: "02/16", value: 98.0 },
  { time: "02/17", value: 97.8 },
  { time: "02/18", value: 95.1 }, // sub-threshold
  { time: "02/19", value: 95.4 },
  { time: "02/20", value: 96.2 },
  { time: "02/21", value: 96.8 },
];

// ─── 26-week longitudinal baselines (used for ghost ReferenceLine) ───────────
// RHR mean calculated from the 26 weekly values in the mock longitudinal payload
const BL = {
  hrv: 46.0,        // ms — pre-crisis 7-day average
  rhr: 64.7,        // bpm — mean of 26 weekly longitudinal averages (Σ/26 = 64.7)
  wristTemp: 0.0,   // °C deviation — clinical baseline is always zero
  stepLen: 68.0,    // cm — pre-crisis gait average
  dblSupport: 23.3, // % — pre-crisis stance average
  spo2: 98.0,       // % — baseline oxygenation
};

// Days where metrics breached clinical thresholds (for red ReferenceArea)
const BREACH_START = "02/18";
const BREACH_END = "02/21";

function toShortDate(iso: string): string {
  return iso.split("-").slice(1).join("/");
}

const sharedTooltipProps = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.30)",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 4px 16px rgba(68,173,79,0.10)",
    padding: "6px 10px",
  },
  itemStyle: { fontSize: 11, fontWeight: 500 },
  labelStyle: { fontSize: 10, color: "var(--text-muted)", marginBottom: 2 },
};

// ─── Delta pill embedded in each chart's top-left corner ─────────────────────
function DeltaPill({ delta, unit, alert }: { delta: number; unit: string; alert: boolean }) {
  const dir = delta > 0 ? "↑" : "↓";
  return (
    <span
      className="inline-flex items-center gap-[3px] rounded-[10px] px-[7px] py-[2px] text-[10px] font-semibold tracking-wide"
      style={{
        background: alert ? "rgba(226,92,92,0.12)" : "rgba(68,173,79,0.08)",
        color: alert ? "var(--red-alert)" : "var(--purple-primary)",
      }}
    >
      {dir} {Math.abs(delta).toFixed(1)} {unit}
    </span>
  );
}

// ─── Chart card wrapper: delta number + pill on left, title on right ──────────
interface ChartCardProps {
  index: number;
  acuteVal: string;
  unit: string;
  delta: number | null;
  alert: boolean;
  title: string;
  subtitle: string;
  children: React.ReactElement;
}

function ChartCard({ index, acuteVal, unit, delta, alert, title, subtitle, children }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.015, transition: { type: "spring", stiffness: 300, damping: 22 } }}
      className="glass-card flex flex-1 flex-col overflow-hidden rounded-[24px]"
    >
      {/* Header — big delta number top-left, chart title top-right */}
      <div className="flex shrink-0 items-start justify-between px-[18px] pt-[14px] pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[24px] font-semibold leading-none tracking-[-1px] text-[var(--text-primary)]">
              {acuteVal}
            </span>
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{unit}</span>
          </div>
          {delta !== null && <DeltaPill delta={delta} unit={unit} alert={alert} />}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[13px] font-semibold tracking-[-0.2px] text-[var(--text-primary)]">
            {title}
          </span>
          <span className="mt-0.5 text-[10px] text-[var(--text-muted)]">{subtitle}</span>
        </div>
      </div>

      {/* Chart body */}
      <div className="min-h-0 flex-1 px-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

interface ClientChartsProps {
  biometricDeltas?: BiometricDelta[];
  acuteData: AcuteMetrics;
}

export function ClientCharts({ biometricDeltas, acuteData }: ClientChartsProps) {
  // ── Chart 1: Autonomic Stress (HRV + RHR dual-axis overlay) ──────────────
  const autonomicData = acuteData.heartRateVariabilitySDNN.map((pt, i) => ({
    time: toShortDate(pt.date),
    hrv: pt.value,
    rhr: acuteData.restingHeartRate[i]?.value ?? null,
  }));
  const rhrDelta = biometricDeltas?.find((d) => d.metric === "restingHeartRate");
  const rhrAcuteAvg = rhrDelta?.acute_avg ?? 72;

  // ── Chart 2: Reproductive / Inflammatory (Wrist Temp + Luteal Phase) ─────
  const tempData = acuteData.appleSleepingWristTemperature.map((pt) => ({
    time: toShortDate(pt.date),
    value: pt.value,
  }));
  const tempDelta = biometricDeltas?.find((d) => d.metric === "appleSleepingWristTemperature");
  const tempAcuteAvg = tempDelta?.acute_avg ?? 0.72;

  // ── Chart 3: Pelvic Guarding (demo data — step length + double support) ──
  const walkDelta = biometricDeltas?.find((d) => d.metric === "walkingAsymmetryPercentage");
  const walkAcuteAvg = walkDelta?.acute_avg ?? 5.7;

  // ── Chart 4: SpO2 Oxygenation (demo data) ────────────────────────────────
  const spo2Avg = DEMO_SPO2.reduce((s, d) => s + d.value, 0) / DEMO_SPO2.length;
  const spo2DeltaVal = spo2Avg - BL.spo2;

  const xAxisProps = {
    axisLine: false as const,
    tickLine: false as const,
    tick: { fontSize: 10, fill: "var(--text-muted)" },
    dy: 4,
  };
  const yAxisProps = {
    axisLine: false as const,
    tickLine: false as const,
    tick: { fontSize: 10, fill: "var(--text-muted)" },
  };

  return (
    <>
      {/* ── Chart 1: Autonomic Stress ───────────────────────────────────── */}
      <ChartCard
        index={0}
        acuteVal={rhrAcuteAvg.toFixed(0)}
        unit="bpm"
        delta={rhrDelta?.delta ?? null}
        alert={rhrDelta?.clinically_significant ?? false}
        title="Autonomic Stress"
        subtitle="HRV · Resting HR"
      >
        <ComposedChart data={autonomicData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
          <XAxis dataKey="time" {...xAxisProps} />
          <YAxis
            yAxisId="hrv"
            {...yAxisProps}
            dx={-3}
            tickFormatter={(v) => `${v}ms`}
          />
          <YAxis
            yAxisId="rhr"
            orientation="right"
            {...yAxisProps}
            dx={3}
            tickFormatter={(v) => `${v}b`}
          />
          <Tooltip {...sharedTooltipProps} />
          {/* Ghost baselines — 26-week longitudinal mean */}
          <ReferenceLine
            yAxisId="hrv"
            y={BL.hrv}
            stroke="var(--purple-light)"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            opacity={0.6}
          />
          <ReferenceLine
            yAxisId="rhr"
            y={BL.rhr}
            stroke="rgba(226,92,92,0.55)"
            strokeDasharray="5 3"
            strokeWidth={1.5}
          />
          {/* Red breach highlight */}
          <ReferenceArea
            yAxisId="hrv"
            x1={BREACH_START}
            x2={BREACH_END}
            fill="rgba(226,92,92,0.06)"
          />
          <Line
            yAxisId="hrv"
            type="monotone"
            dataKey="hrv"
            stroke="var(--purple-primary)"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "var(--purple-primary)", strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            name="HRV (ms)"
          />
          <Line
            yAxisId="rhr"
            type="monotone"
            dataKey="rhr"
            stroke="var(--red-alert)"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "var(--red-alert)", strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            name="RHR (bpm)"
          />
        </ComposedChart>
      </ChartCard>

      {/* ── Chart 2: Reproductive / Inflammatory ───────────────────────── */}
      <ChartCard
        index={1}
        acuteVal={tempAcuteAvg.toFixed(2)}
        unit="°C"
        delta={tempDelta?.delta ?? null}
        alert={tempDelta?.clinically_significant ?? false}
        title="Inflammatory"
        subtitle="Wrist Temp Deviation"
      >
        <ComposedChart data={tempData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
          <XAxis dataKey="time" {...xAxisProps} />
          <YAxis {...yAxisProps} dx={-3} tickFormatter={(v) => `${v}°`} />
          <Tooltip {...sharedTooltipProps} />
          {/* Clinical breach overlay */}
          <ReferenceArea
            x1={BREACH_START}
            x2={BREACH_END}
            fill="rgba(226,92,92,0.06)"
          />
          {/* Ghost: 26-wk baseline (zero deviation) */}
          <ReferenceLine
            y={BL.wristTemp}
            stroke="var(--purple-light)"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            opacity={0.6}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--purple-accent)"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "var(--purple-accent)", strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            name="Temp Δ (°C)"
          />
        </ComposedChart>
      </ChartCard>

      {/* ── Chart 3: Pelvic Guarding ────────────────────────────────────── */}
      <ChartCard
        index={2}
        acuteVal={walkAcuteAvg.toFixed(1)}
        unit="%"
        delta={walkDelta?.delta ?? null}
        alert={walkDelta?.clinically_significant ?? false}
        title="Pelvic Guarding"
        subtitle="Step Length · Stance"
      >
        <ComposedChart data={DEMO_PELVIC} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
          <XAxis dataKey="time" {...xAxisProps} />
          <YAxis
            yAxisId="step"
            {...yAxisProps}
            dx={-3}
            tickFormatter={(v) => `${v}cm`}
          />
          <YAxis
            yAxisId="ds"
            orientation="right"
            {...yAxisProps}
            dx={3}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip {...sharedTooltipProps} />
          {/* Ghost baselines */}
          <ReferenceLine
            yAxisId="step"
            y={BL.stepLen}
            stroke="var(--purple-light)"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            opacity={0.6}
          />
          <ReferenceLine
            yAxisId="ds"
            y={BL.dblSupport}
            stroke="rgba(226,92,92,0.5)"
            strokeDasharray="5 3"
            strokeWidth={1.5}
          />
          <ReferenceArea
            yAxisId="step"
            x1={BREACH_START}
            x2={BREACH_END}
            fill="rgba(226,92,92,0.06)"
          />
          <Line
            yAxisId="step"
            type="monotone"
            dataKey="stepLen"
            stroke="var(--purple-primary)"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "var(--purple-primary)", strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            name="Step Length (cm)"
          />
          <Line
            yAxisId="ds"
            type="monotone"
            dataKey="dblSupport"
            stroke="var(--red-alert)"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "var(--red-alert)", strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            name="Double Support (%)"
          />
        </ComposedChart>
      </ChartCard>

      {/* ── Chart 4: SpO2 Oxygenation ───────────────────────────────────── */}
      <ChartCard
        index={3}
        acuteVal={spo2Avg.toFixed(1)}
        unit="%"
        delta={spo2DeltaVal}
        alert={spo2Avg < 96}
        title="Oxygenation"
        subtitle="SpO2 · Anemia Signal"
      >
        <ComposedChart data={DEMO_SPO2} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
          <XAxis dataKey="time" {...xAxisProps} />
          <YAxis
            {...yAxisProps}
            dx={-3}
            domain={[93.5, 99.5]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip {...sharedTooltipProps} />
          {/* Ghost: 26-wk baseline */}
          <ReferenceLine
            y={BL.spo2}
            stroke="var(--purple-light)"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            opacity={0.6}
          />
          {/* Clinical minimum threshold */}
          <ReferenceLine
            y={95}
            stroke="var(--red-alert)"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: "95% min",
              position: "insideTopRight",
              fontSize: 9,
              fill: "var(--red-alert)",
            }}
          />
          {/* Sub-threshold danger area */}
          <ReferenceArea
            x1={BREACH_START}
            x2="02/19"
            y1={93.5}
            y2={95}
            fill="rgba(226,92,92,0.12)"
          />
          {/* Full breach date tint */}
          <ReferenceArea
            x1={BREACH_START}
            x2={BREACH_END}
            fill="rgba(226,92,92,0.04)"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3DBDAD"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "#3DBDAD", strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            name="SpO2 (%)"
          />
        </ComposedChart>
      </ChartCard>
    </>
  );
}
