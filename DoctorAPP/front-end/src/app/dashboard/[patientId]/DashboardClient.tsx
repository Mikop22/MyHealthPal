"use client";

import useSWR from "swr";
import type { AnalysisResponse, PatientRecord } from "@/lib/types";
import { DashboardContent } from "./DashboardContent";

async function fetchDashboard(url: string): Promise<AnalysisResponse> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "ngrok-skip-browser-warning": "true" },
  });
  if (!res.ok) {
    const err = new Error("Dashboard data not ready");
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json();
}

async function fetchPatient(url: string): Promise<PatientRecord> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "ngrok-skip-browser-warning": "true" },
  });
  if (!res.ok) {
    throw new Error("Patient not found");
  }
  return res.json();
}

interface DashboardClientProps {
  patientId: string;
}

export function DashboardClient({ patientId }: DashboardClientProps) {
  const { data, error, isLoading } = useSWR<AnalysisResponse>(
    `/api/v1/patients/${patientId}/dashboard`,
    fetchDashboard,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      errorRetryInterval: 3000,
    }
  );

  const { data: patient } = useSWR<PatientRecord>(
    `/api/v1/patients/${patientId}`,
    fetchPatient,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const isTestPatient = patient?.email.includes("demo.myhealthpal.com");

  if (isLoading || (!data && !error)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--lavender-border)] border-t-[var(--purple-primary)]" />
          <p className="text-[16px] font-medium text-[var(--text-primary)]">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--lavender-bg)] flex items-center justify-center">
            <div className="h-5 w-5 rounded-full bg-[var(--purple-primary)] animate-ping" />
          </div>
          <p className="text-[18px] font-medium text-[var(--text-primary)]">
            {isTestPatient ? "Analyzing symptoms with AI…" : "Waiting for patient intake…"}
          </p>
          <p className="text-[14px] text-[var(--text-muted)]">
            {isTestPatient 
              ? "The AI is processing symptoms and generating clinical insights. This usually takes 10-15 seconds."
              : "The dashboard will automatically update once the patient completes their intake form."
            }
          </p>
          <p className="text-[12px] text-[var(--text-muted)]">Polling every 3 seconds</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return <DashboardContent data={data} patientId={patientId} />;
}
