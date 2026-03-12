"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion";

/* ─── Animated Counter Hook ─── */
function useCountUp(from: number, to: number, duration = 1.5) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    const startTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [from, to, duration]);

  return value;
}

/* ─── Toast Notification ─── */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/12 border border-white/30 rounded-[20px] backdrop-blur-[32px] shadow-[0_8px_32px_rgba(93,46,168,0.2),inset_0_1px_0_rgba(255,255,255,0.4)] px-6 py-4 flex items-center gap-3 max-w-[480px]"
    >
      {/* Checkmark */}
      <div className="w-8 h-8 rounded-full bg-[#34C759]/20 border border-[#34C759]/40 flex items-center justify-center flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p className="text-[15px] font-medium text-[#1F1B2D] font-poppins leading-[1.3]">
        {message}
      </p>
    </motion.div>
  );
}

/* ─── Liquid Glass Button (Gradient Primary) ─── */
function GradientButton({
  children,
  onClick,
  disabled = false,
  className = ""
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
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
  const rotateX = useTransform(mouseYSpring, [0, 1], ["4deg", "-4deg"]);
  const rotateY = useTransform(mouseXSpring, [0, 1], ["-4deg", "4deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
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
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative group overflow-hidden rounded-[22px] flex items-center justify-center cursor-pointer ${className}`}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
        background: isHovered
          ? "linear-gradient(135deg, rgba(93,46,168,0.35) 0%, rgba(242,148,185,0.3) 100%)"
          : "linear-gradient(135deg, rgba(93,46,168,0.25) 0%, rgba(242,148,185,0.2) 100%)",
        backdropFilter: isHovered ? "blur(36px)" : "blur(24px)",
        border: isHovered
          ? "1px solid rgba(255,255,255,0.6)"
          : "1px solid rgba(255,255,255,0.35)",
        boxShadow: isHovered
          ? "0 4px 24px rgba(93,46,168,0.22), 0 0 40px rgba(180,140,255,0.12), inset 0 1px 0 rgba(255,255,255,0.5)"
          : "0 4px 20px rgba(93,46,168,0.1), inset 0 1px 0 rgba(255,255,255,0.35)",
        transition: "background 0.35s ease, backdrop-filter 0.4s ease, border 0.3s ease, box-shadow 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        className="absolute inset-0 rounded-[22px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at ${glowPos.x}% ${glowPos.y}%, rgba(255,255,255,${isHovered ? 0.45 : 0.18}) 0%, transparent ${isHovered ? '70%' : '55%'})`,
          transition: isHovered ? "none" : "background 0.4s ease",
        }}
      />
      <div className="relative z-10 text-[#2F1C4E] font-semibold font-poppins">
        {children}
      </div>
    </motion.button>
  );
}

