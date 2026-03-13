"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion";
import AppleHealthSync from "@/components/AppleHealthSync";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

type Question = {
  id: number;
  question: string;
  type: "options" | "scale";
  options: string[];
};

const questions: Question[] = [
  {
    id: 1,
    question: "Where are you in your menstrual cycle?",
    type: "options",
    options: ["Follicular", "Ovulation", "Luteal", "Menstruation", "Does not apply"],
  },
  {
    id: 2,
    question: "Do you consume caffeine regularly?",
    type: "options",
    options: ["Yes", "No"],
  },
  {
    id: 3,
    question: "What level of pain are you experiencing?",
    type: "scale",
    options: Array.from({ length: 10 }, (_, i) => (i + 1).toString()),
  },
];

/* ─── Liquid Glass Button ─── */
function LiquidButton({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const mouseXSpring = useSpring(x, springConfig);
  const mouseYSpring = useSpring(y, springConfig);

  const rotateX = useTransform(mouseYSpring, [0, 1], ["6deg", "-6deg"]);
  const rotateY = useTransform(mouseXSpring, [0, 1], ["-6deg", "6deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / rect.width;
    const yPct = mouseY / rect.height;
    x.set(xPct);
    y.set(yPct);
    setGlowPos({ x: xPct * 100, y: yPct * 100 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setGlowPos({ x: 50, y: 0 });
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.button
      ref={btnRef}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative group overflow-hidden rounded-[26px] flex items-center justify-center cursor-pointer ${className}`}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
        background: isHovered ? "rgba(200, 180, 240, 0.28)" : "rgba(200, 180, 240, 0.15)",
        backdropFilter: isHovered ? "blur(36px)" : "blur(24px)",
        border: isHovered ? "1px solid rgba(255,255,255,0.7)" : "1px solid rgba(255,255,255,0.4)",
        boxShadow: isHovered
          ? "0 4px 24px rgba(68,173,79,0.18), 0 0 40px rgba(109,201,79,0.12), inset 0 1px 0 rgba(255,255,255,0.55)"
          : "0 4px 24px rgba(68,173,79,0.06), 0 0 40px rgba(109,201,79,0.0), inset 0 1px 0 rgba(255,255,255,0.35)",
        transition: "background 0.35s ease, backdrop-filter 0.4s ease, border 0.3s ease, box-shadow 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)",
      }}
    >
      <div
        className="absolute inset-0 rounded-[26px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at ${glowPos.x}% ${glowPos.y}%, rgba(255,255,255,${isHovered ? 0.5 : 0.2}) 0%, transparent ${isHovered ? "70%" : "55%"})`,
          transition: isHovered ? "none" : "background 0.4s ease",
        }}
      />
      <div className="relative z-10 text-[var(--text-body)] font-medium font-poppins">{children}</div>
    </motion.button>
  );
}

/* ─── Question Card ─── */
function QuestionCard({
  question,
  total,
  current,
  onAnswer,
}: {
  question: Question;
  total: number;
  current: number;
  onAnswer: (answer: string) => void;
}) {
  const isOddCount = question.type !== "scale" && question.options.length % 2 !== 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.97 }}
      transition={{ duration: 0.85, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative w-[540px] min-h-[340px] bg-white/8 border border-white/25 rounded-[34px] backdrop-blur-[28px] shadow-[0_8px_32px_rgba(68,173,79,0.15),inset_0_1px_0_rgba(255,255,255,0.35)] p-8 pt-12 flex flex-col items-center overflow-hidden justify-center"
    >
      <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.2)_0%,transparent_50%)] pointer-events-none" />
      <h2 className="relative z-10 text-[28px] font-medium leading-[1.25] text-[var(--text-primary)] text-center mb-6 px-4 font-poppins mt-2">
        {question.question}
      </h2>
      <div className={`relative z-10 w-full grid gap-3 ${question.type === "scale" ? "grid-cols-5" : "grid-cols-2"}`}>
        {question.options.map((opt, index) => (
          <LiquidButton
            key={opt}
            onClick={() => onAnswer(opt)}
            className={`${question.type === "scale" ? "h-[48px] text-lg" : "h-[56px] text-xl"} ${isOddCount && index === question.options.length - 1 ? "col-span-2" : ""}`}
          >
            {opt}
          </LiquidButton>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Back Button ─── */
function GlassBackButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ scale: 1.1, filter: "brightness(1.2)" }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`w-[36px] h-[36px] rounded-full bg-white/10 border border-white/25 flex items-center justify-center cursor-pointer backdrop-blur-[16px] shadow-[0_2px_8px_rgba(68,173,79,0.1),inset_0_1px_0_rgba(255,255,255,0.3)] transition-[filter] duration-200 ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A3270" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </motion.button>
  );
}

/* ─── Main Intake Page ─── */
export default function IntakePage() {
  const params = useParams();
  const token = params.token as string;

  const [showButton, setShowButton] = useState(false);
  const [view, setView] = useState<
    "welcome" | "intro" | "symptoms-intro" | "symptoms-explainer" | "symptoms-input" | "syncing-wearables" | "questions" | "finish" | "already-submitted"
  >("welcome");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [narrative, setNarrative] = useState("");
  const [useDemoData, setUseDemoData] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if this intake link has already been used
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/intake/${encodeURIComponent(token)}/status`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.already_submitted) setView("already-submitted");
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (view === "intro") {
      const timer = setTimeout(() => setView("questions"), 3000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  useEffect(() => {
    if (view === "symptoms-intro") {
      const timer = setTimeout(() => setView("symptoms-explainer"), 3000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  useEffect(() => {
    if (view === "symptoms-explainer") {
      const timer = setTimeout(() => setView("symptoms-input"), 6000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // syncing-wearables view is now driven by AppleHealthSync component
  // (onSyncComplete / onSkip callbacks)


  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: answer }));
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setView("symptoms-intro");
    }
  };

  const handleBack = () => {
    if (view === "questions") {
      if (currentQuestionIndex > 0) setCurrentQuestionIndex((prev) => prev - 1);
    } else if (view === "symptoms-input" || view === "symptoms-intro" || view === "symptoms-explainer") {
      setCurrentQuestionIndex(questions.length - 1);
      setView("questions");
    }
  };

  const handleSubmit = async (forceDemoData = false) => {
    setView("finish");
    setSubmitError(null);

    const shouldUseDemoData = forceDemoData || useDemoData;

    // Realistic mock biometric data from CLAUDE.md — shows clear acute episode
    // with clinically significant deltas against a 26-week baseline.
    const mockBiometricData = {
      acute_7_day: {
        granularity: "daily_summary",
        metrics: {
          heartRateVariabilitySDNN: [
            { date: "2026-02-15", value: 48.2, unit: "ms" },
            { date: "2026-02-16", value: 47.1, unit: "ms" },
            { date: "2026-02-17", value: 45.9, unit: "ms" },
            { date: "2026-02-18", value: 22.4, unit: "ms", flag: "severe_drop" },
            { date: "2026-02-19", value: 24.1, unit: "ms" },
            { date: "2026-02-20", value: 28.5, unit: "ms" },
            { date: "2026-02-21", value: 31.0, unit: "ms" },
          ],
          restingHeartRate: [
            { date: "2026-02-15", value: 62, unit: "bpm" },
            { date: "2026-02-16", value: 63, unit: "bpm" },
            { date: "2026-02-17", value: 62, unit: "bpm" },
            { date: "2026-02-18", value: 78, unit: "bpm", flag: "elevated" },
            { date: "2026-02-19", value: 76, unit: "bpm" },
            { date: "2026-02-20", value: 74, unit: "bpm" },
            { date: "2026-02-21", value: 72, unit: "bpm" },
          ],
          appleSleepingWristTemperature: [
            { date: "2026-02-15", value: -0.12, unit: "degC_deviation" },
            { date: "2026-02-16", value: -0.10, unit: "degC_deviation" },
            { date: "2026-02-17", value: 0.05, unit: "degC_deviation" },
            { date: "2026-02-18", value: 0.85, unit: "degC_deviation", flag: "sustained_high" },
            { date: "2026-02-19", value: 0.92, unit: "degC_deviation" },
            { date: "2026-02-20", value: 0.80, unit: "degC_deviation" },
            { date: "2026-02-21", value: 0.75, unit: "degC_deviation" },
          ],
          respiratoryRate: [
            { date: "2026-02-15", value: 14.5, unit: "breaths/min" },
            { date: "2026-02-16", value: 14.6, unit: "breaths/min" },
            { date: "2026-02-17", value: 14.5, unit: "breaths/min" },
            { date: "2026-02-18", value: 18.2, unit: "breaths/min", flag: "elevated" },
            { date: "2026-02-19", value: 17.8, unit: "breaths/min" },
            { date: "2026-02-20", value: 16.5, unit: "breaths/min" },
            { date: "2026-02-21", value: 16.0, unit: "breaths/min" },
          ],
          walkingAsymmetryPercentage: [
            { date: "2026-02-15", value: 1.2, unit: "%" },
            { date: "2026-02-16", value: 1.5, unit: "%" },
            { date: "2026-02-17", value: 1.3, unit: "%" },
            { date: "2026-02-18", value: 8.5, unit: "%", flag: "guarding_detected" },
            { date: "2026-02-19", value: 8.2, unit: "%" },
            { date: "2026-02-20", value: 6.0, unit: "%" },
            { date: "2026-02-21", value: 5.5, unit: "%" },
          ],
          stepCount: [
            { date: "2026-02-15", value: 8500, unit: "count" },
            { date: "2026-02-16", value: 8200, unit: "count" },
            { date: "2026-02-17", value: 8600, unit: "count" },
            { date: "2026-02-18", value: 1200, unit: "count", flag: "mobility_drop" },
            { date: "2026-02-19", value: 1500, unit: "count" },
            { date: "2026-02-20", value: 2500, unit: "count" },
            { date: "2026-02-21", value: 3000, unit: "count" },
          ],
          sleepAnalysis_awakeSegments: [
            { date: "2026-02-15", value: 1, unit: "count" },
            { date: "2026-02-16", value: 1, unit: "count" },
            { date: "2026-02-17", value: 2, unit: "count" },
            { date: "2026-02-18", value: 6, unit: "count", flag: "painsomnia" },
            { date: "2026-02-19", value: 5, unit: "count" },
            { date: "2026-02-20", value: 4, unit: "count" },
            { date: "2026-02-21", value: 3, unit: "count" },
          ],
        },
      },
      longitudinal_6_month: {
        granularity: "weekly_average",
        metrics: {
          restingHeartRate: [
            { week_start: "2025-08-24", value: 61.2, unit: "bpm" },
            { week_start: "2025-08-31", value: 61.5, unit: "bpm" },
            { week_start: "2025-09-07", value: 61.4, unit: "bpm" },
            { week_start: "2025-09-14", value: 61.8, unit: "bpm" },
            { week_start: "2025-09-21", value: 62.1, unit: "bpm" },
            { week_start: "2025-09-28", value: 62.0, unit: "bpm" },
            { week_start: "2025-10-05", value: 62.5, unit: "bpm" },
            { week_start: "2025-10-12", value: 62.8, unit: "bpm" },
            { week_start: "2025-10-19", value: 63.1, unit: "bpm" },
            { week_start: "2025-10-26", value: 63.5, unit: "bpm" },
            { week_start: "2025-11-02", value: 63.8, unit: "bpm" },
            { week_start: "2025-11-09", value: 64.1, unit: "bpm" },
            { week_start: "2025-11-16", value: 64.5, unit: "bpm" },
            { week_start: "2025-11-23", value: 64.7, unit: "bpm" },
            { week_start: "2025-11-30", value: 65.1, unit: "bpm" },
            { week_start: "2025-12-07", value: 65.5, unit: "bpm" },
            { week_start: "2025-12-14", value: 65.8, unit: "bpm" },
            { week_start: "2025-12-21", value: 66.2, unit: "bpm" },
            { week_start: "2025-12-28", value: 66.5, unit: "bpm" },
            { week_start: "2026-01-04", value: 66.8, unit: "bpm" },
            { week_start: "2026-01-11", value: 67.1, unit: "bpm" },
            { week_start: "2026-01-18", value: 67.4, unit: "bpm" },
            { week_start: "2026-01-25", value: 67.7, unit: "bpm" },
            { week_start: "2026-02-01", value: 68.1, unit: "bpm" },
            { week_start: "2026-02-08", value: 68.4, unit: "bpm" },
            { week_start: "2026-02-15", value: 68.8, unit: "bpm", trend: "creeping_elevation" },
          ],
          walkingAsymmetryPercentage: [
            { week_start: "2025-08-24", value: 1.1, unit: "%" },
            { week_start: "2025-08-31", value: 1.1, unit: "%" },
            { week_start: "2025-09-07", value: 1.2, unit: "%" },
            { week_start: "2025-09-14", value: 1.2, unit: "%" },
            { week_start: "2025-09-21", value: 1.3, unit: "%" },
            { week_start: "2025-09-28", value: 1.3, unit: "%" },
            { week_start: "2025-10-05", value: 1.4, unit: "%" },
            { week_start: "2025-10-12", value: 1.5, unit: "%" },
            { week_start: "2025-10-19", value: 1.6, unit: "%" },
            { week_start: "2025-10-26", value: 1.8, unit: "%" },
            { week_start: "2025-11-02", value: 2.0, unit: "%" },
            { week_start: "2025-11-09", value: 2.1, unit: "%" },
            { week_start: "2025-11-16", value: 2.3, unit: "%" },
            { week_start: "2025-11-23", value: 2.4, unit: "%" },
            { week_start: "2025-11-30", value: 2.5, unit: "%" },
            { week_start: "2025-12-07", value: 2.6, unit: "%" },
            { week_start: "2025-12-14", value: 2.8, unit: "%" },
            { week_start: "2025-12-21", value: 2.9, unit: "%" },
            { week_start: "2025-12-28", value: 3.1, unit: "%" },
            { week_start: "2026-01-04", value: 3.3, unit: "%" },
            { week_start: "2026-01-11", value: 3.4, unit: "%" },
            { week_start: "2026-01-18", value: 3.6, unit: "%" },
            { week_start: "2026-01-25", value: 3.8, unit: "%" },
            { week_start: "2026-02-01", value: 4.0, unit: "%" },
            { week_start: "2026-02-08", value: 4.1, unit: "%" },
            { week_start: "2026-02-15", value: 4.3, unit: "%", trend: "gradual_impairment" },
          ],
        },
      },
    };

    const payload = {
      patient_id: token,
      sync_timestamp: new Date().toISOString(),
      hardware_source: "Apple Watch Series 9",
      patient_narrative: narrative || "Reporting general fatigue and mild discomfort.",
      // If skipping or using demo data, send mock biometrics.
      // If Apple Watch synced, send empty arrays — backend merges webhook data.
      data: shouldUseDemoData ? mockBiometricData : {
        acute_7_day: { granularity: "daily_summary", metrics: { heartRateVariabilitySDNN: [], restingHeartRate: [], appleSleepingWristTemperature: [], respiratoryRate: [], walkingAsymmetryPercentage: [], stepCount: [], sleepAnalysis_awakeSegments: [] } },
        longitudinal_6_month: { granularity: "weekly_average", metrics: { restingHeartRate: [], walkingAsymmetryPercentage: [] } },
      },
      risk_profile: { factors: [] },
    };

    try {
      const res = await fetch(`${API_BASE}/api/v1/intake/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Server error: ${res.status}`);
      }

    } catch (err) {
      // Submission runs in background — patient already sees "thanks" screen.
      // Log but don't disrupt the patient experience.
      console.error("Intake submission error:", err);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center font-poppins text-[var(--text-body)] selection:bg-[var(--purple-light)]/30 transition-colors duration-1000">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#B8E0B0] opacity-30 mix-blend-multiply filter blur-[100px]"
          style={{ animation: "blob-drift-1 15s infinite alternate ease-in-out" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-40"
          style={{
            background: "radial-gradient(circle, #A8D8C8 0%, transparent 70%)",
            top: "50%",
            right: "10%",
            filter: "blur(110px)",
            animation: "blob-drift-2 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[450px] h-[450px] rounded-full opacity-35"
          style={{
            background: "radial-gradient(circle, #C0E8C0 0%, transparent 70%)",
            bottom: "5%",
            left: "40%",
            filter: "blur(120px)",
            animation: "blob-drift-3 20s ease-in-out infinite",
          }}
        />
      </div>

      <div
        className={`w-full max-w-[920px] text-center relative flex flex-col items-center justify-center transition-[height] duration-500 z-10 ${view === "welcome" ? "h-[340px]" : "h-[500px]"}`}
      >
        <AnimatePresence mode="wait">
          {view === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.5 }}
              className="w-full h-full relative mt-32"
            >
              <motion.h1
                layout
                initial={{ fontSize: "72px", y: 0, filter: "blur(24px)", opacity: 0 }}
                animate={{
                  fontSize: showButton ? "88px" : "92px",
                  y: showButton ? -18 : 0,
                  filter: "blur(0px)",
                  opacity: 1,
                }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="font-medium leading-[1.1] tracking-[-0.1px] bg-linear-to-r from-[#368B3E] to-[#6DC94F] bg-clip-text text-transparent select-none pb-4 absolute top-0 w-full"
              >
                MyHealthPal
              </motion.h1>
              <div className="absolute top-[136px] w-full flex justify-center perspective-[1000px]">
                <AnimatePresence mode="wait">
                  {!showButton ? (
                    <motion.p
                      key="subtitle"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      className="text-[30px] font-medium leading-[38px] tracking-[-0.1px] text-[var(--text-nav)]"
                    >
                      Let&apos;s get you ready for your appointment
                    </motion.p>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20, mass: 1, delay: 0.2 }}
                    >
                      <LiquidButton onClick={() => setView("intro")} className="w-[184px] h-[51px] text-[24px]">
                        Continue
                      </LiquidButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {view === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full flex flex-col items-center justify-center"
            >
              <h1 className="text-[58px] font-medium leading-[1.15] tracking-[-0.1px] text-[var(--text-primary)]">Before we begin</h1>
              <h1 className="text-[58px] font-medium leading-[1.15] tracking-[-0.1px] bg-linear-to-r from-[#368B3E] to-[#6DC94F] bg-clip-text text-transparent select-none pb-2 mt-3">
                A few questions
              </h1>
              <p className="text-[24px] font-medium leading-[32px] tracking-[-0.1px] text-[var(--text-nav)] mt-6">This will take about 2 minutes</p>
            </motion.div>
          )}

          {view === "symptoms-intro" && (
            <motion.div
              key="symptoms-intro"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full flex flex-col items-center justify-center"
            >
              <h1 className="text-[52px] font-medium leading-[1.15] tracking-[-0.1px] text-[var(--text-primary)]">Great,</h1>
              <h1 className="text-[46px] font-medium leading-[1.15] tracking-[-0.1px] bg-linear-to-r from-[#368B3E] to-[#6DC94F] bg-clip-text text-transparent select-none pb-2 mt-3 text-center">
                Let&apos;s talk about symptoms
              </h1>
            </motion.div>
          )}

          {view === "symptoms-explainer" && (
            <motion.div
              key="symptoms-explainer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative w-[600px] bg-white/8 border border-white/25 rounded-[30px] backdrop-blur-[28px] shadow-[0_8px_32px_rgba(68,173,79,0.15),inset_0_1px_0_rgba(255,255,255,0.35)] flex flex-col items-center justify-center overflow-hidden py-14 px-10"
            >
              <div className="absolute inset-0 rounded-[30px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.2)_0%,transparent_50%)] pointer-events-none" />
              <p className="relative z-10 max-w-[420px] text-[18px] font-medium leading-[1.4] text-[var(--text-body)] text-center font-poppins">
                You tell us your symptoms in your own words, don&apos;t be afraid to be detailed, we don&apos;t share your exact words with your physician.
              </p>
            </motion.div>
          )}

          {view === "symptoms-input" && (
            <motion.div
              key="symptoms-input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center justify-center p-8"
            >
              <div className="w-full max-w-[760px] mb-4">
                <GlassBackButton onClick={handleBack} />
              </div>
              <div className="w-full flex flex-col items-center justify-center gap-6">
                <div className="w-full max-w-[760px] h-[340px] bg-white/10 border border-white/25 rounded-[30px] backdrop-blur-[28px] shadow-[0_8px_32px_rgba(68,173,79,0.12),inset_0_1px_0_rgba(255,255,255,0.35)] overflow-hidden relative">
                  <div className="absolute inset-0 rounded-[30px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.15)_0%,transparent_50%)] pointer-events-none" />
                  <textarea
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    className="relative z-10 w-full h-full bg-transparent border-none outline-none p-8 text-[var(--text-body)] text-xl font-poppins resize-none placeholder-[var(--text-body)]/50"
                    placeholder="Type here..."
                  />
                </div>
                <div className="w-full max-w-[760px] flex justify-end">
                  <LiquidButton onClick={() => setView("syncing-wearables")} className="w-[140px] h-[48px] text-[20px]">
                    Submit
                  </LiquidButton>
                </div>
              </div>
            </motion.div>
          )}

          {view === "syncing-wearables" && (
            <motion.div
              key="syncing-wearables"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center justify-center"
            >
              <AppleHealthSync
                token={token}
                onSyncComplete={() => handleSubmit(false)}
                onSkip={() => handleSubmit(true)}
              />
            </motion.div>
          )}

          {view === "questions" && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-0 right-0 text-[var(--text-nav)] text-sm font-medium font-poppins">
                {currentQuestionIndex + 1} of {questions.length}
              </motion.div>
              {currentQuestionIndex > 0 && <GlassBackButton onClick={handleBack} className="absolute top-0 left-0" />}
              <AnimatePresence mode="wait">
                <QuestionCard
                  key={`q-${currentQuestionIndex}`}
                  question={questions[currentQuestionIndex]}
                  total={questions.length}
                  current={currentQuestionIndex + 1}
                  onAnswer={handleAnswer}
                />
              </AnimatePresence>
            </div>
          )}

          {view === "already-submitted" && (
            <motion.div
              key="already-submitted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center justify-center gap-4"
            >
              <h2 className="text-[52px] font-medium leading-none bg-linear-to-r from-[#368B3E] to-[#6DC94F] bg-clip-text text-transparent text-center font-poppins pb-2">
                already submitted
              </h2>
              <p className="max-w-[380px] text-[18px] font-medium leading-[1.35] text-[var(--text-secondary)] text-center font-poppins mt-2">
                This intake form has already been completed. If you need to update your information, please contact your provider.
              </p>
            </motion.div>
          )}

          {view === "finish" && (
            <motion.div
              key="finish"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center justify-center gap-4"
            >
              <h2 className="text-[64px] font-medium leading-none text-[var(--text-primary)] text-center font-poppins">thanks.</h2>
              <p className="max-w-[380px] text-[18px] font-medium leading-[1.35] text-[var(--text-secondary)] text-center font-poppins mt-2">
                This information will be used to give you a more accurate diagnosis
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
