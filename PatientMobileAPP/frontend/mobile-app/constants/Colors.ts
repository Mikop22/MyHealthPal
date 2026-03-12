/**
 * MyHealthPal — Liquid Glass green theme design tokens.
 *
 * Use in StyleSheet.create / Reanimated interpolations where
 * NativeWind utility classes aren't available.
 */

export const Colors = {
  primary: "#166534",
  secondary: "#DCFCE7",
  accent: "#22C55E",
  surface: "#FAFFFE",
  white: "#FFFFFF",

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
  },

  shadow: {
    greenTint: "rgba(0, 0, 0, 0.08)",
    greenTintHover: "rgba(0, 0, 0, 0.12)",
    accentGlow: "rgba(0, 0, 0, 0.2)",
    specularWhite: "rgba(255, 255, 255, 0.35)",
  },

  tabBar: {
    active: "#22C55E",
    inactive: "#15803D",
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
