"use client";

import { motion } from "framer-motion";
import type { BiometricDelta } from "@/lib/types";

const METRIC_LABELS: Record<string, string> = {
  restingHeartRate: "Resting HR",
  heartRateVariabilitySDNN: "HRV (SDNN)",
  walkingAsymmetryPercentage: "Walk Asymmetry",
  respiratoryRate: "Resp Rate",
  stepCount: "Steps",
  sleepAnalysis_awakeSegments: "Night Wakeups",
  appleSleepingWristTemperature: "Wrist Temp",
};

export function DeltaBadge({ delta, index = 0 }: { delta: BiometricDelta; index?: number }) {
  const label = METRIC_LABELS[delta.metric] || delta.metric;
  const isSignificant = delta.clinically_significant;
  const isNegativeDelta = delta.delta < 0;
  const invertedMetrics = ["heartRateVariabilitySDNN", "stepCount"];
  const isInverted = invertedMetrics.includes(delta.metric);
  const isBad = isInverted ? delta.delta < 0 : delta.delta > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.03, transition: { type: "spring", stiffness: 300, damping: 20 } }}
      className={`rounded-lg border p-4 ${isSignificant ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">
        {delta.acute_avg} <span className="text-sm font-normal text-slate-500">{delta.unit}</span>
      </p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isSignificant ? (isBad ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700") : "bg-slate-100 text-slate-600"}`}>
          {isNegativeDelta ? "\u2193" : "\u2191"} {Math.abs(delta.delta).toFixed(1)} {delta.unit}
        </span>
        <span className="text-xs text-slate-400">vs {delta.longitudinal_avg} baseline</span>
      </div>
    </motion.div>
  );
}
