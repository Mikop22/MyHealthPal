import {
  ChevronLeft,
  MapPin,
  FileText,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { fetchPatients, fetchAppointmentsByDate } from "@/lib/api";
import type { PatientRecord, AppointmentRecord } from "@/lib/types";
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
  id: string;
  time: string;
  name: string;
  type: string;
  status: ApptStatus;
  dot: DotVariant;
  highlighted?: boolean;
  muted?: boolean;
  patientId: string | null;
}

const DOT_VARIANTS: DotVariant[] = ["purple", "pink", "lilac", "lavender"];

function mapStatus(backendStatus: string): ApptStatus {
  if (backendStatus === "completed" || backendStatus === "in_progress") return "In Progress";
  if (backendStatus === "scheduled") return "Confirmed";
  return "Pending";
}

function mapAppointmentsToEntries(
  appointments: AppointmentRecord[],
  patients: PatientRecord[],
): ScheduleEntry[] {
  const idToName = new Map(patients.map((p) => [p.id, p.name]));
  return appointments.map((appt, i) => ({
    id: appt.id,
    time: appt.time || "TBD",
    name: idToName.get(appt.patient_id) ?? "Unknown Patient",
    type: appt.status === "completed" ? "Follow-up" : "Consultation",
    status: mapStatus(appt.status),
    dot: DOT_VARIANTS[i % DOT_VARIANTS.length],
    highlighted: i === 0,
    muted: appt.status === "pending",
    patientId: appt.patient_id,
  }));
}

function deriveSummary(entries: ScheduleEntry[]) {
  const total = entries.length;
  const confirmed = entries.filter((e) => e.status === "Confirmed").length;
  const pending = entries.filter((e) => e.status === "Pending").length;
  return [
    { num: String(total), label: "Total", color: "text-[var(--purple-primary)]" },
    { num: String(confirmed), label: "Confirmed", color: "text-[var(--purple-primary)]" },
    { num: String(pending), label: "Pending", color: "text-[var(--purple-accent)]" },
  ];
}

function deriveTypeBreakdown(entries: ScheduleEntry[]) {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.type] = (counts[e.type] || 0) + 1;
  }
  return Object.entries(counts).map(([label, value]) => ({
    label: label.endsWith("s") ? label : label + "s",
    value: String(value),
  }));
}

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
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [patients, rawAppointments] = await Promise.all([
    fetchPatients().catch(() => [] as PatientRecord[]),
    fetchAppointmentsByDate(today).catch(() => [] as AppointmentRecord[]),
  ]);

  const appointments = rawAppointments.length > 0
    ? mapAppointmentsToEntries(rawAppointments, patients)
    : [];

  const summaryStats = deriveSummary(appointments);
  const typeBreakdown = deriveTypeBreakdown(appointments);

  // Find the first patient with a real ID for "Next Up"
  const nextUp = appointments.find((a) => a.patientId);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row gap-5 lg:gap-6 p-4 md:p-7 overflow-y-auto lg:overflow-hidden">
        {/* Left Column — Schedule */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-5">
          {/* Date header with navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-[18px] md:text-[22px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
                {dateLabel}
              </h1>
              <span className="text-[13px] font-medium tracking-[-0.1px] text-[var(--text-nav)]">
                {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} today
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-[20px] border border-[var(--border-nav-inactive)] transition-all hover:bg-[var(--lavender-bg)] active:scale-[0.92]">
                <ChevronLeft className="h-[16px] w-[16px] md:h-[18px] md:w-[18px] text-[var(--purple-primary)]" />
              </button>
              <button className="flex items-center justify-center rounded-[18px] border border-[var(--border-nav-inactive)] px-4 md:px-6 py-2 transition-all hover:bg-[var(--lavender-bg)] active:scale-[0.96]">
                <span className="text-[13px] font-medium text-[var(--purple-primary)]">
                  Today
                </span>
              </button>
              <button className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-[20px] border border-[var(--border-nav-inactive)] transition-all hover:bg-[var(--lavender-bg)] active:scale-[0.92]">
                <ChevronLeft className="h-[16px] w-[16px] md:h-[18px] md:w-[18px] rotate-180 text-[var(--purple-primary)]" />
              </button>
            </div>
          </div>

          {/* Schedule card */}
          <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] md:rounded-[24px]">
            {/* Column headers — hidden on mobile */}
            <div className="hidden md:flex shrink-0 items-center px-6 py-5 [border-bottom:var(--table-border-header)] bg-[rgba(255,255,255,0.4)] backdrop-blur-md">
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

              const rowClass = `row-hover flex flex-col md:flex-row md:items-center px-4 md:px-6 py-3 md:py-5 gap-1.5 md:gap-0 hover:bg-[var(--lavender-bg)] ${appt.highlighted ? "rounded-[12px] bg-[rgba(68,173,79,0.04)]" : ""}`;

              const rowContent = (
                <>
                  {/* Mobile: time + status inline */}
                  <div className="flex md:hidden items-center justify-between">
                    <span className={`text-[13px] font-semibold ${textColor}`}>
                      {appt.time}
                    </span>
                    <Badge status={appt.status} />
                  </div>

                  {/* Desktop: time column */}
                  <span className={`hidden md:inline w-[120px] text-[14px] font-semibold ${textColor}`}>
                    {appt.time}
                  </span>

                  <div className="flex flex-1 items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor[appt.dot]}`}
                    />
                    <span className={`text-[14px] font-medium ${textColor}`}>
                      {appt.name}
                    </span>
                    {/* Mobile: show type inline */}
                    <span className={`md:hidden text-[12px] font-medium ${typeColor}`}>
                      · {appt.type}
                    </span>
                  </div>

                  <span className={`hidden md:inline w-[180px] text-[13px] font-medium ${typeColor}`}>
                    {appt.type}
                  </span>

                  <div className="hidden md:flex w-[120px] justify-end">
                    <Badge status={appt.status} />
                  </div>
                </>
              );

              return (
                <AnimatedRow key={appt.id} index={i}>
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
        <div className="flex w-full lg:w-[340px] shrink-0 flex-col gap-6 lg:gap-8">
          {/* Next Up card */}
          <AnimatedSidebar delay={0.1}>
          <div className="glass-card flex flex-col gap-4 md:gap-6 rounded-[24px] p-5 md:p-7">
            <h3 className="text-[16px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
              Next Up
            </h3>

            <div className="flex flex-col gap-2">
              <span className="text-[22px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
                {nextUp?.name ?? "No upcoming"}
              </span>
              <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-nav)]">
                {nextUp ? `${nextUp.time} \u00B7 ${nextUp.type}` : "No appointments today"}
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
          <div className="glass-card flex flex-col gap-4 md:gap-6 rounded-[24px] p-5 md:p-7">
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

