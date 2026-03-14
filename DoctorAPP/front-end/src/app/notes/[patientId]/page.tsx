import {
  CircleUserRound,
  ChevronDown,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { DiagnosticNudgeAccordion } from "@/app/_components/DiagnosticNudgeAccordion";
import { getDashboardData, fetchPatients } from "@/lib/api";
import { NotesEditor } from "./NotesEditor";

/* ── Page ── */

export default async function NotesPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  // Fetch dashboard data and patient list in parallel
  const [result, patients] = await Promise.all([
    getDashboardData(patientId).catch(() => null),
    fetchPatients().catch(() => []),
  ]);

  const patient = patients.find((p) => p.id === patientId);
  const patientName = patient?.name ?? "Patient";

  const condition_matches = result?.condition_matches ?? [];

  return (
    <div className="flex h-full w-full flex-col bg-transparent font-poppins">
      {/* ── Navigation Bar ── */}
      <nav className="glass-nav flex h-14 md:h-16 shrink-0 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/patients" className="gradient-logo text-[20px] md:text-[24px] font-medium tracking-[-0.1px]">
            MyHealthPal
          </Link>
          <div className="flex gap-1.5 md:gap-2">
            <Link href="/patients" className="flex items-center justify-center rounded-[20px] border border-[var(--border-nav-inactive)] bg-transparent px-3 md:px-5 py-1.5 md:py-2 transition-colors hover:bg-[var(--lavender-bg)]">
              <span className="text-[13px] md:text-[14px] font-medium tracking-[-0.1px] text-[var(--text-nav)]">Patients</span>
            </Link>
            <Link href="/schedule" className="flex items-center justify-center rounded-[20px] border border-[var(--border-nav-inactive)] bg-transparent px-3 md:px-5 py-1.5 md:py-2 transition-colors hover:bg-[var(--lavender-bg)]">
              <span className="text-[13px] md:text-[14px] font-medium tracking-[-0.1px] text-[var(--text-nav)]">Schedule</span>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <CircleUserRound className="h-6 w-6 md:h-7 md:w-7 text-[var(--purple-primary)]" strokeWidth={1.5} />
          <span className="hidden sm:inline text-[14px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">Dr. Patel</span>
          <ChevronDown className="hidden sm:block h-4 w-4 text-[var(--text-nav)]" />
        </div>
      </nav>

      {/* ── Notes Content ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-6 px-4 md:px-8 py-4 md:py-8 overflow-y-auto">
        {/* Patient header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.3px] text-[var(--text-primary)]">
              {patientName}
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-[16px] bg-[rgba(243,237,250,0.5)] px-3 md:px-4 py-2">
            <span className="text-[13px] md:text-[14px] font-medium tracking-[0.5px] uppercase text-[var(--text-secondary)]">Date:</span>
            <span className="text-[13px] md:text-[14px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Main area: notes + research sidebar */}
        <div className="flex flex-col lg:flex-row min-h-0 flex-1 gap-4 md:gap-8">
          {/* Notes card — editable ruled notebook */}
          <NotesEditor patientId={patientId} />

          {/* Research sidebar */}
          <div className="glass-card flex w-full lg:w-[760px] shrink-0 flex-col gap-5 overflow-y-auto rounded-[20px] md:rounded-[24px] px-5 md:px-7 py-6 md:py-8 max-h-[400px] lg:max-h-none">
            <h3 className="text-[15px] md:text-[16px] font-semibold tracking-[-0.1px] text-[var(--text-primary)]">
              Notable Research
            </h3>
            <DiagnosticNudgeAccordion matches={condition_matches} showPdf />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/${patientId}`}
            className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
          >
            <ChevronLeft className="h-[16px] w-[16px] md:h-[18px] md:w-[18px] text-[var(--purple-primary)]" />
            <span className="text-[13px] md:text-[14px] font-medium tracking-[-0.1px] text-[var(--purple-primary)]">Back</span>
          </Link>

          <button className="glass-purple flex items-center gap-2 rounded-[20px] px-4 md:px-5 py-2 md:py-2.5 transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.98]">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="text-[12px] md:text-[13px] font-medium text-white">Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  );
}
