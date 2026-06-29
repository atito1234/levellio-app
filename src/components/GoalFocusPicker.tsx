import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, spacing, typography } from '@/theme';
import { goalColor, type Goal } from '@/lib/goal';

interface Props {
  visible: boolean;
  goals: Goal[];
  selectedId: string | null;
  /** null clears the focus (Today = all planned habits). */
  onSelect: (goalId: string | null) => void;
  onClose: () => void;
}

/**
 * Calm bottom sheet to point the Today ring at one goal — or "All habits" to clear
 * it. Lives off the Home (opened from the More hub) so Home stays a one-glance
 * "do today" surface. Mirrors MoveToBucketSheet's accessible row pattern.
 */
export function GoalFocusPicker({ visible, goals, selectedId, onSelect, onClose }: Props) {
  const { t } = useTranslation('dashboard');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel={t('focusPicker.closeA11y')}
        onPress={onClose}
      >
        <Pressable style={styles.sheet} accessible={false} onPress={() => {}}>
          <Text style={styles.title} accessibilityRole="header">
            {t('focusPicker.title')}
          </Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            <Row
              label={t('focusPicker.allHabits')}
              emoji="🗓️"
              tint={colors.violetDeep}
              selected={!selectedId}
              onPress={() => onSelect(null)}
            />
            {goals.map((g) => {
              const c = goalColor(g);
              return (
                <Row
                  key={g.id}
                  label={g.title}
                  emoji={g.emoji}
                  tint={c.accent}
                  selected={g.id === selectedId}
                  onPress={() => onSelect(g.id)}
                />
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  label,
  emoji,
  tint,
  selected,
  onPress,
}: {
  label: string;
  emoji: string;
  tint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.row, selected && { backgroundColor: colors.violetSoft }]}
    >
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <Text style={[styles.rowLabel, selected && { color: colors.violetDeep, fontWeight: '700' }]} numberOfLines={1}>
        {label}
      </Text>
      {selected && <Text style={[styles.check, { color: tint }]} accessibilityElementsHidden>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(27,27,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '75%',
  },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  list: { flexGrow: 0 },
  listContent: { gap: spacing.xs, paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  rowEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  rowLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  check: { ...typography.title },
});
