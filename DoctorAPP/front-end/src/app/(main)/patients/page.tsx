"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  CalendarPlus,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchPatients, createTestPatient } from "@/lib/api";
import type { PatientRecord } from "@/lib/types";
import { useCountUp } from "@/lib/useCountUp";
import { ScheduleModal } from "./_components/ScheduleModal";

type Status = "In Progress" | "Stable" | "Review" | "Pending" | "Completed";

const statusStyles: Record<Status, string> = {
  "In Progress": "bg-[var(--lavender-bg)] text-[var(--purple-primary)] bg-opacity-80 font-semibold",
  Stable: "bg-[var(--green-bg)] text-[var(--green-text)] bg-opacity-80 font-semibold",
  Review: "bg-[var(--orange-bg)] text-[var(--orange-text)] bg-opacity-80 font-semibold",
  Pending: "bg-[var(--orange-bg)] text-[var(--orange-text)] bg-opacity-80 font-semibold",
  Completed: "bg-[var(--green-bg)] text-[var(--green-text)] bg-opacity-80 font-semibold",
};

const statColor: Record<string, string> = {
  Total: "text-[var(--purple-primary)]",
  Review: "text-[var(--orange-text)]",
  Stable: "text-[var(--green-text)]",
};

const HARDCODED_PATIENTS: PatientRecord[] = [];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Priority — derived from patient status ───────────────────────────────────
type Priority = "High Priority" | "Review Needed" | "Stable";

function getPriority(patient: PatientRecord): Priority {
  switch (patient.status) {
    case "Review":       return "High Priority";
    case "In Progress":
    case "Pending":      return "Review Needed";
    default:             return "Stable";
  }
}

const priorityStyles: Record<Priority, React.CSSProperties> = {
  "High Priority": {
    background: "rgba(226,92,92,0.11)",
    color: "var(--red-alert)",
  },
  "Review Needed": {
    background: "var(--orange-bg)",
    color: "var(--orange-text)",
  },
  "Stable": {
    background: "var(--green-bg)",
    color: "var(--green-text)",
  },
};

// ─── Last Sync — relative time from created_at (proxy for initial health sync) ─
function getRelativeTime(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffHrs = Math.floor(diffMs / 36e5);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// ─── Priority pill ────────────────────────────────────────────────────────────
function PriorityBadge({ priority, delay = 0 }: { priority: Priority; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className="inline-flex items-center justify-center rounded-[12px] px-3 py-1 text-[11px] font-semibold"
      style={priorityStyles[priority]}
    >
      {priority}
    </motion.span>
  );
}

function StatusBadge({ status, delay = 0 }: { status: string; delay?: number }) {
  const style = statusStyles[status as Status] || statusStyles.Pending;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-flex items-center justify-center rounded-[12px] px-3 py-1 text-[11px] font-medium ${style}`}
    >
      {status}
    </motion.span>
  );
}

// Updated skeleton to match the new 6-column layout
function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      className={`flex items-center px-6 py-5 ${index < 4 ? "[border-bottom:var(--table-border-row)]" : ""}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex w-[280px] items-center gap-3">
        <div className="skeleton-pulse h-9 w-9 shrink-0 rounded-[16px]" />
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-pulse h-3.5 w-28 rounded" />
          <div className="skeleton-pulse h-2.5 w-36 rounded" />
        </div>
      </div>
      <div className="min-w-0 flex-1 pr-4"><div className="skeleton-pulse h-3.5 w-32 rounded" /></div>
      <div className="w-[130px]"><div className="skeleton-pulse h-6 w-24 rounded-[12px]" /></div>
      <div className="w-[130px]"><div className="skeleton-pulse h-3.5 w-20 rounded" /></div>
      <div className="w-[110px]"><div className="skeleton-pulse h-6 w-20 rounded-[12px]" /></div>
      <div className="w-[110px]"><div className="skeleton-pulse h-8 w-24 rounded-[14px]" /></div>
    </div>
  );
}

function CountUpStat({ target, className }: { target: number; className: string }) {
  const value = useCountUp(target);
  return <span className={className}>{value}</span>;
}

