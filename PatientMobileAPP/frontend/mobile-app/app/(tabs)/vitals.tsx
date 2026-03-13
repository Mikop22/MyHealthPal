import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
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
import { MetricPill } from "../../components/MetricPill";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { UniversalLiquidCard } from "../../components/UniversalLiquidCard";
import {
  getMockBiometrics,
  type BiometricSeries,
} from "../../providers/MockHealthKit";
import { Colors } from "../../constants/Colors";
import { Fonts, Typography } from "../../constants/Typography";

const METRICS = getMockBiometrics();

const METRIC_ICONS: Record<string, Parameters<typeof AppIcon>[0]["name"]> = {
  hrv: "vitals",
  spo2: "heart",
  temp: "alert-circle",
  steps: "fitness",
};

type MetricIconName = Parameters<typeof AppIcon>[0]["name"];

function PulsingAlertBadge({ text }: { text: string }) {
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
    borderColor: `rgba(34,197,94,${glow.value * 0.8})`,
    shadowOpacity: glow.value * 0.4,
  }));

  return (
    <Animated.View style={[styles.alertBadge, glowStyle]}>
      <View style={styles.alertIconWrap}>
        <AppIcon name="warning" size={20} color={Colors.accent} />
      </View>
      <View style={styles.alertTextWrap}>
        <Text style={styles.alertTitle}>Clinically significant deviation</Text>
        <Text style={styles.alertSub}>Consider contacting your care team</Text>
      </View>
    </Animated.View>
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
        dataPointColor: d.flag ? Colors.accent : Colors.primary,
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

  const chartWidth = Math.min(width - 90, 500);

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
        <Animated.View entering={getFirstTouchEntering(0)}>
          <UniversalLiquidCard variant="elevated" style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <SectionHeader
                eyebrow="Health overview"
                title="Vitals"
                subtitle="Track your baseline, spot changes early, and know when to reach out."
              />
              <StatusBadge
                tone={isAnomaly ? "warning" : "success"}
                icon={isAnomaly ? "warning" : "checkmark-circle"}
                label={isAnomaly ? "Needs review" : "Within range"}
              />
            </View>

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Latest reading</Text>
                <Text style={styles.summaryStatValue}>
                  {latest.value} <Text style={styles.summaryStatUnit}>{active.unit}</Text>
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>26-week baseline</Text>
                <Text style={styles.summaryStatValue}>
                  {active.baselineAvg}{" "}
                  <Text style={styles.summaryStatUnit}>{active.unit}</Text>
                </Text>
              </View>
            </View>
          </UniversalLiquidCard>
        </Animated.View>

        <Animated.View entering={getFirstTouchEntering(0)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {METRICS.map((m) => {
              const isActive = m.key === activeKey;
              const iconName: MetricIconName = (METRIC_ICONS[m.key] ??
                "vitals") as MetricIconName;
              const ulStyle = useAnimatedStyle(() => ({
                width: `${interpolate(
                  underlineWidths[m.key].value,
                  [0, 1],
                  [0, 100],
                )}%`,
              }));

              return (
                <Pressable
                  key={m.key}
                  onPress={() => setActiveKey(m.key)}
                  style={styles.pillOuter}
                >
                  <MetricPill
                    label={m.shortLabel}
                    icon={iconName}
                    active={isActive}
                    onPress={() => setActiveKey(m.key)}
                  />
                  <View style={styles.underlineTrack}>
                    <Animated.View style={[styles.underlineFill, ulStyle]} />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={getFirstTouchEntering(1)}>
          <UniversalLiquidCard variant="elevated" style={styles.chartCard}>
            <SectionHeader
              eyebrow="Trend"
              title={active.label}
              subtitle="Compared with your personal baseline and risk threshold."
            />

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
                  fill="rgba(239,68,68,0.07)"
                />
              </Svg>

              <View style={styles.chartWrap}>
                <LineChart
                  data={chartData}
                  width={chartWidth}
                  height={chartHeight}
                  curved
                  areaChart
                  color={Colors.primary}
                  thickness={3}
                  startFillColor="rgba(22,101,52,0.30)"
                  endFillColor="rgba(255,255,255,0)"
                  startOpacity={0.4}
                  endOpacity={0}
                  hideDataPoints={false}
                  dataPointsColor={Colors.primary}
                  dataPointsHeight={8}
                  dataPointsWidth={8}
                  xAxisColor={Colors.forest[200]}
                  yAxisColor="transparent"
                  yAxisTextStyle={styles.axisText}
                  xAxisLabelTextStyle={styles.axisText}
                  rulesType="dashed"
                  dashWidth={4}
                  dashGap={4}
                  rulesColor={Colors.forest[100]}
                  noOfSections={4}
                  showReferenceLine1
                  referenceLine1Position={active.baselineAvg}
                  referenceLine1Config={{
                    color: Colors.forest[400],
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
              <Text style={styles.legendLabel}>Risk zone (±15%)</Text>
            </View>
          </UniversalLiquidCard>
        </Animated.View>

        <Animated.View entering={getFirstTouchEntering(2)}>
          <UniversalLiquidCard
            variant={isAnomaly ? "active" : "default"}
            style={styles.deltaCard}
          >
            <View style={styles.deltaRow}>
              <View style={styles.deltaLeft}>
                <Text style={styles.deltaEyebrow}>Current snapshot</Text>
                <Text style={styles.deltaMetric}>
                  {latest.value}{" "}
                  <Text style={styles.deltaUnit}>{active.unit}</Text>
                </Text>
                <Text style={styles.deltaLabel}>Current (Feb 21)</Text>
              </View>

              <View style={styles.deltaDivider} />

              <View style={styles.deltaRight}>
                <Text style={styles.deltaEyebrow}>Delta</Text>
                <Text
                  style={[
                    styles.deltaValue,
                    { color: isAnomaly ? Colors.accent : Colors.forest[600] },
                  ]}
                >
                  {deltaSign}
                  {delta.toFixed(1)} {active.unit}
                </Text>
                <Text style={styles.deltaLabel}>vs baseline</Text>
              </View>
            </View>

            {isAnomaly && (
              <View style={styles.alertStack}>
                <StatusBadge
                  tone="warning"
                  icon="warning"
                  label="Action recommended"
                />
                <PulsingAlertBadge text="Clinically significant deviation detected" />
              </View>
            )}
          </UniversalLiquidCard>
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

  const s = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.spikeOuter, s]}>
      <View style={styles.spikeInner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 14 },
  summaryCard: {
    padding: 20,
  },
  summaryTopRow: {
    gap: 16,
  },
  summaryStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 20,
  },
  summaryStat: {
    flex: 1,
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: Colors.border.soft,
  },
  summaryStatLabel: {
    ...Typography.micro,
    color: Colors.text.muted,
    textTransform: "uppercase",
  },
  summaryStatValue: {
    ...Typography.sectionTitle,
    color: Colors.text.primary,
  },
  summaryStatUnit: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  pillRow: { gap: 8, paddingVertical: 8, paddingBottom: 16 },
  pillOuter: { alignItems: "center" },
  underlineTrack: {
    height: 2.5,
    width: "80%",
    marginTop: 3,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  underlineFill: {
    height: 2.5,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  chartCard: { padding: 20, marginBottom: 14 },
  riskZoneWrap: { position: "relative", marginTop: 16, marginBottom: 8 },
  chartWrap: { marginLeft: -8 },
  axisText: { fontSize: 11, color: Colors.text.muted, fontFamily: Fonts.medium },
  spikeOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  spikeInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: "#fff",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  legendLine: {
    width: 20,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.forest[400],
  },
  legendLabel: { fontSize: 12, color: Colors.forest[500] },
  riskLegend: {
    width: 16,
    height: 8,
    borderRadius: 2,
    backgroundColor: "rgba(239,68,68,0.2)",
    marginLeft: 8,
  },
  deltaCard: { padding: 20, marginBottom: 14 },
  deltaRow: { flexDirection: "row", alignItems: "center" },
  deltaLeft: { flex: 1 },
  deltaRight: { flex: 1, alignItems: "flex-end" },
  deltaEyebrow: {
    ...Typography.micro,
    color: Colors.text.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  deltaDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border.soft,
    marginHorizontal: 16,
  },
  deltaMetric: {
    ...Typography.title,
    color: Colors.text.primary,
  },
  deltaUnit: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  deltaLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  deltaValue: {
    ...Typography.sectionTitle,
  },
  alertStack: {
    gap: 10,
    marginTop: 14,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(34,197,94,0.4)",
    backgroundColor: "rgba(34,197,94,0.06)",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(34,197,94,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertTextWrap: { flex: 1 },
  alertTitle: { ...Typography.caption, color: Colors.text.primary },
  alertSub: { ...Typography.micro, color: Colors.text.secondary, marginTop: 2 },
});
