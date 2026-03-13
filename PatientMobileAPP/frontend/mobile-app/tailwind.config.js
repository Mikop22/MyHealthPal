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
      /* ───────────── Color Palette ───────────── */
      colors: {
        brand: {
          DEFAULT: "#44AD4F",
          50: "#F4FBF5",
          100: "#E4F5E7",
          200: "#C6E8CC",
          300: "#9ED7A7",
          400: "#6DC94F",
          500: "#44AD4F",
          600: "#368B3E",
          700: "#2E7D32",
          800: "#235E27",
          900: "#173D1A",
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
        primary: "#163828",
        secondary: "#E3F5E6",
        accent: "#44AD4F",
        background: "#F4FAF6",
        surface: "#FCFFFD",
        "surface-strong": "#F8FDF9",
        text: {
          primary: "#163828",
          secondary: "#466252",
          muted: "#6E8477",
        },
        border: {
          soft: "rgba(197, 221, 203, 0.7)",
          strong: "rgba(169, 198, 176, 0.95)",
        },
        semantic: {
          success: "#2E7D32",
          warning: "#C9771A",
          error: "#D65B5B",
          info: "#3178C6",
        },

        glass: {
          fill: "rgba(255, 255, 255, 0.08)",
          "fill-12": "rgba(255, 255, 255, 0.12)",
          "fill-20": "rgba(255, 255, 255, 0.20)",
          "fill-strong": "rgba(255, 255, 255, 0.72)",
          border: "rgba(255, 255, 255, 0.25)",
          "border-strong": "rgba(255, 255, 255, 0.35)",
          green: "rgba(220, 252, 231, 0.15)",
          "green-20": "rgba(220, 252, 231, 0.20)",
        },
      },

      /* ───────────── Border Radii ───────────── */
      borderRadius: {
        pill: "999px",
        panel: "28px",
        glass: "30px",
        "glass-sm": "20px",
        "glass-lg": "40px",
      },

      /* ───────────── Multi-layer Shadows ───────────── */
      boxShadow: {
        glass:
          "0 8px 32px rgba(22, 101, 52, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
        "glass-hover":
          "0 12px 40px rgba(22, 101, 52, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45)",
        "glass-pressed":
          "0 4px 16px rgba(22, 101, 52, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
        "glass-active":
          "0 4px 20px rgba(34, 197, 94, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
        "glow-green":
          "0 0 20px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.15)",
        "glow-green-intense":
          "0 0 30px rgba(34, 197, 94, 0.6), 0 0 80px rgba(34, 197, 94, 0.25)",
      },

      /* ───────────── Backdrop Blur ───────────── */
      backdropBlur: {
        glass: "24px",
        "glass-lg": "28px",
        "glass-xl": "40px",
      },

      /* ───────────── Typography ───────────── */
      fontFamily: {
        sans: ["DM Sans", "system-ui", "-apple-system", "sans-serif"],
        display: ["DM Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      fontSize: {
        xs: ["12px", { lineHeight: "16px", letterSpacing: "0.2px" }],
        sm: ["14px", { lineHeight: "20px", letterSpacing: "0.1px" }],
        base: ["16px", { lineHeight: "24px", letterSpacing: "0px" }],
        lg: ["18px", { lineHeight: "26px", letterSpacing: "-0.1px" }],
        xl: ["20px", { lineHeight: "28px", letterSpacing: "-0.15px" }],
        "2xl": ["24px", { lineHeight: "32px", letterSpacing: "-0.25px" }],
        "3xl": ["28px", { lineHeight: "36px", letterSpacing: "-0.4px" }],
        "4xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.8px" }],
      },

      /* ───────────── Animations (web-only keyframes) ───────────── */
      animation: {
        breathe: "breathe 4s ease-in-out infinite",
        drift: "drift 20s ease-in-out infinite",
        "drift-alt": "drift-alt 25s ease-in-out infinite alternate",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
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
              "0 0 20px rgba(34, 197, 94, 0.3), 0 0 60px rgba(34, 197, 94, 0.1)",
          },
          "50%": {
            boxShadow:
              "0 0 30px rgba(34, 197, 94, 0.5), 0 0 80px rgba(34, 197, 94, 0.2)",
          },
        },
      },

      /* ───────────── Spacing Aliases ───────────── */
      spacing: {
        18: "72px",
        "card-sm": "16px",
        card: "24px",
        "card-lg": "32px",
      },
    },
  },

  plugins: [],
};
