import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import { minutesToLabel, minutesToParts, partsToMinutes, type Meridiem, type TimeParts } from '@/lib/schedule';

/**
 * Compact time-of-day picker (hour / minute / AM-PM) built on plain Pressables —
 * no native deps, Expo-Go safe. Controlled by `minutes` (since local midnight).
 * Shared by the QuestEditor and the Add-activity sheet.
 */
export function TimePicker({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const parts = minutesToParts(minutes);
  const set = (next: TimeParts) => onChange(partsToMinutes(next));
  const bumpHour = (dir: 1 | -1) => set({ ...parts, hour12: ((parts.hour12 - 1 + dir + 12) % 12) + 1 });
  const bumpMinute = (dir: 1 | -1) => set({ ...parts, minute: (parts.minute + dir * 5 + 60) % 60 });
  const setMeridiem = (meridiem: Meridiem) => set({ ...parts, meridiem });

  return (
    <View style={styles.wrap}>
      <View style={styles.picker}>
        <Stepper label="Hour" value={`${parts.hour12}`} unit="hour" onDown={() => bumpHour(-1)} onUp={() => bumpHour(1)} />
        <Text style={styles.colon}>:</Text>
        <Stepper
          label="Minute"
          value={`${parts.minute}`.padStart(2, '0')}
          unit="minute"
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
                accessibilityLabel={m === 'AM' ? 'Morning' : 'Afternoon or evening'}
                style={[styles.meridiemBtn, active && styles.meridiemBtnOn]}
              >
                <Text style={[styles.meridiemText, active && styles.meridiemTextOn]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.scheduledFor} accessibilityLiveRegion="polite">
        Scheduled for {minutesToLabel(minutes)}
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
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onUp} accessibilityRole="button" accessibilityLabel={`Increase ${unit}`} hitSlop={8} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>＋</Text>
      </Pressable>
      <Text style={styles.stepValue} accessibilityLabel={`${label} ${value}`}>
        {value}
      </Text>
      <Pressable onPress={onDown} accessibilityRole="button" accessibilityLabel={`Decrease ${unit}`} hitSlop={8} style={styles.stepBtn}>
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
