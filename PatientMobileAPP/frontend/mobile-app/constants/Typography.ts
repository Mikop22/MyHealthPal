/**
 * DM Sans font family constants & typography scale.
 * Keys match the expo-google-fonts export names exactly.
 *
 * Scale follows a clear hierarchy aligned with the DoctorAPP web frontend.
 */
export const Fonts = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semiBold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
} as const;

/**
 * Typography presets for consistent text hierarchy.
 * Use with StyleSheet.create or inline styles.
 */
export const TypeScale = {
  /** Large page titles – e.g. "Profile", "Vitals" */
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  /** Section headings inside cards */
  heading: { fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  /** Card titles, stat labels */
  subheading: { fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  /** Primary body text */
  body: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  /** Secondary / supporting text */
  caption: { fontSize: 12, lineHeight: 17, letterSpacing: 0.2 },
  /** Tiny labels, pill text, overlines */
  overline: { fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
  /** Large metric numbers */
  metric: { fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  /** Tab labels, buttons */
  button: { fontSize: 14, lineHeight: 18, letterSpacing: 0.3 },
} as const;
