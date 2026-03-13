import { Colors, GlassRadius } from "./Colors";

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
} as const;

export const Radii = {
  pill: 999,
  xs: 12,
  sm: 16,
  md: GlassRadius.sm,
  lg: GlassRadius.md,
  xl: GlassRadius.lg,
} as const;

export const IconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const Shadows = {
  card: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 10,
  },
  glow: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
