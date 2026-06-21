import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '@/theme';
import { minutesToLabel, minutesToParts, partsToMinutes, type Meridiem, type TimeParts } from '@/lib/schedule';

/**
 * Compact time-of-day picker (hour / minute / AM-PM) built on plain Pressables —
 * no native deps, Expo-Go safe. Controlled by `minutes` (since local midnight).
 * Shared by the QuestEditor and the Add-activity sheet.
 */
export function TimePicker({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const { t, i18n } = useTranslation('timePicker');
  const parts = minutesToParts(minutes);
  const set = (next: TimeParts) => onChange(partsToMinutes(next));
  const bumpHour = (dir: 1 | -1) => set({ ...parts, hour12: ((parts.hour12 - 1 + dir + 12) % 12) + 1 });
  const bumpMinute = (dir: 1 | -1) => set({ ...parts, minute: (parts.minute + dir * 5 + 60) % 60 });
  const setMeridiem = (meridiem: Meridiem) => set({ ...parts, meridiem });

  return (
    <View style={styles.wrap}>
      <View style={styles.picker}>
        <Stepper label={t('hour')} value={`${parts.hour12}`} unit={t('unitHour')} onDown={() => bumpHour(-1)} onUp={() => bumpHour(1)} />
        <Text style={styles.colon}>:</Text>
        <Stepper
          label={t('minute')}
          value={`${parts.minute}`.padStart(2, '0')}
          unit={t('unitMinute')}
          onDown={() => bumpMinute(-1)}
          onUp={() => bumpMinute(1)}
        />
        <View style={styles.meridiemCol}>
          {(['AM', 'PM'] as const).map((m) => {
            const active = parts.meridiem === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMeridiem(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={m === 'AM' ? t('amA11y') : t('pmA11y')}
                style={[styles.meridiemBtn, active && styles.meridiemBtnOn]}
              >
                <Text style={[styles.meridiemText, active && styles.meridiemTextOn]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.scheduledFor} accessibilityLiveRegion="polite">
        {t('scheduledFor', { time: minutesToLabel(minutes, i18n.language) })}
      </Text>
    </View>
  );
}

/** Compact −/+ stepper for one time field. */
function Stepper({
  label,
  value,
  unit,
  onDown,
  onUp,
}: {
  label: string;
  value: string;
  unit: string;
  onDown: () => void;
  onUp: () => void;
}) {
  const { t } = useTranslation('timePicker');
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onUp} accessibilityRole="button" accessibilityLabel={t('increaseA11y', { unit })} hitSlop={8} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>＋</Text>
      </Pressable>
      <Text style={styles.stepValue} accessibilityLabel={t('valueA11y', { label, value })}>
        {value}
      </Text>
      <Pressable onPress={onDown} accessibilityRole="button" accessibilityLabel={t('decreaseA11y', { unit })} hitSlop={8} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>－</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  colon: { ...typography.heading, color: colors.textPrimary, marginHorizontal: spacing.xs },
  stepper: { alignItems: 'center', gap: spacing.xs },
  stepBtn: {
    width: 44,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { ...typography.title, color: colors.identity, fontWeight: '800' },
  stepValue: { ...typography.heading, color: colors.textPrimary, minWidth: 52, textAlign: 'center' },
  meridiemCol: { gap: spacing.xs, marginLeft: spacing.sm },
  meridiemBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  meridiemBtnOn: { backgroundColor: colors.identity, borderColor: colors.identity },
  meridiemText: { ...typography.label, color: colors.textSecondary, fontWeight: '700' },
  meridiemTextOn: { color: '#FFFFFF' },
  scheduledFor: { ...typography.body, color: colors.identity, fontWeight: '700', textAlign: 'center' },
});
