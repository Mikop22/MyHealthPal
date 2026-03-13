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
      <nav className="glass-nav flex h-16 shrink-0 items-center justify-between px-8">
        <div className="flex items-center gap-8">
          <Link href="/patients" className="gradient-logo text-[24px] font-medium tracking-[-0.1px]">
            MyHealthPal
          </Link>
          <div className="flex gap-2">
            <Link href="/patients" className="nav-pill-active flex items-center justify-center rounded-[20px] px-5 py-2">
              <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--purple-primary)]">Patients</span>
            </Link>
            <Link href="/schedule" className="flex items-center justify-center rounded-[20px] border border-[var(--border-nav-inactive)] bg-transparent px-5 py-2 transition-colors hover:bg-[var(--lavender-bg)]">
              <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-nav)]">Schedule</span>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CircleUserRound className="h-7 w-7 text-[var(--purple-primary)]" strokeWidth={1.5} />
          <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">Dr. Patel</span>
          <ChevronDown className="h-4 w-4 text-[var(--text-nav)]" />
        </div>
      </nav>

      {/* ── Dashboard Content (SWR polling) ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-8 p-8">
        <DashboardClient patientId={patientId} />

        {/* ═══ ACTION ROW ═══ */}
        <div className="mt-2 flex shrink-0 items-center justify-between pb-2">
          <Link href="/patients" className="flex items-center gap-1.5 transition-opacity hover:opacity-70">
            <ChevronLeft className="h-5 w-5 text-[var(--purple-primary)]" />
            <span className="text-[16px] font-medium tracking-[-0.1px] text-[var(--purple-primary)]">Back</span>
          </Link>
          <Link href={`/notes/${patientId}`} className="glass-card flex items-center gap-2.5 rounded-[26px] px-8 py-3.5 transition-all hover:brightness-[1.02] active:scale-[0.98]">
            <NotebookPen className="h-5 w-5 text-[var(--purple-primary)]" />
            <span className="text-[16px] font-medium tracking-[-0.1px] text-[var(--purple-primary)]">Notes</span>
            <ChevronRight className="h-[18px] w-[18px] text-[var(--purple-primary)]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
