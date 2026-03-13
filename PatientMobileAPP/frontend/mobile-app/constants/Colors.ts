/**
 * MyHealthPal — Liquid Glass green theme design tokens.
 *
 * Use in StyleSheet.create / Reanimated interpolations where
 * NativeWind utility classes aren't available.
 */

export const Colors = {
  primary: "#163828",
  secondary: "#E3F5E6",
  accent: "#44AD4F",
  background: "#F4FAF6",
  surface: "#FCFFFD",
  surfaceStrong: "#F8FDF9",
  white: "#FFFFFF",

  brand: {
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

  text: {
    primary: "#163828",
    secondary: "#466252",
    muted: "#6E8477",
    inverse: "#FFFFFF",
    tertiary: "#8EA497",
  },

  border: {
    soft: "rgba(197, 221, 203, 0.7)",
    strong: "rgba(169, 198, 176, 0.95)",
    glass: "rgba(255, 255, 255, 0.36)",
  },

  semantic: {
    success: "#2E7D32",
    successSoft: "#E7F6EA",
    warning: "#C9771A",
    warningSoft: "#FFF3DE",
    error: "#D65B5B",
    errorSoft: "#FDEBEC",
    info: "#3178C6",
    infoSoft: "#EAF4FF",
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
    fillStrong: "rgba(255, 255, 255, 0.72)",
    border: "rgba(255, 255, 255, 0.25)",
    borderStrong: "rgba(255, 255, 255, 0.35)",
    green: "rgba(220, 252, 231, 0.15)",
    green20: "rgba(220, 252, 231, 0.20)",
  },

  shadow: {
    greenTint: "rgba(0, 0, 0, 0.08)",
    greenTintHover: "rgba(0, 0, 0, 0.12)",
    accentGlow: "rgba(0, 0, 0, 0.2)",
    specularWhite: "rgba(255, 255, 255, 0.35)",
  },

  tabBar: {
    active: "#44AD4F",
    inactive: "#527261",
    background: "rgba(255, 255, 255, 0.92)",
    border: "rgba(220, 252, 231, 0.6)",
  },

  canvas: {
    baseStart: "#EEF2FF",   // icy lavender-white
    baseEnd: "#F0FAFA",   // cool mint-white
    teal: "rgba(0, 200, 180, 0.40)",
    lavender: "rgba(130, 80, 220, 0.28)",
    gold: "rgba(255, 180, 60, 0.22)",
  },

  gradient: {
    titleStart: "#00C8B4",
    titleEnd: "#8050DC",
  },
} as const;

export const GlassRadius = {
  sm: 20,
  md: 30,
  lg: 40,
} as const;
