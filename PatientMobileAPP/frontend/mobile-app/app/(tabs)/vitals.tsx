import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { LineChart } from "react-native-gifted-charts";
import Svg, { Rect } from "react-native-svg";
import { AppIcon } from "../../components/AppIcon";
import {
  getMockBiometrics,
  type BiometricSeries,
} from "../../providers/MockHealthKit";
import { Colors } from "../../constants/Colors";
import { Fonts, TypeScale } from "../../constants/Typography";

const METRICS = getMockBiometrics();

const SCREEN_BG = "#F6F8F6";
const CARD_BG = "#FFFFFF";
const TEXT_PRIMARY = "#101828";
const TEXT_SECONDARY = "#667085";
const TEXT_TERTIARY = "#98A2B3";
const DIVIDER = "rgba(15, 23, 42, 0.08)";

const METRIC_ICONS: Record<string, Parameters<typeof AppIcon>[0]["name"]> = {
  hrv: "vitals",
  spo2: "heart",
  temp: "alert-circle",
  steps: "fitness",
};

type MetricIconName = Parameters<typeof AppIcon>[0]["name"];

function PulsingAlertBadge() {
  const glow = useSharedValue(0.3);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0.3, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(226,92,92,${glow.value * 0.6})`,
    shadowOpacity: glow.value * 0.4,
  }));

  return (
    <Animated.View style={[styles.alertBadge, glowStyle]}>
      <View style={styles.alertIconWrap}>
        <AppIcon name="warning" size={20} color={Colors.semantic.error} />
      </View>
      <View style={styles.alertTextWrap}>
        <Text style={styles.alertTitle}>{text}</Text>
        <Text style={styles.alertSub}>Consider contacting your care team</Text>
      </View>
    </Animated.View>
  );
}

function MetricPill({
  label,
  iconName,
  isActive,
  underlineValue,
  onPress,
}: {
  label: string;
  iconName: MetricIconName;
  isActive: boolean;
  underlineValue: SharedValue<number>;
  onPress: () => void;
}) {
  const ulStyle = useAnimatedStyle(() => ({
    width: `${interpolate(underlineValue.value, [0, 1], [0, 100])}%`,
  }));

  return (
    <Pressable onPress={onPress} style={styles.pillOuter}>
      <View style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}>
        <AppIcon
          name={iconName}
          size={14}
          color={isActive ? "#fff" : TEXT_PRIMARY}
        />
        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
          {label}
        </Text>
      </View>
      <View style={styles.underlineTrack}>
        <Animated.View style={[styles.underlineFill, ulStyle]} />
      </View>
    </Pressable>
  );
}

export default function VitalsScreen() {
  const { width } = useWindowDimensions();
  const [activeKey, setActiveKey] = useState("hrv");
  const hasAnimated = useRef(false);

  const active: BiometricSeries =
    METRICS.find((m) => m.key === activeKey) ?? METRICS[0];

  const ul0 = useSharedValue(1);
  const ul1 = useSharedValue(0);
  const ul2 = useSharedValue(0);
  const ul3 = useSharedValue(0);
  const ul4 = useSharedValue(0);
  const ul5 = useSharedValue(0);
  const underlineWidths: Record<string, SharedValue<number>> = {
    hrv: ul0,
    rhr: ul1,
    temp: ul2,
    resp: ul3,
    steps: ul4,
    sleep: ul5,
  };

  useEffect(() => {
    METRICS.forEach((m) => {
      underlineWidths[m.key].value = withTiming(m.key === activeKey ? 1 : 0, {
        duration: 220,
      });
    });
  }, [activeKey]);

  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  const getFirstTouchEntering = useCallback(
    (index: number) =>
      !hasAnimated.current
        ? FadeInDown.delay((index + 1) * 150)
            .springify()
            .damping(18)
            .stiffness(120)
        : undefined,
    [],
  );

  const chartData = useMemo(
    () =>
      active.data.map((d) => ({
        value: d.value,
        label: d.date.split(" ")[1],
        dataPointColor: d.flag ? Colors.semantic.error : Colors.brand,
        dataPointRadius: d.flag ? 7 : 4,
        customDataPoint: d.flag ? () => <PulsingDataPoint /> : undefined,
      })),
    [active],
  );

  const latest = active.data[active.data.length - 1];
  const delta = latest.value - active.baselineAvg;
  const deltaSign = delta >= 0 ? "+" : "";
  const isAnomaly =
    Math.abs(delta) > Math.abs(active.baselineAvg) * 0.15 ||
    active.data.some((d) => d.flag);

  const chartWidth = Math.min(width - 92, 500);
  const chartHeight = 200;
  const dataMin = Math.min(...active.data.map((d) => d.value));
  const dataMax = Math.max(...active.data.map((d) => d.value));
  const dataRange = dataMax - dataMin || 1;
  const zoneTop = active.baselineAvg * 1.15;
  const zoneBtm = active.baselineAvg * 0.85;
  const zoneTopPct = Math.max(
    0,
    Math.min(1, 1 - (zoneTop - dataMin) / dataRange),
  );
  const zoneBtmPct = Math.max(
    0,
    Math.min(1, 1 - (zoneBtm - dataMin) / dataRange),
  );
  const riskY = zoneTopPct * chartHeight;
  const riskH = Math.max(0, (zoneBtmPct - zoneTopPct) * chartHeight);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={getFirstTouchEntering(0)} style={styles.header}>
          <Text style={styles.pageTitle}>Vitals</Text>
          <Text style={styles.pageSub}>Track the patterns that matter most</Text>
        </Animated.View>

        <Animated.View entering={getFirstTouchEntering(1)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {METRICS.map((m) => {
              const iconName: MetricIconName = (METRIC_ICONS[m.key] ??
                "vitals") as MetricIconName;
              return (
                <MetricPill
                  key={m.key}
                  label={m.shortLabel}
                  iconName={iconName}
                  isActive={m.key === activeKey}
                  underlineValue={underlineWidths[m.key]}
                  onPress={() => setActiveKey(m.key)}
                  style={styles.pillOuter}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[Colors.brandLight, Colors.brand]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pill}
                    >
                      <AppIcon name={iconName} size={14} color="#fff" />
                      <Text style={[styles.pillText, styles.pillTextActive]}>
                        {m.shortLabel}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.pill, styles.pillInactive]}>
                      <AppIcon
                        name={iconName}
                        size={14}
                        color={Colors.text.secondary}
                      />
                      <Text style={styles.pillText}>{m.shortLabel}</Text>
                    </View>
                  )}
                  <View style={styles.underlineTrack}>
                    <Animated.View style={[styles.underlineFill, ulStyle]} />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={getFirstTouchEntering(2)}>
          <View style={styles.surfaceCard}>
            <View style={styles.chartHeader}>
              <View style={styles.chartHeaderText}>
                <Text style={styles.cardEyebrow}>LONGITUDINAL TREND</Text>
                <Text style={styles.chartTitle}>{active.label}</Text>
              </View>
              <View style={styles.chartValuePill}>
                <Text style={styles.chartValue}>
                  {latest.value}
                  <Text style={styles.chartUnit}> {active.unit}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.riskZoneWrap}>
              <Svg
                width={chartWidth}
                height={chartHeight}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              >
                <Rect
                  x={0}
                  y={riskY}
                  width={chartWidth}
                  height={riskH}
                  fill="rgba(239,68,68,0.06)"
                />
              </Svg>

              <View style={styles.chartWrap}>
                <LineChart
                  data={chartData}
                  width={chartWidth}
                  height={chartHeight}
                  curved
                  areaChart
                  color={Colors.brand}
                  thickness={3}
                  startFillColor="rgba(68, 173, 79, 0.25)"
                  endFillColor="rgba(255,255,255,0)"
                  startOpacity={0.4}
                  endOpacity={0}
                  hideDataPoints={false}
                  dataPointsColor={Colors.brand}
                  dataPointsHeight={8}
                  dataPointsWidth={8}
                  xAxisColor="#E4E7EC"
                  yAxisColor="transparent"
                  yAxisTextStyle={styles.axisText}
                  xAxisLabelTextStyle={styles.axisText}
                  rulesType="dashed"
                  dashWidth={4}
                  dashGap={4}
                  rulesColor="#EAECF0"
                  noOfSections={4}
                  showReferenceLine1
                  referenceLine1Position={active.baselineAvg}
                  referenceLine1Config={{
                    color: TEXT_TERTIARY,
                    dashWidth: 6,
                    dashGap: 4,
                    thickness: 1.5,
                  }}
                  spacing={(chartWidth - 40) / (active.data.length - 1)}
                  initialSpacing={20}
                  endSpacing={20}
                  isAnimated
                  animationDuration={800}
                  disableScroll={true}
                  pointerConfig={undefined}
                />
              </View>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendLine} />
              <Text style={styles.legendLabel}>
                26-week baseline: {active.baselineAvg} {active.unit}
              </Text>
              <View style={styles.riskLegend} />
              <Text style={styles.legendLabel}>Risk zone (+/-15%)</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={getFirstTouchEntering(3)}>
          <View style={styles.surfaceCard}>
            <View style={styles.deltaRow}>
              <View style={styles.deltaLeft}>
                <Text style={styles.deltaMetric}>
                  {latest.value} <Text style={styles.deltaUnit}>{active.unit}</Text>
                </Text>
                <Text style={styles.deltaLabel}>Current (Feb 21)</Text>
              </View>

              <View style={styles.deltaDivider} />

              <View style={styles.deltaRight}>
                <Text
                  style={[
                    styles.deltaValue,
                    { color: isAnomaly ? Colors.semantic.error : Colors.semantic.success },
                  ]}
                >
                  {deltaSign}
                  {delta.toFixed(1)} {active.unit}
                </Text>
                <Text style={styles.deltaLabel}>vs baseline</Text>
              </View>
            </View>

            {isAnomaly && (
              <PulsingAlertBadge />
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function PulsingDataPoint() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.spikeOuter, animatedStyle]}>
      <View style={styles.spikeInner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 96,
  },
  header: {
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.8,
  },
  pageSub: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  surfaceCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  pillRow: {
    gap: 10,
    paddingBottom: 20,
  },
  pillOuter: {
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  pillInactive: {
    backgroundColor: "rgba(68, 173, 79, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(68, 173, 79, 0.12)",
  },
  pillText: { fontSize: 14, fontWeight: "600", color: Colors.text.secondary },
  pillTextActive: { color: "#fff" },
  underlineTrack: {
    height: 3,
    width: "58%",
    marginTop: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  underlineFill: {
<<<<<<< HEAD
    height: 3,
    backgroundColor: Colors.accent,
    borderRadius: 999,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  chartHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cardEyebrow: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: TEXT_SECONDARY,
    letterSpacing: 1.4,
    marginBottom: 6,
=======
    height: 2.5,
    backgroundColor: Colors.brand,
    borderRadius: 2,
>>>>>>> 48bb07f9ca3b8fffa3be953e30da10c96a084e3b
  },
  chartTitle: {
    ...TypeScale.subheading,
    fontFamily: Fonts.bold,
<<<<<<< HEAD
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  chartValuePill: {
    flexShrink: 0,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(34, 197, 94, 0.10)",
  },
  chartValue: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.accent,
    letterSpacing: -0.2,
  },
  chartUnit: {
    fontFamily: Fonts.medium,
    color: TEXT_SECONDARY,
  },
  riskZoneWrap: {
    position: "relative",
    marginBottom: 10,
    width: "100%",
    overflow: "hidden",
  },
  chartWrap: {
    width: "100%",
  },
  axisText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
=======
    color: Colors.text.primary,
    marginBottom: 16,
>>>>>>> 48bb07f9ca3b8fffa3be953e30da10c96a084e3b
  },
  riskZoneWrap: { position: "relative", marginBottom: 8 },
  chartWrap: { marginLeft: -8 },
  axisText: { fontSize: 11, color: Colors.text.muted },
  spikeOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(226, 92, 92, 0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  spikeInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.semantic.error,
    borderWidth: 2,
    borderColor: "#fff",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap",
  },
  legendLine: {
    width: 20,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: TEXT_TERTIARY,
  },
  legendLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  legendLabel: { ...TypeScale.caption, color: Colors.text.muted },
  riskLegend: {
    width: 16,
    height: 8,
    borderRadius: 2,
    backgroundColor: "rgba(226,92,92,0.2)",
    marginLeft: 8,
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deltaLeft: {
    flex: 1,
  },
  deltaRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  deltaDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(200, 230, 210, 0.4)",
    marginHorizontal: 16,
  },
  deltaMetric: {
    ...TypeScale.title,
    fontWeight: "800",
    color: Colors.text.primary,
  },
  deltaUnit: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text.muted,
  },
  deltaLabel: {
    ...TypeScale.caption,
    color: Colors.text.muted,
    marginTop: 2,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(226, 92, 92, 0.3)",
    backgroundColor: Colors.semantic.errorBg,
    shadowColor: Colors.semantic.error,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(226, 92, 92, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertTextWrap: { flex: 1 },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.semantic.error,
  },
  alertSub: {
    ...TypeScale.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
