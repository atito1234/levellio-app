/**
 * DialTimer — a circular timer you set by spinning the ring with a finger
 * (clockwise from 12 o'clock to add time), like turning up an oven dial. Fully
 * customizable on any activity, and adjustable even while a session is running.
 *
 * The arc shows the live `progress` (0..1) when provided (a depleting countdown),
 * otherwise the dialled-in fraction. The center renders whatever label the caller
 * passes (e.g. the MM:SS clock). Accessible via the adjustable role + increment/
 * decrement actions (so it's not drag-only).
 */
import React, { useRef } from 'react';
import { PanResponder, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, typography } from '@/theme';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function DialTimer({
  minutes,
  onChange,
  min = 1,
  max = 120,
  size = 220,
  stroke = 18,
  color = colors.identity,
  trackColor = '#E8E6E0',
  progress,
  centerLabel,
  sublabel,
  disabled = false,
}: {
  minutes: number;
  onChange: (m: number) => void;
  min?: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  /** 0..1 live countdown fraction; when set, the arc shows this instead of the dialled value. */
  progress?: number;
  centerLabel?: string;
  sublabel?: string;
  disabled?: boolean;
}) {
  const c = size / 2;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const setFrac = clamp((minutes - min) / (max - min || 1), 0, 1);
  const arcFrac = progress != null ? clamp(progress, 0, 1) : setFrac;

  // Keep geometry + the latest onChange in a ref so the once-created PanResponder
  // never reads a stale closure.
  const cfg = useRef({ onChange, min, max, c, r });
  cfg.current = { onChange, min, max, c, r };

  const fromTouch = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const g = cfg.current;
    const cx = locationX - g.c;
    const cy = locationY - g.c;
    if (Math.hypot(cx, cy) < g.r * 0.35) return; // dead-zone near the center
    let deg = Math.atan2(cx, -cy) * (180 / Math.PI); // 0 at top, clockwise positive
    if (deg < 0) deg += 360;
    g.onChange(clamp(Math.round(g.min + (deg / 360) * (g.max - g.min)), g.min, g.max));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: fromTouch,
      onPanResponderMove: fromTouch,
    }),
  ).current;

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      {...(disabled ? {} : pan.panHandlers)}
      accessibilityRole="adjustable"
      accessibilityLabel={sublabel}
      accessibilityValue={{ text: `${minutes}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (disabled) return;
        if (e.nativeEvent.actionName === 'increment') onChange(clamp(minutes + 1, min, max));
        if (e.nativeEvent.actionName === 'decrement') onChange(clamp(minutes - 1, min, max));
      }}
    >
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <G transform={`rotate(-90, ${c}, ${c})`}>
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - arcFrac)}
          />
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {centerLabel ? <Text style={styles.big}>{centerLabel}</Text> : null}
        {sublabel ? <Text style={styles.sub}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  big: { ...typography.heading, color: colors.textPrimary, fontWeight: '900', fontSize: 44 },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
