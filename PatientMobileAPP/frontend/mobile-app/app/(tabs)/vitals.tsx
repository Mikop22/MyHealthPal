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
import { LinearGradient } from "expo-linear-gradient";
import { LineChart } from "react-native-gifted-charts";
import Svg, { Rect } from "react-native-svg";
import { AppIcon } from "../../components/AppIcon";
import { UniversalLiquidCard } from "../../components/UniversalLiquidCard";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusBadge } from "../../components/StatusBadge";
import {
  getMockBiometrics,
  type BiometricSeries,
} from "../../providers/MockHealthKit";
import { Colors } from "../../constants/Colors";
import { Fonts, TypeScale } from "../../constants/Typography";

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
    borderColor: `rgba(226,92,92,${glow.value * 0.6})`,
    shadowOpacity: glow.value * 0.4,
  }));

  return (
    <Animated.View style={[styles.alertBadge, glowStyle]}>
      <View style={styles.alertIconWrap}>
        <AppIcon name="warning" size={20} color={Colors.semantic.error} />
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

        <Animated.View entering={getFirstTouchEntering(1)}>
          <UniversalLiquidCard variant="elevated" style={styles.chartCard}>
            <Text style={styles.chartTitle}>{active.label}</Text>

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
              <Text style={styles.legendLabel}>Risk zone (Â±15%)</Text>
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
                <Text style={styles.deltaMetric}>
                  {latest.value}{" "}
                  <Text style={styles.deltaUnit}>{active.unit}</Text>
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
              <PulsingAlertBadge text="Clinically significant deviation detected" />
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
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
  pillRow: { gap: 8, paddingVertical: 8, paddingBottom: 16 },
  pillOuter: { alignItems: "center" },
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
    height: 2.5,
    width: "80%",
    marginTop: 3,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  underlineFill: {
    height: 2.5,
    backgroundColor: Colors.brand,
    borderRadius: 2,
  },
  chartCard: { padding: 20, marginBottom: 14 },
  chartTitle: {
    ...TypeScale.subheading,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    marginBottom: 16,
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
  legendLabel: { ...TypeScale.caption, color: Colors.text.muted },
  riskLegend: {
    width: 16,
    height: 8,
    borderRadius: 2,
    backgroundColor: "rgba(226,92,92,0.2)",
    marginLeft: 8,
  },
  deltaCard: { padding: 20, marginBottom: 14 },
  deltaRow: { flexDirection: "row", alignItems: "center" },
  deltaLeft: { flex: 1 },
  deltaRight: { flex: 1, alignItems: "flex-end" },
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
  deltaValue: { fontSize: 22, fontWeight: "700" },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    ...TypeScale.caption,
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
