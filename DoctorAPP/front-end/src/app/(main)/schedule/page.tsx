import {
  ChevronLeft,
  MapPin,
  FileText,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { fetchPatients } from "@/lib/api";
import type { PatientRecord } from "@/lib/types";
import { AnimatedRow, AnimatedSidebar } from "./_components/AnimatedScheduleRows";

/* ── Appointment data ── */

type ApptStatus = "In Progress" | "Confirmed" | "Pending";

const badgeStyles: Record<ApptStatus, string> = {
  "In Progress": "bg-[rgba(68,173,79,0.08)] text-[var(--purple-primary)]",
  Confirmed: "bg-[rgba(232,222,248,0.27)] text-[var(--text-secondary)]",
  Pending: "bg-[rgba(232,222,248,0.13)] text-[var(--text-muted)]",
};

type DotVariant = "purple" | "pink" | "lilac" | "lavender";

const dotColor: Record<DotVariant, string> = {
  purple: "bg-[var(--purple-primary)]",
  pink: "bg-[var(--purple-accent)]",
  lilac: "bg-[var(--purple-light)]",
  lavender: "bg-[var(--lavender-border)]",
};

interface ScheduleEntry {
  time: string;
  name: string;
  type: string;
  status: ApptStatus;
  dot: DotVariant;
  highlighted?: boolean;
  muted?: boolean;
}

const scheduleEntries: ScheduleEntry[] = [
  { time: "8:30 AM", name: "Amara Osei", type: "New Patient", status: "In Progress", dot: "purple", highlighted: true },
  { time: "10:30 AM", name: "David Chen", type: "Lab Review", status: "Confirmed", dot: "lilac" },
  { time: "11:45 AM", name: "Maria Santos", type: "Consultation", status: "Confirmed", dot: "purple" },
  { time: "2:00 PM", name: "Elijah Brooks", type: "Follow-up", status: "Confirmed", dot: "pink" },
  { time: "3:30 PM", name: "Priya Sharma", type: "Referral", status: "Pending", dot: "lavender", muted: true },
];

function resolveAppointments(patients: PatientRecord[]) {
  const nameToId = new Map(patients.map((p) => [p.name.toLowerCase(), p.id]));
  return scheduleEntries.map((entry) => ({
    ...entry,
    patientId: nameToId.get(entry.name.toLowerCase()) ?? null,
  }));
}

const summaryStats = [
  { num: "5", label: "Total", color: "text-[var(--purple-primary)]" },
  { num: "3", label: "Confirmed", color: "text-[var(--purple-primary)]" },
  { num: "1", label: "Pending", color: "text-[var(--purple-accent)]" },
];

const typeBreakdown = [
  { label: "Follow-ups", value: "1" },
  { label: "New Patients", value: "1" },
  { label: "Lab Reviews", value: "1" },
  { label: "Consultations", value: "1" },
];

/* ── Sub-components ── */

function Badge({ status }: { status: ApptStatus }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[10px] px-2.5 py-[3px] text-[10px] font-medium ${badgeStyles[status]}`}
    >
      {status}
    </span>
  );
}

function Divider({ strong }: { strong?: boolean }) {
  return (
    <div
      className={`h-px w-full ${strong
          ? "bg-[rgba(232,222,248,0.2)]"
          : "bg-[rgba(232,222,248,0.13)]"
        }`}
    />
  );
}

/* ── Page ── */

export default async function SchedulePage() {
  const patients = await fetchPatients().catch(() => [] as PatientRecord[]);
  const appointments = resolveAppointments(patients);

  // Find the first patient with a real ID for "Next Up"
  const nextUp = appointments.find((a) => a.patientId);

  return (
    <div className="flex min-h-0 flex-1 gap-6 p-7">
        {/* Left Column — Schedule */}
        <div className="flex min-h-0 flex-1 flex-col gap-5">
          {/* Date header with navigation */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-[22px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
                Tuesday, March 10
              </h1>
              <span className="text-[13px] font-medium tracking-[-0.1px] text-[var(--text-nav)]">
                5 appointments today
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-[20px] border border-[var(--border-nav-inactive)] transition-all hover:bg-[var(--lavender-bg)] active:scale-[0.92]">
                <ChevronLeft className="h-[18px] w-[18px] text-[var(--purple-primary)]" />
              </button>
              <button className="flex items-center justify-center rounded-[18px] border border-[var(--border-nav-inactive)] px-6 py-2 transition-all hover:bg-[var(--lavender-bg)] active:scale-[0.96]">
                <span className="text-[13px] font-medium text-[var(--purple-primary)]">
                  Today
                </span>
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-[20px] border border-[var(--border-nav-inactive)] transition-all hover:bg-[var(--lavender-bg)] active:scale-[0.92]">
                <ChevronLeft className="h-[18px] w-[18px] rotate-180 text-[var(--purple-primary)]" />
              </button>
            </div>
          </div>

          {/* Schedule card */}
          <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
            {/* Column headers */}
            <div className="flex shrink-0 items-center px-6 py-5 [border-bottom:var(--table-border-header)] bg-[rgba(255,255,255,0.4)] backdrop-blur-md">
              <span className="w-[120px] text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)]">
                Time
              </span>
              <span className="flex-1 text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)]">
                Patient
              </span>
              <span className="w-[180px] text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)]">
                Type
              </span>
              <span className="w-[120px] text-right text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)]">
                Status
              </span>
            </div>

            <Divider strong />

            {/* Appointment rows */}
            {appointments.map((appt, i) => {
              const textColor = appt.muted
                ? "text-[var(--text-muted)]"
                : "text-[var(--text-primary)]";
              const typeColor = appt.muted
                ? "text-[var(--text-muted)]"
                : "text-[var(--text-secondary)]";

              const rowClass = `row-hover flex items-center px-6 py-5 hover:bg-[var(--lavender-bg)] ${appt.highlighted ? "rounded-[12px] bg-[rgba(68,173,79,0.04)]" : ""}`;

              const rowContent = (
                <>
                  <span className={`w-[120px] text-[14px] font-semibold ${textColor}`}>
                    {appt.time}
                  </span>

                  <div className="flex flex-1 items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor[appt.dot]}`}
                    />
                    <span className={`text-[14px] font-medium ${textColor}`}>
                      {appt.name}
                    </span>
                  </div>

                  <span className={`w-[180px] text-[13px] font-medium ${typeColor}`}>
                    {appt.type}
                  </span>

                  <div className="flex w-[120px] justify-end">
                    <Badge status={appt.status} />
                  </div>
                </>
              );

              return (
                <AnimatedRow key={appt.name} index={i}>
                  {appt.patientId ? (
                    <Link href={`/dashboard/${appt.patientId}`} className={`${rowClass} cursor-pointer`}>
                      {rowContent}
                    </Link>
                  ) : (
                    <div className={rowClass}>
                      {rowContent}
                    </div>
                  )}
                  {i < appointments.length - 1 && <Divider />}
                </AnimatedRow>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex w-[340px] shrink-0 flex-col gap-8">
          {/* Next Up card */}
          <AnimatedSidebar delay={0.1}>
          <div className="glass-card flex flex-col gap-6 rounded-[24px] p-7">
            <h3 className="text-[16px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
              Next Up
            </h3>

            <div className="flex flex-col gap-2">
              <span className="text-[22px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
                Amara Osei
              </span>
              <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-nav)]">
                8:30 AM &nbsp;&middot;&nbsp; New Patient
              </span>
            </div>

            <div className="flex flex-col gap-3 py-2">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                  Suite 410, North Medical Center
                </span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                  Pelvic pain, initial consultation
                </span>
              </div>
            </div>

            <Link href={`/dashboard/${nextUp?.patientId ?? ""}`} className="glass-purple mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-[28px] transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.98]">
              <span className="text-[14px] font-medium tracking-[-0.1px] text-white">
                View Dashboard
              </span>
              <ArrowRight className="h-4 w-4 text-white" />
            </Link>
          </div>
          </AnimatedSidebar>

          {/* Today's Summary card */}
          <AnimatedSidebar delay={0.2}>
          <div className="glass-card flex flex-col gap-6 rounded-[24px] p-7">
            <h3 className="text-[16px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
              Today&apos;s Summary
            </h3>

            {/* Stats grid */}
            <div className="flex gap-4">
              {summaryStats.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-1 flex-col items-center gap-1.5 rounded-[20px] bg-[rgba(243,237,250,0.5)] py-5"
                >
                  <span className={`text-[28px] font-medium tracking-[-0.3px] ${s.color}`}>
                    {s.num}
                  </span>
                  <span className="text-[12px] font-medium text-[var(--text-muted)]">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* By Type breakdown */}
            <div className="flex flex-col gap-4 mt-2">
              <span className="text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)] border-b border-[var(--table-border-header)] pb-2 mb-1">
                By Type
              </span>
              {typeBreakdown.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-[14px] font-medium text-[var(--text-primary)]">
                    {t.label}
                  </span>
                  <span className="text-[14px] font-medium text-[var(--purple-primary)]">
                    {t.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          </AnimatedSidebar>
        </div>
      </div>
  );
}

