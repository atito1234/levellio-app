import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, typography } from '@/theme';
import type { RatingValue } from '@/types';

const INK = '#1F2937';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const GOLD = '#FFB23E';

const SCALE: readonly RatingValue[] = [1, 2, 3, 4, 5];

interface Props {
  visible: boolean;
  /** The habit being rated, shown for context. */
  title: string;
  onSelect: (rating: RatingValue) => void;
  onSkip: () => void;
}

/**
 * A quick, optional "how did it go?" 1–5 self-report shown right after a habit
 * is completed. Metric-agnostic — it captures how the rep *felt*, which works
 * for any habit, even ones we have no curated metric for.
 */
export function RatingPrompt({ visible, title, onSelect, onSkip }: Props) {
  const { t } = useTranslation('rating');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>{t('kicker')}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.stars}>
            {SCALE.map((n) => (
              <Pressable
                key={n}
                onPress={() => onSelect(n)}
                accessibilityRole="button"
                accessibilityLabel={t('starA11y', { n, hint: t(`hint.${n}`) })}
                hitSlop={6}
                style={styles.starBtn}
              >
                <Text style={styles.star}>★</Text>
                <Text style={styles.starNum}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.scaleHint}>{t('scaleHint')}</Text>
          <Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel={t('skipA11y')} hitSlop={8}>
            <Text style={styles.skip}>{t('skip')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,30,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: CARD, borderRadius: 24, padding: spacing.xl, gap: spacing.md, alignItems: 'center', width: '100%', maxWidth: 360 },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  title: { ...typography.title, color: INK, fontWeight: '800', textAlign: 'center' },
  stars: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  starBtn: { alignItems: 'center', paddingHorizontal: spacing.xs, gap: 2 },
  star: { fontSize: 34, color: GOLD },
  starNum: { ...typography.caption, color: MUTED },
  scaleHint: { ...typography.caption, color: MUTED },
  skip: { ...typography.label, color: VIOLET, fontWeight: '700', marginTop: spacing.xs },
});
