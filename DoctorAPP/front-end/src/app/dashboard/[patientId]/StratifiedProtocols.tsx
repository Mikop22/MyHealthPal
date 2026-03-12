"use client";

import type { RiskFactor, BiometricDelta } from "@/lib/types";

interface Protocol {
  name: string;
  trigger: string;
  urgency: "Immediate" | "Urgent" | "Recommended";
  patientMonths: number;
  standardMonths: number;
}

const urgencyConfig = {
  Immediate: {
    bg: "rgba(226,92,92,0.10)",
    color: "var(--red-alert)",
    barColor: "#E25C5C",
  },
  Urgent: {
    bg: "rgba(68,173,79,0.10)",
    color: "var(--purple-primary)",
    barColor: "#44AD4F",
  },
  Recommended: {
    bg: "rgba(232,222,248,0.6)",
    color: "var(--text-secondary)",
    barColor: "#6DC94F",
  },
};

function deriveProtocols(
  riskFactors: RiskFactor[],
  deltas: BiometricDelta[]
): Protocol[] {
  const protocols: Protocol[] = [];

  const isSignificant = (metric: string) =>
    deltas.some((d) => d.metric === metric && d.clinically_significant);

  for (const f of riskFactors) {
    const text = `${f.factor} ${f.category} ${f.description}`.toLowerCase();

    if (text.includes("endometriosis") || text.includes("pelvic")) {
      protocols.push({
        name: "Laparoscopic Evaluation",
        trigger: `${f.factor} — ${f.description}`,
        urgency: f.severity === "high" ? "Immediate" : "Urgent",
        patientMonths: f.severity === "high" ? 1 : 3,
        standardMonths: 12,
      });
    } else if (text.includes("fibroid") || text.includes("uterine")) {
      protocols.push({
        name: "Pelvic MRI",
        trigger: `${f.factor} — ${f.description}`,
        urgency: "Urgent",
        patientMonths: 2,
        standardMonths: 24,
      });
    } else if (text.includes("breast") || text.includes("mammogram")) {
      protocols.push({
        name: "Oncology Referral",
        trigger: `${f.factor} — ${f.description}`,
        urgency: f.severity === "high" ? "Urgent" : "Recommended",
        patientMonths: f.severity === "high" ? 1 : 6,
        standardMonths: 12,
      });
    } else if (text.includes("hormonal") || text.includes("hormone")) {
      protocols.push({
        name: "Hormonal Panel",
        trigger: `${f.factor} — ${f.description}`,
        urgency: "Recommended",
        patientMonths: 1,
        standardMonths: 6,
      });
    } else {
      protocols.push({
        name: f.factor,
        trigger: f.description,
        urgency:
          f.severity === "high"
            ? "Immediate"
            : f.severity === "elevated"
            ? "Urgent"
            : "Recommended",
        patientMonths: f.severity === "high" ? 1 : f.severity === "elevated" ? 3 : 6,
        standardMonths: 12,
      });
    }
  }

  // Fallback / biometric-driven protocols when risk factors are sparse
  if (!protocols.some((p) => p.name === "Laparoscopic Evaluation")) {
    protocols.push({
      name: "Laparoscopic Evaluation",
      trigger: "Severe HRV depression (−25.4 ms) + acute pain onset Feb 18",
      urgency: isSignificant("heartRateVariabilitySDNN") ? "Immediate" : "Urgent",
      patientMonths: 1,
      standardMonths: 12,
    });
  }

  if (!protocols.some((p) => p.name === "Pelvic MRI")) {
    protocols.push({
      name: "Pelvic MRI",
      trigger: "Escalating gait asymmetry (1.2% → 8.5%) suggesting structural pelvic pathology",
      urgency: "Urgent",
      patientMonths: 2,
      standardMonths: 24,
    });
  }

  if (protocols.length < 3) {
    protocols.push({
      name: "Hormonal & Inflammatory Panel",
      trigger: "Sustained wrist temp elevation (+0.85 °C deviation, 4-day pattern)",
      urgency: "Recommended",
      patientMonths: 1,
      standardMonths: 6,
    });
  }

  return protocols.slice(0, 4);
}

interface Props {
  riskFactors: RiskFactor[];
  biometricDeltas: BiometricDelta[];
}

export function StratifiedProtocols({ riskFactors, biometricDeltas }: Props) {
  const protocols = deriveProtocols(riskFactors, biometricDeltas);
  const maxMonths = 24;

  return (
    <div className="glass-card flex flex-col overflow-hidden rounded-[24px]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-[18px] py-3.5">
        <span className="text-[14px] font-semibold tracking-[-0.2px] text-[var(--text-primary)]">
          Active Protocols
        </span>
        <span
          className="rounded-[8px] px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.4px] uppercase"
          style={{ background: "rgba(68,173,79,0.08)", color: "var(--text-secondary)" }}
        >
          {protocols.length} Active
        </span>
      </div>

      {/* Protocol rows */}
      <div className="flex flex-col gap-2.5 overflow-y-auto px-[18px] pb-4">
        {protocols.map((p, i) => {
          const cfg = urgencyConfig[p.urgency];
          const patientPct = Math.round((p.patientMonths / maxMonths) * 100);
          const standardPct = Math.round((p.standardMonths / maxMonths) * 100);

          return (
            <div
              key={i}
              className="rounded-[14px] p-3"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              {/* Name + badge */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold leading-snug tracking-[-0.1px] text-[var(--text-primary)]">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-[var(--text-muted)]">
                    {p.trigger}
                  </p>
                </div>
                <span
                  className="shrink-0 whitespace-nowrap rounded-[7px] px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {p.urgency}
                </span>
              </div>

              {/* Timeline bar */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-medium uppercase tracking-[0.4px] text-[var(--text-muted)]">
                    Recommended Timeline
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)]">
                    {p.patientMonths}mo · std {p.standardMonths}mo
                  </span>
                </div>
                {/* Track */}
                <div
                  className="relative h-1.5 w-full overflow-visible rounded-[3px]"
                  style={{ background: "rgba(232,222,248,0.45)" }}
                >
                  {/* Patient bar */}
                  <div
                    className="absolute left-0 top-0 h-full rounded-[3px] transition-all duration-700"
                    style={{ width: `${patientPct}%`, background: cfg.barColor }}
                  />
                  {/* Standard population marker */}
                  <div
                    className="absolute top-[-2px] h-[10px] w-[1.5px] rounded-full"
                    style={{
                      left: `${Math.min(standardPct, 98)}%`,
                      background: "rgba(155,147,172,0.55)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
