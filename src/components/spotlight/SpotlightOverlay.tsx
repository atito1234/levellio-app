/**
 * Renders the active spotlight tour: a dimmed, touch-absorbing backdrop, a
 * highlight ring around the current target, and a Wisp-narrated coaching card.
 * Mount once near the navigation root (sibling of the other global overlays).
 */
import React from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { PressableScale } from '../PressableScale';
import { Wisp } from '../Wisp';
import { useSpotlight } from './SpotlightContext';

const RING_PAD = 8;

export function SpotlightOverlay() {
  const { t } = useTranslation('tour');
  const { steps, index, next, skip, rectFor } = useSpotlight();

  if (!steps || steps.length === 0) return null;
  const step = steps[Math.min(index, steps.length - 1)]!;
  const rect = rectFor(step.targetId);
  const { height: screenH } = Dimensions.get('window');
  const isLast = index >= steps.length - 1;

  // Place the card opposite the target so it never covers what we're pointing at.
  const targetBelowFold = rect ? rect.y > screenH / 2 : false;
  const cardPosition = !rect
    ? styles.cardCenter
    : targetBelowFold
      ? styles.cardTop
      : styles.cardBottom;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={skip}>
      {/* Full-screen backdrop absorbs every touch and does nothing — only the
          card's controls advance the tour (no accidental skips/taps-through). */}
      <Pressable style={styles.backdrop} onPress={() => {}} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />

      {/* Highlight ring around the live target (purely visual). */}
      {rect && (
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              left: rect.x - RING_PAD,
              top: rect.y - RING_PAD,
              width: rect.width + RING_PAD * 2,
              height: rect.height + RING_PAD * 2,
            },
          ]}
        />
      )}

      <View pointerEvents="box-none" style={[styles.cardWrap, cardPosition]}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.wispStage}>
            <Wisp stage="ember" size={48} />
          </View>
          <Text style={styles.stepCount}>{t('step', { current: index + 1, total: steps.length })}</Text>
          <Text style={styles.title} accessibilityRole="header">{t(step.titleKey)}</Text>
          <Text style={styles.body}>{t(step.bodyKey)}</Text>

          <PressableScale onPress={next} accessibilityRole="button" accessibilityLabel={isLast ? t('done') : t('next')} style={styles.cta}>
            <Text style={styles.ctaText}>{isLast ? t('done') : t('next')}</Text>
          </PressableScale>

          {!isLast && (
            <Pressable onPress={skip} accessibilityRole="button" hitSlop={8} style={styles.skip}>
              <Text style={styles.skipText}>{t('skip')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,30,0.78)' },
  ring: {
    position: 'absolute',
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.identity,
    backgroundColor: 'rgba(108,76,241,0.12)',
  },
  cardWrap: { ...StyleSheet.absoluteFillObject, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  cardTop: { justifyContent: 'flex-start', paddingTop: spacing.xxxl },
  cardBottom: { justifyContent: 'flex-end', paddingBottom: spacing.xxxl + spacing.lg },
  cardCenter: { justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
    ...shadows.lg,
  },
  wispStage: { width: 64, height: 64, borderRadius: radii.pill, backgroundColor: colors.violetSoft, alignItems: 'center', justifyContent: 'center' },
  stepCount: { ...typography.caption, color: colors.textMuted, letterSpacing: 1, fontWeight: '800' },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center', fontWeight: '800' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  cta: { backgroundColor: colors.identity, borderRadius: radii.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, alignItems: 'center', marginTop: spacing.xs, alignSelf: 'stretch' },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  skip: { paddingVertical: spacing.sm },
  skipText: { ...typography.label, color: colors.textMuted, fontWeight: '700' },
});
