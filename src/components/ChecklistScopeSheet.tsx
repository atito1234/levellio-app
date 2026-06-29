/**
 * ChecklistScopeSheet — "Which days?" chooser shown when creating a checklist, so
 * a one-day list never silently becomes a daily one. Offers one-off, weekly
 * recurrence (every day / weekdays / weekends / pick days) and finite ranges
 * (rest of this week / this month). Mirrors the MoveToBucketSheet bottom-sheet.
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, spacing, typography } from '@/theme';
import type { ChecklistScopeKind } from '@/lib/checklist';

interface Props {
  visible: boolean;
  /** Relative label for the selected day (e.g. "Today" / "Tomorrow" / "Tue, Jul 30"). */
  selectedDayLabel: string;
  /** BCP-47 locale for weekday initials. */
  locale: string;
  onSelect: (kind: ChecklistScopeKind, pickedDays?: number[]) => void;
  onClose: () => void;
}

/** Narrow weekday initials, Sunday-first, for the picker. */
function weekdayInitials(locale: string): string[] {
  // 2024-01-07 is a Sunday — walk a known week.
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 7 + i);
    try {
      return d.toLocaleDateString(locale, { weekday: 'narrow' });
    } catch {
      return d.toLocaleDateString('en-US', { weekday: 'narrow' });
    }
  });
}

export function ChecklistScopeSheet({ visible, selectedDayLabel, locale, onSelect, onClose }: Props) {
  const { t } = useTranslation('checklists');
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const initials = weekdayInitials(locale);

  const presets: { kind: ChecklistScopeKind; label: string; sub?: string }[] = [
    { kind: 'day', label: t('scope.day'), sub: selectedDayLabel },
    { kind: 'everyday', label: t('scope.everyday') },
    { kind: 'weekdays', label: t('scope.weekdays') },
    { kind: 'weekends', label: t('scope.weekends') },
    { kind: 'restOfWeek', label: t('scope.restOfWeek') },
    { kind: 'month', label: t('scope.month') },
  ];

  const togglePick = (d: number) =>
    setPicked((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const reset = () => {
    setPicking(false);
    setPicked([]);
  };
  const close = () => {
    reset();
    onClose();
  };
  const choose = (kind: ChecklistScopeKind) => {
    reset();
    onSelect(kind);
  };
  const confirmPick = () => {
    if (picked.length === 0) return;
    const days = picked;
    reset();
    onSelect('pick', days);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel={t('scope.closeA11y')} onPress={close}>
        <Pressable style={styles.sheet} accessible={false} onPress={() => {}}>
          <Text style={styles.title} accessibilityRole="header">
            {t('scope.title')}
          </Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {presets.map((p) => (
              <Pressable
                key={p.kind}
                onPress={() => choose(p.kind)}
                accessibilityRole="button"
                accessibilityLabel={p.sub ? `${p.label} — ${p.sub}` : p.label}
                style={styles.row}
              >
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {p.label}
                </Text>
                {p.sub ? <Text style={styles.rowSub} numberOfLines={1}>{p.sub}</Text> : null}
              </Pressable>
            ))}

            {/* Pick specific weekdays. */}
            {!picking ? (
              <Pressable onPress={() => setPicking(true)} accessibilityRole="button" style={styles.row}>
                <Text style={styles.rowLabel}>{t('scope.pick')}</Text>
              </Pressable>
            ) : (
              <View style={styles.pickWrap}>
                <Text style={styles.rowLabel}>{t('scope.pick')}</Text>
                <View style={styles.pickRow}>
                  {initials.map((ini, d) => {
                    const on = picked.includes(d);
                    return (
                      <Pressable
                        key={d}
                        onPress={() => togglePick(d)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.dayDot, on && styles.dayDotOn]}
                      >
                        <Text style={[styles.dayDotText, on && styles.dayDotTextOn]}>{ini}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={confirmPick}
                  disabled={picked.length === 0}
                  accessibilityRole="button"
                  style={[styles.confirm, picked.length === 0 && styles.confirmOff]}
                >
                  <Text style={styles.confirmText}>{t('scope.usePicked')}</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
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
    maxHeight: '80%',
  },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  list: { flexGrow: 0 },
  listContent: { gap: spacing.xs, paddingBottom: spacing.md },
  row: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceAlt },
  rowLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  pickWrap: { gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceAlt },
  pickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDot: { width: 38, height: 38, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dayDotOn: { backgroundColor: colors.violetDeep, borderColor: colors.violetDeep },
  dayDotText: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  dayDotTextOn: { color: '#FFFFFF' },
  confirm: { borderRadius: radii.pill, backgroundColor: colors.identity, paddingVertical: spacing.md, alignItems: 'center' },
  confirmOff: { opacity: 0.5 },
  confirmText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
