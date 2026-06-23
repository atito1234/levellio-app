/**
 * The single "join to unlock" panel shown wherever a signed-in account is needed
 * (Feed, Projects, Inbox, posting). One look + one value proposition everywhere,
 * so the door to the community is instantly recognizable. Presentational: the
 * caller wires the primary action (open the auth surface) and an optional
 * secondary (e.g. "I have an invite code").
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { AnimatedHero } from './AnimatedHero';
import { PressableScale } from './PressableScale';

interface CommunityGateProps {
  onPrimary: () => void;
  /** Optional override copy; defaults to the shared `auth.gate.*` strings. */
  title?: string;
  body?: string;
  ctaLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function CommunityGate({ onPrimary, title, body, ctaLabel, secondaryLabel, onSecondary }: CommunityGateProps) {
  const { t } = useTranslation('auth');
  const { character } = useGame();

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <View style={styles.halo} />
        <AnimatedHero presentation={character?.presentation ?? 'neutral'} tier={character?.tier ?? 'pathfinder'} size={108} />
      </View>
      <Text style={styles.title} accessibilityRole="header">{title ?? t('gate.title')}</Text>
      <Text style={styles.body}>{body ?? t('gate.body')}</Text>

      <PressableScale onPress={onPrimary} accessibilityRole="button" accessibilityLabel={ctaLabel ?? t('gate.cta')} style={styles.cta}>
        <Text style={styles.ctaText}>{ctaLabel ?? t('gate.cta')}</Text>
      </PressableScale>

      {onSecondary && (
        <Pressable onPress={onSecondary} accessibilityRole="button" style={styles.secondary} hitSlop={8}>
          <Text style={styles.secondaryText}>{secondaryLabel ?? t('gate.haveCode')}</Text>
        </Pressable>
      )}

      <Text style={styles.trust}>{t('trust')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  stage: { width: 150, height: 150, borderRadius: radii.xl, backgroundColor: colors.violetDeep, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadows.lg },
  halo: { position: 'absolute', width: 116, height: 116, borderRadius: radii.round, backgroundColor: colors.identity, opacity: 0.5 },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.sm },
  cta: { backgroundColor: colors.identity, borderRadius: radii.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, alignItems: 'center', alignSelf: 'stretch', marginTop: spacing.xs },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  secondary: { paddingVertical: spacing.sm },
  secondaryText: { ...typography.label, color: colors.identity, fontWeight: '700' },
  trust: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
});
