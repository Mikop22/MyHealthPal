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
import { fetchPatients, createTestPatient, submitTestPatientAnalysis } from "@/lib/api";
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
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [patientNarrative, setPatientNarrative] = useState("");
  const [currentTestPatient, setCurrentTestPatient] = useState<PatientRecord | null>(null);
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
      // Create patient immediately with default narrative
      const patient = await createTestPatient();
      setCurrentTestPatient(patient);
      await loadPatients();
      setShowOnboardingModal(true);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Failed to create test patient");
    } finally {
      setCreatingTest(false);
    }
  };

  const handleOnboardingSubmit = async () => {
    if (!currentTestPatient) return;
    
    setCreatingTest(true);
    setTestError(null);
    try {
      // Update the patient with custom narrative
      await submitTestPatientAnalysis(currentTestPatient.id);
      setShowOnboardingModal(false);
      setPatientNarrative("");
      setCurrentTestPatient(null);
      await loadPatients();
      router.push(`/dashboard/${currentTestPatient.id}`);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Failed to submit analysis");
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
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row gap-6 lg:gap-8 p-4 md:p-8 overflow-y-auto lg:overflow-hidden">
        {/* Left Column — Patient List */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-6">
          {/* Welcome header */}
          <motion.div
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-muted)]">
                Welcome back,
              </span>
              <h1 className="text-[24px] md:text-[32px] font-medium tracking-[-0.3px] text-[var(--text-primary)]">
                Dr. Maya Patel
              </h1>
            </div>
            <span className="text-[13px] md:text-[14px] font-medium tracking-[-0.1px] text-[var(--text-muted)]">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </motion.div>

          {/* Section header with search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-[22px] md:text-[28px] font-medium tracking-[-0.3px] text-[var(--text-primary)]">
                Your Patients
              </h2>
              <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-muted)]">
                {totalCount} active patient{totalCount !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="glass-control shadow-sm border border-[var(--border-nav-inactive)] flex h-10 md:h-12 flex-1 sm:flex-none sm:w-[280px] lg:w-[380px] items-center gap-2.5 rounded-[24px] px-4 md:px-5">
                <Search className="h-[18px] w-[18px] md:h-[20px] md:w-[20px] shrink-0 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search patients..."
                  className="flex-1 bg-transparent text-[14px] md:text-[15px] font-medium tracking-[-0.1px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
              </div>
              <button aria-label="Filters" className="glass-control shadow-sm border border-[var(--border-nav-inactive)] flex h-10 md:h-12 items-center gap-2 rounded-[24px] px-4 md:px-6 transition-all hover:bg-[rgba(243,237,250,0.5)] active:scale-[0.97]">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-[var(--text-nav)]" />
                <span className="hidden sm:inline text-[14px] font-medium tracking-[-0.1px] text-[var(--text-nav)]">
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
                  {creatingTest ? "Creating Patient…" : "Test Patient Onboarding"}
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
          <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] md:rounded-[24px]">
            {/* Column headers — hidden on mobile, visible on desktop */}
            <div className="hidden md:flex shrink-0 items-center px-6 py-5 [border-bottom:var(--table-border-header)] bg-[rgba(255,255,255,0.4)] backdrop-blur-md">
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
                        className={`row-hover flex flex-col md:flex-row md:items-center px-4 md:px-6 py-3 md:py-5 gap-2 md:gap-0 hover:bg-[var(--lavender-bg)] ${
                          index < filteredPatients.length - 1
                            ? "[border-bottom:var(--table-border-row)]"
                            : ""
                        }`}
                      >
                        {/* Patient */}
                        <div className="flex md:w-[280px] items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] text-[13px] font-medium ${
                              index % 2 === 0
                                ? "bg-[var(--avatar-purple-bg)] text-[var(--purple-primary)]"
                                : "bg-[var(--avatar-lavender-bg)] text-[var(--purple-dark)]"
                            }`}
                          >
                            {getInitials(patient.name)}
                          </div>
                          <div className="flex min-w-0 flex-col flex-1">
                            <span className="text-[14px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
                              {patient.name}
                            </span>
                            <span className="truncate text-[11px] text-[var(--text-muted)]">
                              {patient.email}
                            </span>
                          </div>
                          {/* Mobile-only: badges inline with name */}
                          <div className="flex md:hidden items-center gap-2">
                            <PriorityBadge priority={priority} delay={index * 0.04 + 0.15} />
                            <StatusBadge status={patient.status} delay={index * 0.04 + 0.2} />
                          </div>
                        </div>

                        {/* Primary Concern */}
                        <div className="md:min-w-0 md:flex-1 md:pr-4 text-[13px] md:text-[14px] font-medium tracking-[-0.1px] text-[var(--text-secondary)] pl-12 md:pl-0">
                          <span className="block whitespace-normal break-words">
                            {patient.concern || "—"}
                          </span>
                        </div>

                        {/* Desktop-only columns */}
                        <div className="hidden md:block w-[130px]">
                          <PriorityBadge priority={priority} delay={index * 0.04 + 0.15} />
                        </div>

                        <div className="hidden md:block w-[130px]">
                          <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                            {syncTime}
                          </span>
                        </div>

                        <div className="hidden md:block w-[110px]">
                          <StatusBadge status={patient.status} delay={index * 0.04 + 0.2} />
                        </div>

                        <div className="hidden md:block w-[110px]">
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

        {/* Right Sidebar */}
        <div className="flex w-full lg:w-[340px] shrink-0 flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-[24px] p-5 md:p-7"
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
            className="glass-card flex flex-col gap-5 rounded-[24px] p-5 md:p-7"
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

      {/* Test Patient Onboarding Modal */}
      {showOnboardingModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowOnboardingModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-[600px] mx-4 bg-white/95 border border-white/30 rounded-[24px] backdrop-blur-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.5)] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[24px] font-medium text-[var(--text-primary)] mb-2">
                  Test Patient Onboarding
                </h2>
                <p className="text-[14px] text-[var(--text-secondary)]">
                  Describe the symptoms for this test patient to see AI analysis in action.
                </p>
              </div>
              <button
                onClick={() => setShowOnboardingModal(false)}
                className="w-8 h-8 rounded-full bg-[var(--lavender-bg)] hover:bg-[var(--lavender-border)] transition-colors flex items-center justify-center"
              >
                <span className="text-[var(--text-secondary)] text-lg">×</span>
              </button>
            </div>

            {/* Symptom Input */}
            <div className="mb-6">
              <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-3">
                Patient Symptoms
              </label>
              <textarea
                value={patientNarrative}
                onChange={(e) => setPatientNarrative(e.target.value)}
                placeholder="Describe the patient's symptoms in detail. For example: 'I've been experiencing severe headaches for the past week, accompanied by nausea and sensitivity to light. The pain is worse in the morning and improves throughout the day.'"
                className="w-full h-32 px-4 py-3 bg-[var(--lavender-bg)]/50 border border-[var(--lavender-border)] rounded-[16px] text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--purple-primary)] focus:bg-white/70 transition-colors"
              />
            </div>

            {/* Quick Options */}
            <div className="mb-8">
              <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-3">
                Quick Examples (click to use):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setPatientNarrative("I've been experiencing severe lower abdominal pain for the past four days. It started suddenly and has been constant. The pain wakes me up at night and I feel warm but haven't taken my temperature.")}
                  className="px-3 py-2 text-[12px] bg-[var(--lavender-bg)]/70 hover:bg-[var(--lavender-bg)] text-[var(--text-primary)] rounded-[12px] transition-colors text-left"
                >
                  Abdominal Pain
                </button>
                <button
                  onClick={() => setPatientNarrative("I've been having frequent headaches and dizziness for the past two weeks. Sometimes I see spots in my vision and feel nauseous. This happens more often when I'm stressed.")}
                  className="px-3 py-2 text-[12px] bg-[var(--lavender-bg)]/70 hover:bg-[var(--lavender-bg)] text-[var(--text-primary)] rounded-[12px] transition-colors text-left"
                >
                  Headaches & Dizziness
                </button>
                <button
                  onClick={() => setPatientNarrative("I've been feeling extremely tired for the past month. I can barely get through the day without needing a nap. I also have muscle aches and trouble concentrating at work.")}
                  className="px-3 py-2 text-[12px] bg-[var(--lavender-bg)]/70 hover:bg-[var(--lavender-bg)] text-[var(--text-primary)] rounded-[12px] transition-colors text-left"
                >
                  Fatigue & Muscle Pain
                </button>
                <button
                  onClick={() => setPatientNarrative("I've been having chest pain and shortness of breath when walking up stairs. I also notice my heart racing sometimes even when I'm resting. This has been getting worse over the past month.")}
                  className="px-3 py-2 text-[12px] bg-[var(--lavender-bg)]/70 hover:bg-[var(--lavender-bg)] text-[var(--text-primary)] rounded-[12px] transition-colors text-left"
                >
                  Chest Pain & Heart Issues
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowOnboardingModal(false)}
                className="px-6 py-3 text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOnboardingSubmit}
                disabled={!patientNarrative.trim() || creatingTest}
                className="px-6 py-3 bg-[var(--purple-primary)] hover:bg-[var(--purple-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-[16px] transition-colors"
              >
                {creatingTest ? "Running Analysis..." : "Start AI Analysis"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
