import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { questIdsForScope, stripRecurrence } from '@/lib/dataReset';
import { weekdaysLabel } from '@/lib/recurrence';
import { emptyLevels } from '@/lib/compounding';
import { metadataStore } from '@/services/metadata';
import { rollupStore } from '@/services/analytics';
import { capacityStore } from '@/services/capacities';

const DANGER = '#C0202C';
const DANGER_SOFT = '#FCE3E5';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Settings "danger zone" — scoped, destructive data deletion. The scope is ALL
 * days (default) or specific weekdays; the three levels escalate from clearing
 * the schedule to deleting everything. Everything here is styled red/bold and
 * gated behind a confirm, because none of it can be undone.
 */
export function DataDangerZone() {
  const { t } = useTranslation('danger');
  const { user, quests, deleteQuests, setRecurrence } = useGame();
  const { plans, clearPlans } = usePlan();
  const [picked, setPicked] = useState<number[]>([]);
  const [done, setDone] = useState<string | null>(null);

  const uid = user?.uid ?? null;
  const scope = picked.length ? picked : undefined;
  const scopeLabel = picked.length ? weekdaysLabel([...picked].sort((a, b) => a - b)) : t('allDaysLower');

  const toggle = (d: number) => {
    setDone(null);
    setPicked((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  const confirm = (title: string, message: string, run: () => Promise<void>) =>
    Alert.alert(title, message, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await run();
          })();
        },
      },
    ]);

  const clearSchedule = () =>
    confirm(
      t('clearScheduleTitle'),
      t('clearScheduleMsg', { scope: scopeLabel }),
      async () => {
        await clearPlans(scope);
        setDone(t('scheduleCleared', { scope: scopeLabel }));
      },
    );

  const clearScheduleAndRules = () =>
    confirm(
      t('clearRulesTitle'),
      t('clearRulesMsg', { scope: scopeLabel }),
      async () => {
        await clearPlans(scope);
        await setRecurrence(stripRecurrence(quests, scope));
        setDone(t('rulesCleared', { scope: scopeLabel }));
      },
    );

  const deleteEverything = () =>
    confirm(
      t('deleteAllTitle'),
      t('deleteAllMsg', { scope: scopeLabel }),
      async () => {
        const ids = [...questIdsForScope(quests, plans, scope)];
        await clearPlans(scope);
        await deleteQuests(ids);
        if (uid) {
          if (scope === undefined) {
            await metadataStore.clear(uid);
            await rollupStore.save(uid, {});
            await capacityStore.save(uid, { levels: emptyLevels(), history: {} });
          } else {
            await metadataStore.removeActivities(uid, ids);
          }
        }
        setDone(t('deletedAll', { scope: scopeLabel }));
      },
    );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('title')}</Text>
      <Text style={styles.note}>
        {t('note')} <Text style={styles.bold}>{t('cannotUndo')}</Text>.
      </Text>

      <Text style={styles.scopeLabel}>{t('scope')}</Text>
      <View style={styles.scopeRow}>
        <Pressable
          onPress={() => {
            setDone(null);
            setPicked([]);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: picked.length === 0 }}
          style={[styles.allChip, picked.length === 0 && styles.allChipOn]}
        >
          <Text style={[styles.allChipText, picked.length === 0 && styles.allChipTextOn]}>{t('allDays')}</Text>
        </Pressable>
        {WEEKDAYS.map((d, i) => {
          const on = picked.includes(i);
          return (
            <Pressable
              key={i}
              onPress={() => toggle(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Scope ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}`}
              style={[styles.dayChip, on && styles.dayChipOn]}
            >
              <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{d}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.scopeHint}>{t('targeting', { scope: scopeLabel })}</Text>

      <DangerButton label={t('clearSchedule.label')} sub={t('clearSchedule.sub')} onPress={clearSchedule} />
      <DangerButton label={t('clearRules.label')} sub={t('clearRules.sub')} onPress={clearScheduleAndRules} />
      <DangerButton label={t('deleteAll.label')} sub={t('deleteAll.sub')} onPress={deleteEverything} />

      {done && <Text style={styles.done}>✓ {done}</Text>}
    </View>
  );
}

function DangerButton({ label, sub, onPress }: { label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.dangerBtn}>
      <View style={styles.dangerMain}>
        <Text style={styles.dangerLabel}>{label}</Text>
        <Text style={styles.dangerSub}>{sub}</Text>
      </View>
      <Text style={styles.dangerArrow}>🗑</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: DANGER_SOFT, ...shadows.sm },
  title: { ...typography.title, color: DANGER, fontWeight: '800' },
  note: { ...typography.body, color: colors.textSecondary },
  bold: { color: DANGER, fontWeight: '800' },

  scopeLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  allChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  allChipOn: { backgroundColor: DANGER, borderColor: DANGER },
  allChipText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  allChipTextOn: { color: '#FFFFFF' },
  dayChip: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  dayChipOn: { backgroundColor: DANGER, borderColor: DANGER },
  dayChipText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  dayChipTextOn: { color: '#FFFFFF' },
  scopeHint: { ...typography.caption, color: colors.textMuted },

  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderColor: DANGER, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: DANGER_SOFT },
  dangerMain: { flex: 1, gap: 2 },
  dangerLabel: { ...typography.label, color: DANGER, fontWeight: '800' },
  dangerSub: { ...typography.caption, color: DANGER },
  dangerArrow: { fontSize: 18 },

  done: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
});
