/**
 * Pill — the one chip/pill "bubble" for analytics (best-time pills, capacity
 * chips, filter chips, status badges). Consistent radius, padding, and tone
 * colors so every small bubble matches.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { A, radii, spacing, typography } from '@/theme';

export type PillTone = 'violet' | 'teal' | 'gold' | 'neutral';

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  violet: { bg: A.violetSoft, fg: A.violetDeep },
  teal: { bg: A.tealSoft, fg: A.tealDeep },
  gold: { bg: '#FFEBCC', fg: A.goldDeep },
  neutral: { bg: '#ECECF2', fg: A.muted },
};

export function Pill({ label, tone = 'violet' }: { label: string; tone?: PillTone }) {
  const c = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6, alignSelf: 'flex-start' },
  text: { ...typography.caption, fontWeight: '700' },
});
