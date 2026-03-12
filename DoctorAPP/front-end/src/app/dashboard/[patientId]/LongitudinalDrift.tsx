"use client";

import type { BiometricDelta, AcuteMetrics } from "@/lib/types";

const METRIC_META: Record<string, { label: string; invertBad: boolean }> = {
  heartRateVariabilitySDNN:      { label: "HRV",          invertBad: true  },
  restingHeartRate:              { label: "Resting HR",   invertBad: false },
  appleSleepingWristTemperature: { label: "Wrist Temp",   invertBad: false },
  respiratoryRate:               { label: "Resp. Rate",   invertBad: false },
  walkingAsymmetryPercentage:    { label: "Gait Asym.",   invertBad: false },
  stepCount:                     { label: "Daily Steps",  invertBad: true  },
  sleepAnalysis_awakeSegments:   { label: "Wake Events",  invertBad: false },
};

function pctChange(d: BiometricDelta): number {
  const base = Math.abs(d.longitudinal_avg);
  // For near-zero baselines (e.g. temp deviation), express as absolute shift × 100
  if (base < 0.05) return d.delta * 100;
  return (d.delta / base) * 100;
}

function isBad(d: BiometricDelta): boolean {
  const meta = METRIC_META[d.metric];
  return meta ? (meta.invertBad ? d.delta < 0 : d.delta > 0) : d.delta > 0;
}

function formatVal(val: number, unit: string): string {
  if (unit.includes("degC")) return `${val >= 0 ? "+" : ""}${val.toFixed(2)}°`;
  if (unit === "%") return `${Math.abs(val).toFixed(1)}%`;
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}k`;
  if (Math.abs(val) >= 10 || Number.isInteger(val)) return `${Math.round(val)}`;
  return `${val.toFixed(1)}`;
}

function unitSuffix(unit: string): string {
  if (unit.includes("degC") || unit === "%" || unit === "count") return "";
  if (unit === "breaths/min") return " br/m";
  return ` ${unit}`;
}

// Tiny 7-day sparkline
function Sparkline({ values, bad, metricKey }: { values: number[]; bad: boolean; metricKey: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 54, H = 20, PAD = 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (W - PAD * 2) + PAD;
      const y = (H - PAD * 2) - ((v - min) / range) * (H - PAD * 2) + PAD;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const gradId = `drift-grad-${metricKey}`;
  const baseColor = bad ? "#E25C5C" : "#44AD4F";

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={baseColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={baseColor} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Props {
  biometricDeltas: BiometricDelta[];
  acuteMetrics: AcuteMetrics;
}

export function LongitudinalDrift({ biometricDeltas, acuteMetrics }: Props) {
  // Rank by absolute % change, take top 4
  const ranked = [...biometricDeltas]
    .sort((a, b) => Math.abs(pctChange(b)) - Math.abs(pctChange(a)))
    .slice(0, 4);

  return (
    <div className="glass-card flex flex-col overflow-hidden rounded-[24px]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4">
        <span className="text-[15px] font-semibold tracking-[-0.2px] text-[var(--text-primary)]">
          Longitudinal Drift
        </span>
        <span
          className="rounded-[8px] px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.4px] uppercase"
          style={{ background: "rgba(226,92,92,0.08)", color: "var(--red-alert)" }}
        >
          6-Month
        </span>
      </div>

      {/* Metric rows */}
      <div className="flex flex-col gap-2.5 overflow-y-auto px-4 pb-4">
        {ranked.map((d) => {
          const meta = METRIC_META[d.metric];
          const label = meta?.label ?? d.metric;
          const bad = isBad(d);
          const pct = pctChange(d);
          const pctStr = `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
          const suffix = unitSuffix(d.unit);
          const baseStr = formatVal(d.longitudinal_avg, d.unit) + suffix;
          const acuteStr = formatVal(d.acute_avg, d.unit) + suffix;

          const sparkValues =
            (acuteMetrics[d.metric as keyof AcuteMetrics] as Array<{ value: number }> | undefined)
              ?.map((p) => p.value) ?? [];

          return (
            <div
              key={d.metric}
              className="rounded-[14px] p-3"
              style={{
                background:
                  d.clinically_significant && bad
                    ? "rgba(226,92,92,0.06)"
                    : "rgba(255,255,255,0.07)",
                border:
                  d.clinically_significant && bad
                    ? "1px solid rgba(226,92,92,0.18)"
                    : "1px solid rgba(255,255,255,0.14)",
              }}
            >
              {/* Label + pct badge */}
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
                  {label}
                </span>
                <span
                  className="rounded-[6px] px-1.5 py-0.5 font-mono text-[10px] font-bold"
                  style={{
                    background: bad ? "rgba(226,92,92,0.10)" : "rgba(68,173,79,0.10)",
                    color: bad ? "var(--red-alert)" : "var(--purple-primary)",
                  }}
                >
                  {pctStr}
                </span>
              </div>

              {/* Baseline → Acute + sparkline */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Baseline (then) */}
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">{baseStr}</span>

                  {/* Arrow */}
                  <svg width="14" height="10" viewBox="0 0 14 10" className="shrink-0">
                    <path
                      d="M1 5h10M8 2l3 3-3 3"
                      stroke="rgba(155,147,172,0.5)"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>

                  {/* Acute (now) */}
                  <span
                    className="font-mono text-[13px] font-bold"
                    style={{ color: bad ? "var(--red-alert)" : "var(--text-primary)" }}
                  >
                    {acuteStr}
                  </span>
                </div>

                <Sparkline values={sparkValues} bad={bad} metricKey={d.metric} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
