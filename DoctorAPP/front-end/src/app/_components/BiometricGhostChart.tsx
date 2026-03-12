"use client";

import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import type { MetricDataPoint } from "@/lib/types";

interface GhostChartProps {
  title: string;
  data: MetricDataPoint[];
  baselineAvg: number;
  unit: string;
  color: string;
}

export function BiometricGhostChart({ title, data, baselineAvg, unit, color }: GhostChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.value,
    flag: d.flag,
  }));

  return (
    <div className="rounded-lg border border-slate-200 p-4 bg-white">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
            formatter={(value: number | undefined) => [`${value ?? ""} ${unit}`, title]}
            labelStyle={{ color: "#94a3b8" }}
          />
          <ReferenceLine y={baselineAvg} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={1.5}
            label={{ value: `Baseline: ${baselineAvg} ${unit}`, position: "insideTopRight", style: { fontSize: 10, fill: "#94a3b8" } }} />
          <Area type="monotone" dataKey="value" fill={color} fillOpacity={0.08} stroke="none" />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload.flag) {
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
              }
              return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />;
            }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: "#fff" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
