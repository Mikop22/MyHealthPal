/**
 * AppIcon — bespoke SVG icon set for MyHealthPath.
 * Drop-in replacement for Ionicons. All paths are custom-drawn.
 */
import React from "react";
import Svg, {
    Path,
    Circle,
    Rect,
    G,
    Line,
    Polyline,
    Ellipse,
} from "react-native-svg";

export type AppIconName =
    | "scanner"
    | "camera"
    | "triage"
    | "vitals"
    | "funding"
    | "community"
    | "mic"
    | "stop"
    | "location"
    | "checkmark"
    | "checkmark-circle"
    | "checkmark-done-circle"
    | "close"
    | "close-circle"
    | "warning"
    | "medical"
    | "nutrition"
    | "fitness"
    | "alert-circle"
    | "information-circle"
    | "person"
    | "shield-checkmark"
    | "heart"
    | "pulse"
    | "bandage"
    | "scan-outline"
    | "add"
    | "images"
    | "clipboard"
    | "sparkles"
    | "refresh";

interface AppIconProps {
    name: AppIconName;
    size?: number;
    color?: string;
    style?: object;
}

export function AppIcon({ name, size = 24, color = "#166534", style }: AppIconProps) {
    const s = size;
    const c = color;

    switch (name) {
        /* ── Camera (photo camera) ── */
        case "camera":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path
                        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z"
                        stroke={c}
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                        fill={c}
                        fillOpacity={0.08}
                    />
                    <Circle cx={12} cy={13} r={4} stroke={c} strokeWidth={1.8} />
                    <Circle cx={12} cy={13} r={1.5} fill={c} fillOpacity={0.3} />
                </Svg>
            );

        /* ── Tab: Scanner (crosshair lens) ── */
        case "scanner":
        case "scan-outline":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    {/* Corner brackets */}
                    <Path d="M3 9V5a2 2 0 0 1 2-2h4" stroke={c} strokeWidth={2} strokeLinecap="round" />
                    <Path d="M15 3h4a2 2 0 0 1 2 2v4" stroke={c} strokeWidth={2} strokeLinecap="round" />
                    <Path d="M21 15v4a2 2 0 0 1-2 2h-4" stroke={c} strokeWidth={2} strokeLinecap="round" />
                    <Path d="M9 21H5a2 2 0 0 1-2-2v-4" stroke={c} strokeWidth={2} strokeLinecap="round" />
                    {/* Center crosshair */}
                    <Circle cx={12} cy={12} r={2.5} stroke={c} strokeWidth={1.8} />
                    <Line x1={12} y1={8} x2={12} y2={9.5} stroke={c} strokeWidth={1.8} strokeLinecap="round" />
                    <Line x1={12} y1={14.5} x2={12} y2={16} stroke={c} strokeWidth={1.8} strokeLinecap="round" />
                    <Line x1={8} y1={12} x2={9.5} y2={12} stroke={c} strokeWidth={1.8} strokeLinecap="round" />
                    <Line x1={14.5} y1={12} x2={16} y2={12} stroke={c} strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
            );

        /* ── Tab: Triage (waveform mic) ── */
        case "triage":
        case "mic":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    {/* Mic capsule */}
                    <Rect x={8.5} y={2} width={7} height={12} rx={3.5} stroke={c} strokeWidth={2} />
                    {/* Stand arc */}
                    <Path d="M5 11a7 7 0 0 0 14 0" stroke={c} strokeWidth={2} strokeLinecap="round" />
                    {/* Stem */}
                    <Line x1={12} y1={18} x2={12} y2={22} stroke={c} strokeWidth={2} strokeLinecap="round" />
                    <Line x1={9} y1={22} x2={15} y2={22} stroke={c} strokeWidth={2} strokeLinecap="round" />
                    {/* Waveform lines inside capsule */}
                    <Line x1={11} y1={7} x2={11} y2={10} stroke={c} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
                    <Line x1={13} y1={6} x2={13} y2={11} stroke={c} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
                </Svg>
            );

        /* ── Stop ── */
        case "stop":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Rect x={5} y={5} width={14} height={14} rx={3} fill={c} />
                </Svg>
            );

        /* ── Tab: Vitals (ECG pulse) ── */
        case "vitals":
        case "pulse":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Polyline
                        points="2,12 5,12 7,5 9,19 11,9 13,15 15,12 22,12"
                        stroke={c}
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />
                </Svg>
            );

        /* ── Tab: Funding (coin stack) ── */
        case "funding":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Ellipse cx={12} cy={7} rx={8} ry={3} stroke={c} strokeWidth={2} />
                    <Path d="M4 7v5c0 1.66 3.58 3 8 3s8-1.34 8-3V7" stroke={c} strokeWidth={2} />
                    <Path d="M4 12v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" stroke={c} strokeWidth={2} />
                </Svg>
            );

        /* ── Clipboard ── */
        case "clipboard":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke={c} strokeWidth={2} strokeLinecap="round" />
                    <Rect x={8} y={2} width={8} height={4} rx={1} stroke={c} strokeWidth={2} fill="#fff" />
                    <Line x1={8} y1={10} x2={16} y2={10} stroke={c} strokeWidth={1.5} strokeLinecap="round" />
                    <Line x1={8} y1={14} x2={16} y2={14} stroke={c} strokeWidth={1.5} strokeLinecap="round" />
                    <Line x1={8} y1={18} x2={13} y2={18} stroke={c} strokeWidth={1.5} strokeLinecap="round" />
                </Svg>
            );

        /* ── Tab: Community (branching people) ── */
        case "community":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    {/* Center person */}
                    <Circle cx={12} cy={7} r={2.5} stroke={c} strokeWidth={1.8} />
                    <Path d="M8 20v-2a4 4 0 0 1 8 0v2" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
                    {/* Left person */}
                    <Circle cx={5} cy={9} r={2} stroke={c} strokeWidth={1.6} />
                    <Path d="M2 20v-1.5a3 3 0 0 1 5-2.24" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
                    {/* Right person */}
                    <Circle cx={19} cy={9} r={2} stroke={c} strokeWidth={1.6} />
                    <Path d="M22 20v-1.5a3 3 0 0 0-5-2.24" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
                </Svg>
            );

        /* ── Location pin ── */
        case "location":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                        stroke={c}
                        strokeWidth={2}
                        fill={c}
                        fillOpacity={0.15}
                    />
                    <Circle cx={12} cy={9} r={2.5} fill={c} />
                </Svg>
            );

        /* ── Checkmark ── */
        case "checkmark":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path d="M5 13l4 4L19 7" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );

        /* ── Checkmark circle ── */
        case "checkmark-circle":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Circle cx={12} cy={12} r={9.5} stroke={c} strokeWidth={1.8} fill={c} fillOpacity={0.12} />
                    <Path d="M8 12.5l3 3 5-5.5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );

        /* ── Checkmark done (double tick) ── */
        case "checkmark-done-circle":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Circle cx={12} cy={12} r={9.5} stroke={c} strokeWidth={1.8} fill={c} fillOpacity={0.12} />
                    <Path d="M6 12.5l3 3 9-9" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M10 15.5l1.5 1.5" stroke={c} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
                </Svg>
            );

        /* ── Add (Plus) ── */
        case "add":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth={2.2} strokeLinecap="round" />
                </Svg>
            );

        /* ── Images ── */
        case "images":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Rect x={4} y={4} width={16} height={16} rx={2} stroke={c} strokeWidth={2} opacity={0.5} />
                    <Rect x={8} y={8} width={12} height={12} rx={2} stroke={c} strokeWidth={2} fill="#fff" />
                    <Path d="M8 16l3-3 2 2 4-4 3 3" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx={12} cy={12} r={1.5} fill={c} />
                </Svg>
            );

        /* ── Close X ── */
        case "close":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path d="M6 6l12 12M18 6l-12 12" stroke={c} strokeWidth={2.2} strokeLinecap="round" />
                </Svg>
            );

        /* ── Close circle ── */
        case "close-circle":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Circle cx={12} cy={12} r={9.5} stroke={c} strokeWidth={1.8} fill={c} fillOpacity={0.12} />
                    <Path d="M9 9l6 6M15 9l-6 6" stroke={c} strokeWidth={2} strokeLinecap="round" />
                </Svg>
            );

        /* ── Warning triangle ── */
        case "warning":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path
                        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                        stroke={c}
                        strokeWidth={1.8}
                        fill={c}
                        fillOpacity={0.12}
                    />
                    <Line x1={12} y1={9} x2={12} y2={13} stroke={c} strokeWidth={2} strokeLinecap="round" />
                    <Circle cx={12} cy={17} r={1} fill={c} />
                </Svg>
            );

        /* ── Medical cross ── */
        case "medical":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path
                        d="M9 3h6v6h6v6h-6v6H9v-6H3v-6h6V3z"
                        stroke={c}
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                        fill={c}
                        fillOpacity={0.1}
                    />
                </Svg>
            );

        /* ── Nutrition leaf ── */
        case "nutrition":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path
                        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                        stroke={c}
                        strokeWidth={1.8}
                        fill={c}
                        fillOpacity={0.1}
                    />
                    <Line x1={12} y1={5.67} x2={12} y2={21.23} stroke={c} strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
                </Svg>
            );

        /* ── Fitness band / activity ── */
        case "fitness":
        case "bandage":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    {/* Wristband */}
                    <Rect x={6} y={8} width={12} height={8} rx={4} stroke={c} strokeWidth={2} fill={c} fillOpacity={0.1} />
                    {/* Pulse blip */}
                    <Polyline points="9,12 10.5,12 11.5,10 13,14 14,12 15,12" stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
            );

        /* ── Alert circle (!) ── */
        case "alert-circle":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Circle cx={12} cy={12} r={9.5} stroke={c} strokeWidth={1.8} fill={c} fillOpacity={0.1} />
                    <Line x1={12} y1={8} x2={12} y2={13} stroke={c} strokeWidth={2} strokeLinecap="round" />
                    <Circle cx={12} cy={16.5} r={1} fill={c} />
                </Svg>
            );

        /* ── Info circle ── */
        case "information-circle":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Circle cx={12} cy={12} r={9.5} stroke={c} strokeWidth={1.8} fill={c} fillOpacity={0.08} />
                    <Circle cx={12} cy={8} r={1} fill={c} />
                    <Line x1={12} y1={11} x2={12} y2={16} stroke={c} strokeWidth={2} strokeLinecap="round" />
                </Svg>
            );

        /* ── Person ── */
        case "person":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Circle cx={12} cy={8} r={4} stroke={c} strokeWidth={1.8} />
                    <Path d="M4 20v-1a8 8 0 0 1 16 0v1" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
            );

        /* ── Shield checkmark ── */
        case "shield-checkmark":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path
                        d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                        stroke={c}
                        strokeWidth={1.8}
                        fill={c}
                        fillOpacity={0.1}
                    />
                    <Path d="M9 12l2.5 2.5 4-4" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );

        /* ── Heart ── */
        case "heart":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path
                        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                        stroke={c}
                        strokeWidth={2}
                        fill={c}
                        fillOpacity={0.15}
                    />
                </Svg>
            );

        /* ── Sparkles (AI / magic) ── */
        case "sparkles":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill={c} fillOpacity={0.15} />
                    <Path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z" stroke={c} strokeWidth={1.4} strokeLinejoin="round" fill={c} fillOpacity={0.2} />
                </Svg>
            );

        /* ── Refresh (circular arrow) ── */
        case "refresh":
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Path d="M1 4v6h6" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );

        default:
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={style as any}>
                    <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={2} />
                </Svg>
            );
    }
}

export default AppIcon;
