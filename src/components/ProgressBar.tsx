import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '@/theme';

interface ProgressBarProps {
  /** 0..1 fill fraction. */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  /** Accessible description, e.g. "XP progress". */
  label?: string;
  style?: ViewStyle;
}

/** Reusable static progress bar primitive. */
export function ProgressBar({
  progress,
  color = colors.progress,
  trackColor = colors.violetSoft,
  height = 12,
  label,
  style,
}: ProgressBarProps) {
  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }, style]}
    >
      <View
        style={[styles.fill, { backgroundColor: color, width: `${pct}%`, borderRadius: height / 2 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
