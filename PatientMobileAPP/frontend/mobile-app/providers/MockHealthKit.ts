/**
 * Deterministic Mock Data Provider
 *
 * Safely bypasses Apple HealthKit on web builds by returning a fixed,
 * reproducible biometric dataset that mirrors the CLAUDE.md acute_7_day
 * payload. Every call returns identical values — no randomness, no
 * side-effects, no native module dependency.
 */

export interface BiometricPoint {
  date: string;
  value: number;
  unit: string;
  flag?: string;
}

export interface BiometricSeries {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
  data: BiometricPoint[];
  baselineAvg: number;
}

export function getMockBiometrics(): BiometricSeries[] {
  return [
    {
      key: "hrv",
      label: "Heart Rate Variability (SDNN)",
      shortLabel: "HRV",
      unit: "ms",
      baselineAvg: 44.1,
      data: [
        { date: "Feb 15", value: 48.2, unit: "ms" },
        { date: "Feb 16", value: 47.1, unit: "ms" },
        { date: "Feb 17", value: 45.9, unit: "ms" },
        { date: "Feb 18", value: 22.4, unit: "ms", flag: "severe_drop" },
        { date: "Feb 19", value: 24.1, unit: "ms" },
        { date: "Feb 20", value: 28.5, unit: "ms" },
        { date: "Feb 21", value: 31.0, unit: "ms" },
      ],
    },
    {
      key: "rhr",
      label: "Resting Heart Rate",
      shortLabel: "RHR",
      unit: "bpm",
      baselineAvg: 64.8,
      data: [
        { date: "Feb 15", value: 62, unit: "bpm" },
        { date: "Feb 16", value: 63, unit: "bpm" },
        { date: "Feb 17", value: 62, unit: "bpm" },
        { date: "Feb 18", value: 78, unit: "bpm", flag: "elevated" },
        { date: "Feb 19", value: 76, unit: "bpm" },
        { date: "Feb 20", value: 74, unit: "bpm" },
        { date: "Feb 21", value: 72, unit: "bpm" },
      ],
    },
    {
      key: "temp",
      label: "Wrist Temperature Deviation",
      shortLabel: "Temp",
      unit: "°C",
      baselineAvg: -0.06,
      data: [
        { date: "Feb 15", value: -0.12, unit: "°C" },
        { date: "Feb 16", value: -0.10, unit: "°C" },
        { date: "Feb 17", value: 0.05, unit: "°C" },
        { date: "Feb 18", value: 0.85, unit: "°C", flag: "sustained_high" },
        { date: "Feb 19", value: 0.92, unit: "°C" },
        { date: "Feb 20", value: 0.80, unit: "°C" },
        { date: "Feb 21", value: 0.75, unit: "°C" },
      ],
    },
    {
      key: "resp",
      label: "Respiratory Rate",
      shortLabel: "Resp",
      unit: "br/min",
      baselineAvg: 14.8,
      data: [
        { date: "Feb 15", value: 14.5, unit: "br/min" },
        { date: "Feb 16", value: 14.6, unit: "br/min" },
        { date: "Feb 17", value: 14.5, unit: "br/min" },
        { date: "Feb 18", value: 18.2, unit: "br/min", flag: "elevated" },
        { date: "Feb 19", value: 17.8, unit: "br/min" },
        { date: "Feb 20", value: 16.5, unit: "br/min" },
        { date: "Feb 21", value: 16.0, unit: "br/min" },
      ],
    },
    {
      key: "steps",
      label: "Daily Step Count",
      shortLabel: "Steps",
      unit: "steps",
      baselineAvg: 8433,
      data: [
        { date: "Feb 15", value: 8500, unit: "steps" },
        { date: "Feb 16", value: 8200, unit: "steps" },
        { date: "Feb 17", value: 8600, unit: "steps" },
        { date: "Feb 18", value: 1200, unit: "steps", flag: "mobility_drop" },
        { date: "Feb 19", value: 1500, unit: "steps" },
        { date: "Feb 20", value: 2500, unit: "steps" },
        { date: "Feb 21", value: 3000, unit: "steps" },
      ],
    },
    {
      key: "sleep",
      label: "Sleep Awake Segments",
      shortLabel: "Sleep",
      unit: "wakes",
      baselineAvg: 1.3,
      data: [
        { date: "Feb 15", value: 1, unit: "wakes" },
        { date: "Feb 16", value: 1, unit: "wakes" },
        { date: "Feb 17", value: 2, unit: "wakes" },
        { date: "Feb 18", value: 6, unit: "wakes", flag: "painsomnia" },
        { date: "Feb 19", value: 5, unit: "wakes" },
        { date: "Feb 20", value: 4, unit: "wakes" },
        { date: "Feb 21", value: 3, unit: "wakes" },
      ],
    },
  ];
}
