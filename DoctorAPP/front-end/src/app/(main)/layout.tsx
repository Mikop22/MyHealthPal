"use client";

import {
  CircleUserRound,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="relative flex items-center justify-center rounded-[20px] px-3 md:px-5 py-1.5 md:py-2 transition-colors"
    >
      {active && (
        <motion.div
          layoutId="nav-pill-active"
          className="nav-pill-active absolute inset-0 rounded-[20px]"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      {!active && (
        <div className="absolute inset-0 rounded-[20px] border border-[var(--border-nav-inactive)] bg-transparent transition-colors hover:bg-[var(--lavender-bg)]" />
      )}
      <span
        className={`relative z-10 text-[14px] font-medium tracking-[-0.1px] ${
          active ? "text-[var(--purple-primary)]" : "text-[var(--text-nav)]"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col bg-transparent font-poppins">
      <nav className="glass-nav flex h-14 md:h-16 shrink-0 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/patients" className="gradient-logo text-[20px] md:text-[24px] font-medium tracking-[-0.1px]">
            MyHealthPal
          </Link>
          <div className="flex gap-1.5 md:gap-2">
            <NavPill href="/patients" label="Patients" active={pathname === "/patients"} />
            <NavPill href="/schedule" label="Schedule" active={pathname === "/schedule"} />
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <CircleUserRound className="h-6 w-6 md:h-7 md:w-7 text-[var(--purple-primary)]" strokeWidth={1.5} />
          <span className="hidden sm:inline text-[14px] font-medium tracking-[-0.1px] text-[var(--text-primary)]">
            Dr. Patel
          </span>
          <ChevronDown className="hidden sm:block h-4 w-4 text-[var(--text-nav)]" />
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
