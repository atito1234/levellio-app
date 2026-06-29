/**
 * AchievementCertificate — the dark, premium "share card" for an unlocked
 * achievement: glowing badge, ACHIEVEMENT UNLOCKED kicker, title, description, 1–2
 * headline analytics stats (the proof), "Achieved by <name>", brand + date. Pure
 * visual + ref-friendly so a future EAS dev build can capture it to an image.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, typography } from '@/theme';
import type { StatLine } from '@/lib/achievements';

const NAVY = '#0E1424';
const NAVY_EDGE = '#1C2740';
const GLOW = '#3B82F6';
const SKY = '#7FB2FF';
const INK_ON_DARK = '#F4F7FF';
const MUTED_ON_DARK = '#93A4C4';

export function AchievementCertificate({
  emoji,
  title,
  description,
  headline,
  name,
  dateLabel,
}: {
  emoji: string;
  title: string;
  description: string;
  headline: StatLine[];
  name: string;
  dateLabel: string;
}) {
  const { t } = useTranslation('achievements');
  return (
    <View style={styles.card}>
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.badge}>
        <Text style={styles.badgeEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.kicker}>{t('cert.unlocked')}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>

      {headline.length > 0 && (
        <View style={styles.stats}>
          {headline.map((s, i) => (
            <View key={i} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{t(s.labelKey)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.by}>{t('cert.achievedBy', { name })}</Text>
      <Text style={styles.brand}>{t('cert.brand')}</Text>
      <Text style={styles.date}>{dateLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NAVY,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: NAVY_EDGE,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  glow: { position: 'absolute', top: 6, width: 200, height: 200, borderRadius: 200, backgroundColor: GLOW, opacity: 0.16 },
  badge: { width: 96, height: 96, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3A4A6B', backgroundColor: '#16203A' },
  badgeEmoji: { fontSize: 48 },
  kicker: { ...typography.label, color: SKY, letterSpacing: 3, fontWeight: '800', marginTop: spacing.sm },
  title: { ...typography.heading, color: INK_ON_DARK, fontWeight: '900', textAlign: 'center' },
  desc: { ...typography.body, color: MUTED_ON_DARK, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs },
  stat: { alignItems: 'center' },
  statValue: { ...typography.title, color: INK_ON_DARK, fontWeight: '900' },
  statLabel: { ...typography.caption, color: MUTED_ON_DARK, letterSpacing: 1 },
  by: { ...typography.body, color: MUTED_ON_DARK, marginTop: spacing.md },
  brand: { ...typography.label, color: SKY, fontWeight: '800', letterSpacing: 2, marginTop: spacing.sm },
  date: { ...typography.caption, color: MUTED_ON_DARK },
});