const activities = [
  { name: "Jordan Lee — Follow-up", time: "Today, 8:30 AM", active: true },
  { name: "David Chen — Lab Review", time: "Yesterday, 2:15 PM", active: false },
  { name: "Amara Osei — Notes updated", time: "Yesterday, 11:00 AM", active: false },
];

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleTarget, setScheduleTarget] = useState<PatientRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingTest, setCreatingTest] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const router = useRouter();

  const loadPatients = useCallback(async () => {
    try {
      const data = await fetchPatients();
      setPatients([...HARDCODED_PATIENTS as PatientRecord[], ...data]);
    } catch {
      setPatients(HARDCODED_PATIENTS as PatientRecord[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleCreateTestPatient = async () => {
    setCreatingTest(true);
    setTestError(null);
    try {
      const patient = await createTestPatient();
      await loadPatients();
      router.push(`/dashboard/${patient.id}`);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Failed to create test patient");
    } finally {
      setCreatingTest(false);
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.concern.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCount = patients.length;
  const reviewCount = patients.filter((p) => p.status === "Review").length;
  const stableCount = patients.filter((p) => p.status === "Stable").length;

  return (
    <>
      <div className="flex min-h-0 flex-1 gap-8 p-8">
        {/* Left Column — Patient List */}
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          {/* Welcome header */}
          <motion.div
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between pb-2"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-muted)]">
                Welcome back,
              </span>
              <h1 className="text-[32px] font-medium tracking-[-0.3px] text-[var(--text-primary)]">
                Dr. Maya Patel
              </h1>
            </div>
            <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-muted)]">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </motion.div>

          {/* Section header with search */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-[28px] font-medium tracking-[-0.3px] text-[var(--text-primary)]">
                Your Patients
              </h2>
              <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-muted)]">
                {totalCount} active patient{totalCount !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="glass-control shadow-sm border border-[var(--border-nav-inactive)] flex h-12 w-[380px] items-center gap-2.5 rounded-[24px] px-5">
                <Search className="h-[20px] w-[20px] shrink-0 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search patients..."
                  className="flex-1 bg-transparent text-[15px] font-medium tracking-[-0.1px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
              </div>
              <button className="glass-control shadow-sm border border-[var(--border-nav-inactive)] flex h-12 items-center gap-2 rounded-[24px] px-6 transition-all hover:bg-[rgba(243,237,250,0.5)] active:scale-[0.97]">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-[var(--text-nav)]" />
                <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-nav)]">
                  Filters
                </span>
              </button>
              <button
                onClick={handleCreateTestPatient}
                disabled={creatingTest}
                className="glass-purple flex h-12 items-center gap-2 rounded-[24px] px-6 transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait"
              >
                <FlaskConical className="h-4 w-4 shrink-0 text-white" />
                <span className="text-[14px] font-medium tracking-[-0.1px] text-white whitespace-nowrap">
                  {creatingTest ? "Running AI Pipeline…" : "Add Test Patient"}
                </span>
              </button>
            </div>
          </div>

          {testError && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[14px] px-4 py-3 text-[13px] font-medium text-red-600"
              style={{
                background: "rgba(255,200,200,0.25)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,150,150,0.3)",
              }}
            >
              {testError}
            </motion.div>
          )}

          {/* Patient table card */}
          <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
            {/* Column headers — XRP WALLET removed; PRIORITY + LAST SYNC added */}
            <div className="flex shrink-0 items-center px-6 py-5 [border-bottom:var(--table-border-header)] bg-[rgba(255,255,255,0.4)] backdrop-blur-md">
              <div className="w-[280px] text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)]">
                Patient
              </div>
              <div className="flex-1 text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)]">
                Primary Concern
              </div>
              <div className="w-[130px] text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)]">
                Priority
              </div>
              <div className="w-[130px] text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)]">
                Last Sync
              </div>
              <div className="w-[110px] text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)]">
                Status
              </div>
              <div className="w-[110px] text-[12px] font-semibold tracking-[1px] uppercase text-[var(--text-secondary)]">
                Actions
              </div>
            </div>

            {/* Patient rows */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div>{[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} index={i} />)}</div>
              ) : filteredPatients.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <span className="text-[14px] text-[var(--text-muted)]">No patients found</span>
                </div>
              ) : (
                filteredPatients.map((patient, index) => {
                  const priority = getPriority(patient);
                  const syncTime = getRelativeTime(patient.created_at);

                  return (
                    <motion.div
                      key={patient.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={`/dashboard/${patient.id}`}
                        className={`row-hover flex items-center px-6 py-5 hover:bg-[var(--lavender-bg)] ${
                          index < filteredPatients.length - 1
                            ? "[border-bottom:var(--table-border-row)]"
                            : ""
                        }`}
                      >
                        {/* Patient */}
                        <div className="flex w-[280px] items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] text-[13px] font-medium ${
                              index % 2 === 0
                                ? "bg-[var(--avatar-purple-bg)] text-[var(--purple-primary)]"
                                : "bg-[var(--avatar-lavender-bg)] text-[var(--purple-dark)]"
                            }`}
                          >
                            {getInitials(patient.name)}
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
                              {patient.name}
                            </span>
                            <span className="truncate text-[11px] text-[var(--text-muted)]">
                              {patient.email}
                            </span>
                          </div>
                        </div>

                        {/* Primary Concern — min-w-0 lets the flex item shrink/wrap freely */}
                        <div className="min-w-0 flex-1 pr-4 text-[14px] font-medium tracking-[-0.1px] text-[var(--text-secondary)]">
                          <span className="block whitespace-normal break-words">
                            {patient.concern || "—"}
                          </span>
                        </div>

                        {/* Priority — replaces the XRP Wallet column */}
                        <div className="w-[130px]">
                          <PriorityBadge priority={priority} delay={index * 0.04 + 0.15} />
                        </div>

                        {/* Last Sync */}
                        <div className="w-[130px]">
                          <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                            {syncTime}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="w-[110px]">
                          <StatusBadge status={patient.status} delay={index * 0.04 + 0.2} />
                        </div>

                        {/* Actions */}
                        <div className="w-[110px]">
                          <button
                            onClick={(e) => { e.preventDefault(); setScheduleTarget(patient); }}
                            className="flex items-center gap-2 rounded-[14px] border border-[var(--border-nav-inactive)] px-4 py-2 text-[13px] font-medium text-[var(--purple-primary)] transition-all hover:bg-[var(--lavender-bg)] active:scale-[0.96]"
                          >
                            <CalendarPlus className="h-[16px] w-[16px]" />
                            Schedule
                          </button>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar — unchanged */}
        <div className="flex w-[340px] shrink-0 flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-[24px] p-7"
          >
            <h3 className="text-[16px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
              Overview
            </h3>
            <div className="mt-6 flex flex-col gap-4">
              {[
                { target: totalCount, label: "Total Patients" },
                { target: reviewCount, label: "Needs Review" },
                { target: stableCount, label: "Stable Condition" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-[var(--text-primary)]">
                    {s.label}
                  </span>
                  <CountUpStat
                    target={s.target}
                    className={`text-[24px] font-medium tracking-[-0.3px] ${
                      statColor[s.label.split(" ")[0]] || "text-[var(--purple-primary)]"
                    }`}
                  />
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card flex flex-col gap-5 rounded-[24px] p-7"
          >
            <h3 className="text-[16px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
              Recent Activity
            </h3>
            {activities.map((activity) => (
              <div key={activity.name} className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    activity.active ? "bg-[var(--purple-primary)]" : "bg-[var(--text-muted)]"
                  }`}
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
                    {activity.name}
                  </span>
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
      </div>
      </div>

      {scheduleTarget && (
        <ScheduleModal
          open={!!scheduleTarget}
          patientId={scheduleTarget.id}
          patientName={scheduleTarget.name}
          onClose={() => setScheduleTarget(null)}
          onScheduled={loadPatients}
        />
      )}
    </>
  );
}
