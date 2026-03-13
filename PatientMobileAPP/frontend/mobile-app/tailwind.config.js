/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],
  darkMode: "class",

  theme: {
    extend: {
      /* ───────────── Color Palette (aligned with DoctorAPP) ───────────── */
      colors: {
        brand: {
          DEFAULT: "#44AD4F",
          dark: "#368B3E",
          light: "#6DC94F",
          accent: "#7CC95E",
        },
        forest: {
          DEFAULT: "#166534",
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
          950: "#052E16",
        },
        primary: "#166534",
        secondary: "#DCFCE7",
        accent: "#22C55E",
        surface: "#F8FDF8",

        /* Text hierarchy (matches DoctorAPP CSS vars) */
        "text-primary": "#1F2D1F",
        "text-secondary": "#3D5C3D",
        "text-muted": "#6B7E6B",
        "text-body": "#2D3B2D",

        /* Semantic states */
        success: { DEFAULT: "#2E7D32", bg: "rgba(232, 245, 233, 0.6)" },
        warning: { DEFAULT: "#E65100", bg: "rgba(255, 243, 224, 0.6)" },
        error: { DEFAULT: "#E25C5C", bg: "rgba(226, 92, 92, 0.11)" },
        info: { DEFAULT: "#1565C0", bg: "rgba(21, 101, 192, 0.08)" },

        /* Glass fills */
        glass: {
          fill: "rgba(255, 255, 255, 0.08)",
          "fill-12": "rgba(255, 255, 255, 0.12)",
          "fill-20": "rgba(255, 255, 255, 0.20)",
          border: "rgba(255, 255, 255, 0.25)",
          "border-strong": "rgba(255, 255, 255, 0.35)",
          green: "rgba(220, 252, 231, 0.15)",
          "green-20": "rgba(220, 252, 231, 0.20)",
          lavender: "rgba(224, 245, 230, 0.55)",
        },
      },

      /* ───────────── Border Radii ───────────── */
      borderRadius: {
        glass: "24px",
        "glass-sm": "16px",
        "glass-lg": "32px",
        "glass-xl": "40px",
      },

      /* ───────────── Multi-layer Shadows (green-tinted like DoctorAPP) ───────────── */
      boxShadow: {
        glass:
          "0 8px 32px rgba(68, 173, 79, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
        "glass-hover":
          "0 12px 40px rgba(68, 173, 79, 0.14), 0 4px 16px rgba(68, 173, 79, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.40)",
        "glass-pressed":
          "0 4px 16px rgba(68, 173, 79, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
        "glass-active":
          "0 4px 20px rgba(34, 197, 94, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
        "glass-cta":
          "0 8px 24px rgba(68, 173, 79, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.30)",
      },

      /* ───────────── Backdrop Blur ───────────── */
      backdropBlur: {
        glass: "24px",
        "glass-lg": "28px",
        "glass-xl": "40px",
      },

      /* ───────────── Typography ───────────── */
      fontFamily: {
        sans: ["DMSans_400Regular", "system-ui", "-apple-system", "sans-serif"],
        display: ["DMSans_700Bold", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      fontSize: {
        "metric": ["32px", { lineHeight: "38px", letterSpacing: "-0.5px" }],
        "title": ["28px", { lineHeight: "34px", letterSpacing: "-0.5px" }],
        "heading": ["20px", { lineHeight: "26px", letterSpacing: "-0.3px" }],
        "subheading": ["16px", { lineHeight: "22px", letterSpacing: "-0.1px" }],
        "body-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.1px" }],
        "caption": ["12px", { lineHeight: "17px", letterSpacing: "0.2px" }],
        "overline": ["11px", { lineHeight: "14px", letterSpacing: "1.2px" }],
      },

      /* ───────────── Animations (web-only keyframes) ───────────── */
      animation: {
        breathe: "breathe 4s ease-in-out infinite",
        drift: "drift 20s ease-in-out infinite",
        "drift-alt": "drift-alt 25s ease-in-out infinite alternate",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "skeleton-pulse": "skeleton-pulse 1.8s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.05" },
          "50%": { transform: "scale(1.08)", opacity: "0.08" },
        },
        drift: {
          "0%": { transform: "translate(0, 0) rotate(0deg)" },
          "33%": { transform: "translate(30px, -50px) rotate(120deg)" },
          "66%": { transform: "translate(-20px, 20px) rotate(240deg)" },
          "100%": { transform: "translate(0, 0) rotate(360deg)" },
        },
        "drift-alt": {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-40px, 30px) scale(1.1)" },
          "100%": { transform: "translate(0, 0) scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 20px rgba(68, 173, 79, 0.3), 0 0 60px rgba(68, 173, 79, 0.1)",
          },
          "50%": {
            boxShadow:
              "0 0 30px rgba(68, 173, 79, 0.5), 0 0 80px rgba(68, 173, 79, 0.2)",
          },
        },
        "skeleton-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
      },

      /* ───────────── 8-point Spacing Scale ───────────── */
      spacing: {
        "card-xs": "12px",
        "card-sm": "16px",
        card: "24px",
        "card-lg": "32px",
        section: "48px",
      },
    },
  },

  plugins: [],
};
