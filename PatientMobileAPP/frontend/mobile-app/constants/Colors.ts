/**
 * MyHealthPal — Liquid Glass green theme design tokens.
 *
 * Aligned with DoctorAPP web frontend for a unified brand identity.
 * Use in StyleSheet.create / Reanimated interpolations where
 * NativeWind utility classes aren't available.
 */

export const Colors = {
  /** Brand primary — matches DoctorAPP --purple-primary */
  brand: "#44AD4F",
  brandDark: "#368B3E",
  brandLight: "#6DC94F",
  brandAccent: "#7CC95E",

  /** Legacy aliases (kept for backward compatibility) */
  primary: "#166534",
  secondary: "#DCFCE7",
  accent: "#22C55E",
  surface: "#FAFFFE",
  white: "#FFFFFF",

  /** Background — matches DoctorAPP --background */
  background: "#F8FDF8",

  /** Text hierarchy — matches DoctorAPP typography tokens */
  text: {
    primary: "#1F2D1F",
    secondary: "#3D5C3D",
    muted: "#6B7E6B",
    nav: "#4A5E4A",
    body: "#2D3B2D",
  },

  /** Semantic state colors — aligned with DoctorAPP */
  semantic: {
    success: "#2E7D32",
    successBg: "rgba(232, 245, 233, 0.6)",
    warning: "#E65100",
    warningBg: "rgba(255, 243, 224, 0.6)",
    error: "#E25C5C",
    errorBg: "rgba(226, 92, 92, 0.11)",
    info: "#1565C0",
    infoBg: "rgba(21, 101, 192, 0.08)",
  },

  forest: {
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

  glass: {
    fill: "rgba(255, 255, 255, 0.08)",
    fill12: "rgba(255, 255, 255, 0.12)",
    fill20: "rgba(255, 255, 255, 0.20)",
    border: "rgba(255, 255, 255, 0.25)",
    borderStrong: "rgba(255, 255, 255, 0.35)",
    green: "rgba(220, 252, 231, 0.15)",
    green20: "rgba(220, 252, 231, 0.20)",
    /** Translucent fills matching DoctorAPP */
    lavenderBg: "rgba(224, 245, 230, 0.55)",
    lavenderBorder: "rgba(200, 230, 210, 0.6)",
  },

  shadow: {
    greenTint: "rgba(68, 173, 79, 0.10)",
    greenTintHover: "rgba(68, 173, 79, 0.14)",
    accentGlow: "rgba(68, 173, 79, 0.22)",
    specularWhite: "rgba(255, 255, 255, 0.35)",
  },

  tabBar: {
    active: "#44AD4F",
    inactive: "#6B7E6B",
    background: "rgba(255, 255, 255, 0.92)",
    border: "rgba(200, 230, 210, 0.6)",
  },

  canvas: {
    baseStart: "#F8FDF8",
    baseEnd: "#E8F5EE",
    blob1: "#B8E0B0",
    blob2: "#A8D8C8",
    blob3: "#C0E8B8",
  },

  gradient: {
    brandStart: "#368B3E",
    brandEnd: "#6DC94F",
    ctaStart: "rgba(109, 201, 79, 0.85)",
    ctaEnd: "rgba(68, 173, 79, 0.75)",
  },
} as const;

export const GlassRadius = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
} as const;

/** 8-point spacing scale */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
