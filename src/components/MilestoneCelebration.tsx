import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { useMilestones } from '@/state/MilestonesContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getCelebrationTimings } from '@/lib/celebration';
import { spacing, typography } from '@/theme';
import type { MilestoneKind } from '@/lib/milestones';

const INK = '#1F2937';
const CARD = '#FFFFFF';
const GOLD = '#FFB23E';
const MUTED = '#5A5A72';

const KIND_EMOJI: Record<MilestoneKind, string> = {
  streak: '🔥',
  activity_solid: '🌱',
  capacity_full: '✨',
  goal: '🏆',
};

/**
 * Queue-driven celebration overlay for earned milestones — the sanctioned gold
 * moment. Reuses ConfettiBurst + getCelebrationTimings (reduced-motion aware).
 * Mounted once near the navigator so it can overlay any screen post-completion.
 */
export function MilestoneCelebration() {
  const { queue, popQueue } = useMilestones();
  const reduced = useReducedMotion();
  const timings = getCelebrationTimings(reduced);
  const current = queue[0];
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    if (timings.animate) {
      scale.setValue(0);
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    } else {
      scale.setValue(1);
    }
    const dwell = reduced ? 1600 : 2800;
    const t = setTimeout(() => popQueue(), dwell);
    return () => clearTimeout(t);
    // Re-run for each distinct milestone shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.fill} onPress={popQueue} accessibilityRole="button" accessibilityLabel="Dismiss celebration">
        {timings.confetti && <ConfettiBurst />}
        <Animated.View
          style={[styles.card, { transform: [{ scale }] }]}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Milestone: ${current.label}`}
        >
          <Text style={styles.emoji}>{KIND_EMOJI[current.kind]}</Text>
          <Text style={styles.label}>{current.label}</Text>
          <Text style={styles.hint}>Tap to continue</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31,41,55,0.45)' },
  card: {
    backgroundColor: CARD,
    borderRadius: 24,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: GOLD,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  emoji: { fontSize: 48 },
  label: { ...typography.title, color: INK, fontWeight: '800', textAlign: 'center' },
  hint: { ...typography.caption, color: MUTED },
});
