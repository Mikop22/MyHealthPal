"use client";

import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppleHealthSyncProps {
  /** Unique appointment / intake token used to tag the iOS Shortcut payload. */
  token: string;
  /** Called when the backend confirms biometrics have been received. */
  onSyncComplete: () => void;
  /** Called when the user taps "Skip" to proceed without syncing. */
  onSkip: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The `shortcuts://` deep link URL scheme triggers Apple's Shortcuts app.
 *
 *   shortcuts://run-shortcut?name=<ShortcutName>&input=<InputText>
 *
 * - `name` identifies the Shortcut by its exact title on the user's device.
 * - `input` is a string passed as the Shortcut's initial input, here the
 *   unique intake token so the Shortcut can tag the HealthKit payload when
 *   POSTing to our webhook.
 *
 * On Desktop the URL is encoded into a QR code for the patient to scan with
 * their iPhone camera.  On Mobile it is triggered directly via a button tap.
 */
function buildDeepLink(token: string): string {
  return `shortcuts://run-shortcut?name=MyHealthPalSync&input=${encodeURIComponent(token)}`;
}

/** Polling interval in milliseconds. */
const POLL_INTERVAL_MS = 2000;

// ─── Device Detection ────────────────────────────────────────────────────────

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check via user-agent for iOS / Android devices
    const ua = navigator.userAgent;
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
    setIsMobile(mobile);
  }, []);

  return isMobile;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppleHealthSync({
  token,
  onSyncComplete,
  onSkip,
}: AppleHealthSyncProps) {
  const isMobile = useIsMobile();
  const [polling, setPolling] = useState(true);
  const deepLink = buildDeepLink(token);

  // Poll GET /api/v1/intake/{token}/status every 2 seconds.
  // When biometrics_received === true, fire onSyncComplete and stop.
  useEffect(() => {
    if (!polling) return;

    const controller = new AbortController();

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/v1/intake/${encodeURIComponent(token)}/status`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data: { biometrics_received: boolean } = await res.json();
        if (data.biometrics_received) {
          setPolling(false);
          clearInterval(intervalId);
          onSyncComplete();
        }
      } catch {
        // Network errors during polling are non-fatal; retry on next tick.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [polling, token, onSyncComplete]);

  const handleOpenShortcut = useCallback(() => {
    window.location.href = deepLink;
  }, [deepLink]);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6">
      {/* Title */}
      <h2 className="max-w-[680px] text-[34px] font-medium leading-[44px] text-center font-poppins bg-linear-to-r from-[#368B3E] to-[#6DC94F] bg-clip-text text-transparent pb-1">
        Sync Apple Health
      </h2>

      <p className="max-w-[420px] text-[16px] font-medium leading-[1.45] text-[var(--text-secondary)] text-center font-poppins">
        {isMobile
          ? "Tap the button below to open the iOS Shortcut and sync your Apple Health data."
          : "Scan the QR code with your iPhone camera to sync your Apple Health data."}
      </p>

      {/* Glass card containing QR code (desktop) or deep-link button (mobile) */}
      <div className="relative w-[340px] bg-white/8 border border-white/25 rounded-[30px] backdrop-blur-[28px] shadow-[0_8px_32px_rgba(68,173,79,0.15),inset_0_1px_0_rgba(255,255,255,0.35)] flex flex-col items-center justify-center overflow-hidden py-10 px-8">
        <div className="absolute inset-0 rounded-[30px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.2)_0%,transparent_50%)] pointer-events-none" />

        {isMobile ? (
          /* ── Mobile: Deep-link button ─────────────────────────────── */
          <button
            onClick={handleOpenShortcut}
            className="relative z-10 w-full h-[56px] rounded-[22px] flex items-center justify-center gap-3 cursor-pointer overflow-hidden transition-[filter] duration-300 hover:brightness-110"
            style={{
              background:
                "linear-gradient(135deg, rgba(109, 201, 79, 0.85), rgba(68, 173, 79, 0.75))",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.25)",
              boxShadow:
                "0 8px 24px rgba(68,173,79,0.22), inset 0 1px 0 rgba(255,255,255,0.30)",
            }}
          >
            {/* Apple-style icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-white text-[18px] font-semibold font-poppins">
              Sync Apple Health
            </span>
          </button>
        ) : (
          /* ── Desktop: QR code ─────────────────────────────────────── */
          <div className="relative z-10 p-3 rounded-[18px] bg-white shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
            <QRCodeSVG
              value={deepLink}
              size={200}
              bgColor="#ffffff"
              fgColor="#1F2D1F"
              level="M"
            />
          </div>
        )}
      </div>

      {/* Polling indicator */}
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-[var(--purple-primary)] animate-pulse" />
        <span className="text-[14px] text-[var(--text-nav)] font-poppins font-medium">
          Waiting for Apple Health data…
        </span>
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="text-[14px] text-[var(--text-muted)] font-poppins font-medium underline underline-offset-2 hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
      >
        Skip this step
      </button>
    </div>
  );
}
