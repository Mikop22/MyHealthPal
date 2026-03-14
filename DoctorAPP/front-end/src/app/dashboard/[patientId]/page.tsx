"use client";

import {
  CircleUserRound,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

/* ── Page ── */

export default function DashboardPage() {
  const { patientId } = useParams<{ patientId: string }>();

  return (
    <div className="flex h-screen w-full flex-col bg-transparent font-poppins">
      {/* ── Navigation Bar ── */}
      <nav className="glass-nav flex h-14 md:h-16 shrink-0 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/patients" className="gradient-logo text-[20px] md:text-[24px] font-medium tracking-[-0.1px]">
            MyHealthPal
          </Link>
          <div className="flex gap-1.5 md:gap-2">
            <Link href="/patients" className="nav-pill-active flex items-center justify-center rounded-[20px] px-3 md:px-5 py-1.5 md:py-2">
              <span className="text-[13px] md:text-[14px] font-medium tracking-[-0.1px] text-[var(--purple-primary)]">Patients</span>
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

      {/* ── Dashboard Content (SWR polling) ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-8 p-4 md:p-8 overflow-y-auto">
        <DashboardClient patientId={patientId} />

        {/* ═══ ACTION ROW ═══ */}
        <div className="mt-2 flex shrink-0 items-center justify-between pb-2">
          <Link href="/patients" className="flex items-center gap-1.5 transition-opacity hover:opacity-70">
            <ChevronLeft className="h-5 w-5 text-[var(--purple-primary)]" />
            <span className="text-[14px] md:text-[16px] font-medium tracking-[-0.1px] text-[var(--purple-primary)]">Back</span>
          </Link>
          <Link href={`/notes/${patientId}`} className="glass-card flex items-center gap-2 md:gap-2.5 rounded-[26px] px-5 md:px-8 py-2.5 md:py-3.5 transition-all hover:brightness-[1.02] active:scale-[0.98]">
            <NotebookPen className="h-4 w-4 md:h-5 md:w-5 text-[var(--purple-primary)]" />
            <span className="text-[14px] md:text-[16px] font-medium tracking-[-0.1px] text-[var(--purple-primary)]">Notes</span>
            <ChevronRight className="h-[16px] w-[16px] md:h-[18px] md:w-[18px] text-[var(--purple-primary)]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
