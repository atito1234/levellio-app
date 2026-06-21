import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { useMilestones } from '@/state/MilestonesContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getCelebrationTimings } from '@/lib/celebration';
import { getBucketColor } from '@/lib/buckets';
import { navigationRef } from '@/navigation/navigationRef';
import { spacing, typography } from '@/theme';
import type { MilestoneKind } from '@/lib/milestones';

const INK = '#1F2937';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const GOLD = '#FFB23E';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

const KIND_EMOJI: Record<MilestoneKind, string> = {
  streak: '🔥',
  activity_solid: '🌱',
  capacity_full: '✨',
  goal: '🏆',
  project: '🤝',
  project_goal: '🏆',
};

/**
 * Queue-driven celebration overlay for earned milestones — the sanctioned gold
 * moment. Reuses ConfettiBurst + getCelebrationTimings (reduced-motion aware).
 * Mounted once near the navigator so it can overlay any screen post-completion.
 */
export function MilestoneCelebration() {
  const { t } = useTranslation('milestone');
  const { queue, popQueue } = useMilestones();
  const reduced = useReducedMotion();
  const timings = getCelebrationTimings(reduced);
  const current = queue[0];
  const scale = useRef(new Animated.Value(0)).current;
  // Project wins are interactive (share/feed/calendar) → don't auto-dismiss them.
  const interactive = Boolean(current?.share);

  useEffect(() => {
    if (!current) return;
    if (timings.animate) {
      scale.setValue(0);
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    } else {
      scale.setValue(1);
    }
    if (interactive) return; // wait for the user to act/dismiss
    const dwell = reduced ? 1600 : 2800;
    const t = setTimeout(() => popQueue(), dwell);
    return () => clearTimeout(t);
    // Re-run for each distinct milestone shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  const share = current.share;
  // Navigate via the container ref — this overlay sits beside the navigator.
  const go = (nav: () => void) => {
    popQueue();
    if (navigationRef.isReady()) nav();
  };

  const accent = current.accentColorId ? getBucketColor(current.accentColorId).accent : GOLD;
  // The team-win and the sanctioned 100% moments wear gold; lighter beats wear
  // their project colour so the gold reward cue stays special.
  const goldMoment = current.kind === 'project_goal' || (current.progressPct ?? 0) >= 100;
  const borderColor = goldMoment ? GOLD : accent;
  const hasBar = typeof current.progressPct === 'number';

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.fill} onPress={popQueue} accessibilityRole="button" accessibilityLabel={t('dismissA11y')}>
        {timings.confetti && <ConfettiBurst />}
        <Animated.View
          style={[styles.card, { borderColor, transform: [{ scale }] }]}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={
            current.detail
              ? t('milestoneDetailA11y', { label: current.label, detail: current.detail })
              : t('milestoneA11y', { label: current.label })
          }
        >
          <Text style={styles.emoji}>{current.emoji ?? KIND_EMOJI[current.kind]}</Text>
          <Text style={styles.label}>{current.label}</Text>
          {current.detail ? <Text style={styles.detail}>{current.detail}</Text> : null}
          {hasBar && (
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(4, Math.min(100, current.progressPct ?? 0))}%`, backgroundColor: borderColor },
                ]}
              />
            </View>
          )}

          {share ? (
            <>
              <Pressable
                onPress={() =>
                  go(() =>
                    navigationRef.navigate('PostComposer', {
                      kind: 'contribution',
                      projectId: share.projectId,
                      habitTitle: share.habitTitle,
                      value: share.value,
                      mode: share.mode,
                    }),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={t('shareWinA11y')}
                style={[styles.shareBtn, { backgroundColor: TEAL }]}
              >
                <Text style={styles.shareBtnText}>{t('shareWin')}</Text>
              </Pressable>
              <View style={styles.quickRow}>
                <Pressable onPress={() => go(() => navigationRef.navigate('Main', { screen: 'Feed' }))} accessibilityRole="button" style={styles.quickBtn}>
                  <Text style={styles.quickText}>{t('feed')}</Text>
                </Pressable>
                <Pressable onPress={() => go(() => navigationRef.navigate('Plan'))} accessibilityRole="button" style={styles.quickBtn}>
                  <Text style={styles.quickText}>{t('calendar')}</Text>
                </Pressable>
              </View>
              <Pressable onPress={popQueue} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.hint}>{t('common:action.done')}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.hint}>{t('tapToContinue')}</Text>
          )}
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
  detail: { ...typography.caption, color: MUTED, textAlign: 'center' },
  barTrack: { alignSelf: 'stretch', height: 8, borderRadius: 999, backgroundColor: TRACK, overflow: 'hidden', marginTop: spacing.xs },
  barFill: { height: 8, borderRadius: 999 },
  hint: { ...typography.caption, color: MUTED },
  shareBtn: { alignSelf: 'stretch', borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  shareBtnText: { ...typography.label, color: '#0B3D33', fontWeight: '800' },
  quickRow: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  quickBtn: { flex: 1, borderRadius: 999, paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: '#F4F1FE' },
  quickText: { ...typography.label, color: VIOLET, fontWeight: '800' },
});