/* ─── Outline Button ─── */
function OutlineButton({
  children,
  onClick,
  className = ""
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, filter: "brightness(1.15)" }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative rounded-[22px] flex items-center justify-center cursor-pointer bg-white/6 border border-white/25 backdrop-blur-[20px] shadow-[0_2px_12px_rgba(93,46,168,0.08),inset_0_1px_0_rgba(255,255,255,0.3)] transition-[filter] duration-300 ${className}`}
    >
      <div className="absolute inset-0 rounded-[22px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.12)_0%,transparent_55%)] pointer-events-none" />
      <span className="relative z-10 text-[#5B4E7A] font-medium font-poppins">
        {children}
      </span>
    </motion.button>
  );
}

/* ─── Spinner ─── */
function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-5 h-5 border-2 border-[#5D2EA8]/30 border-t-[#5D2EA8] rounded-full"
    />
  );
}

/* ─── Constants ─── */
const XRP_TO_USD_RATE = 2.5; // mock XRP → USD exchange rate

/* ─── Main Wallet Dashboard ─── */
export default function WalletDashboard({ walletAddress = "rMock...9B1C" }: { walletAddress?: string }) {
  const [cashOutState, setCashOutState] = useState<"idle" | "loading" | "success">("idle");
  const [showToast, setShowToast] = useState(false);

  const balance = useCountUp(35.0, 45.0, 1.8);
  const fiatValue = balance * XRP_TO_USD_RATE;

  const handleCashOut = () => {
    if (cashOutState !== "idle") return;
    setCashOutState("loading");
    setTimeout(() => {
      setCashOutState("success");
      setShowToast(true);
      setTimeout(() => setCashOutState("idle"), 2000);
    }, 2000);
  };

  return (
    <motion.div
      key="wallet-dashboard"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full max-w-[520px] flex flex-col items-center gap-6"
    >
      {/* ── Big Win Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="text-center"
      >
        <h2 className="text-[36px] font-semibold leading-[1.15] text-[#1F1B2D] font-poppins">
          Data Contribution Verified
        </h2>
        <p className="text-[17px] font-medium leading-[1.4] text-[#5B4E7A] font-poppins mt-3 max-w-[420px] mx-auto">
          You have earned <span className="font-semibold text-[#5D2EA8]">10 XRP</span> for contributing to the Endometriosis Research Initiative.
        </p>
      </motion.div>

      {/* ── Wallet Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="relative w-full bg-white/8 border border-white/25 rounded-[28px] backdrop-blur-[28px] shadow-[0_8px_32px_rgba(93,46,168,0.15),inset_0_1px_0_rgba(255,255,255,0.35)] p-7 flex flex-col items-center overflow-hidden"
      >
        {/* Inner radial glow */}
        <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.2)_0%,transparent_50%)] pointer-events-none" />

        {/* Label */}
        <p className="relative z-10 text-[13px] font-medium text-[#6D6885] font-poppins uppercase tracking-[1.5px] mb-1">
          Total Balance
        </p>

        {/* Animated XRP Balance */}
        <p className="relative z-10 text-[48px] font-semibold leading-none text-[#1F1B2D] font-poppins tabular-nums">
          {balance.toFixed(2)} <span className="text-[24px] font-medium text-[#5D2EA8]">XRP</span>
        </p>

        {/* Fiat Equivalent */}
        <p className="relative z-10 text-[16px] font-medium text-[#6D6885] font-poppins mt-1.5">
          ≈ ${fiatValue.toFixed(2)} USD
        </p>

        {/* Wallet Address Pill */}
        <div className="relative z-10 mt-4 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 backdrop-blur-[16px]">
          <p className="text-[13px] font-medium text-[#5B4E7A] font-poppins tracking-[0.5px]">
            {walletAddress}
          </p>
        </div>
      </motion.div>

      {/* ── Action Buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
        className="w-full flex gap-3"
      >
        {/* Primary: Cash Out */}
        <GradientButton
          onClick={handleCashOut}
          disabled={cashOutState === "loading"}
          className="flex-1 h-[52px] text-[16px]"
        >
          <div className="flex items-center gap-2">
            {cashOutState === "loading" && <Spinner />}
            {cashOutState === "success" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            <span>
              {cashOutState === "loading" ? "Processing..." : cashOutState === "success" ? "Initiated!" : "Cash Out to Bank"}
            </span>
          </div>
        </GradientButton>

        {/* Secondary: Donate */}
        <OutlineButton className="flex-1 h-[52px] text-[15px]">
          Donate to Research
        </OutlineButton>
      </motion.div>

      {/* ── Impact Tracker ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="relative w-full bg-white/6 border border-white/20 rounded-[22px] backdrop-blur-[24px] shadow-[0_4px_20px_rgba(93,46,168,0.08),inset_0_1px_0_rgba(255,255,255,0.3)] p-5 flex items-start gap-3.5 overflow-hidden"
      >
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-[22px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.12)_0%,transparent_50%)] pointer-events-none" />

        {/* Icon */}
        <div className="relative z-10 w-9 h-9 rounded-full bg-[#5D2EA8]/10 border border-[#5D2EA8]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5D2EA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>

        {/* Text */}
        <div className="relative z-10">
          <p className="text-[13px] font-medium text-[#6D6885] font-poppins uppercase tracking-[1px] mb-1">
            Impact Tracker
          </p>
          <p className="text-[15px] font-medium text-[#2F1C4E] font-poppins leading-[1.4]">
            Your data is currently powering: <span className="font-semibold text-[#5D2EA8]">Global Endometriosis Genotype Study #8492</span>
          </p>
        </div>
      </motion.div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {showToast && (
          <Toast
            message={`Transfer of $${(45.0 * XRP_TO_USD_RATE).toFixed(2)} initiated via RippleNet`}
            onClose={() => setShowToast(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
