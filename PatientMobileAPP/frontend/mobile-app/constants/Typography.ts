/**
 * DM Sans font family constants.
 * Keys match the expo-google-fonts export names exactly.
 */
export const Fonts = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semiBold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
} as const;

export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
} as const;

export const LineHeights = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 26,
  xl: 28,
  "2xl": 32,
  "3xl": 36,
  "4xl": 40,
} as const;

export const Typography = {
  display: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes["4xl"],
    lineHeight: LineHeights["4xl"],
    letterSpacing: -0.9,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes["3xl"],
    lineHeight: LineHeights["3xl"],
    letterSpacing: -0.6,
  },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xl,
    lineHeight: LineHeights.xl,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.base,
    letterSpacing: 0,
  },
  bodyStrong: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.base,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    letterSpacing: 0.15,
  },
  micro: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    lineHeight: LineHeights.xs,
    letterSpacing: 0.6,
  },
  button: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
    lineHeight: LineHeights.lg,
    letterSpacing: -0.15,
  },
} as const;
