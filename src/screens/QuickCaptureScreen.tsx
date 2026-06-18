import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useGoals } from '@/state/GoalContext';
import { useBuckets } from '@/state/BucketsContext';
import { useProjects } from '@/state/ProjectsContext';
import { parseCapture } from '@/lib/captureParse';
import { normalizeTitle } from '@/lib/questForm';
import { CATEGORY_META } from '@/lib/categories';
import { minutesToLabel } from '@/lib/schedule';
import { dayKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickCapture'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

export function QuickCaptureScreen({ route, navigation }: Props) {
  const { addQuest } = useGame();
  const { getPlan, togglePlanned } = usePlan();
  const { goals, linkGoal } = useGoals();
  const { assignActivity } = useBuckets();
  const { myProjects, linkHabit } = useProjects();

  // Context carried from the quick "Add an activity" sheet.
  const ctxGoal = route.params?.goalId ? goals.find((g) => g.id === route.params!.goalId) : undefined;
  const ctxBucketId = route.params?.bucketId;
  const ctxProjectIds = route.params?.projectIds ?? [];
  const projectScoped = ctxProjectIds.length > 0 || ctxGoal?.kind === 'project';
  // A friendly summary of where these will land.
  const targetLabel = [
    ctxGoal?.title,
    ...ctxProjectIds.map((id) => myProjects.find((p) => p.id === id)?.title).filter(Boolean),
  ].filter(Boolean).join(', ');

  const [text, setText] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [planToday, setPlanToday] = useState(true);
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseCapture(text), [text]);
  const included = parsed.filter((p) => !excluded.has(normalizeTitle(p.title)));

  const toggleExclude = (title: string) => {
    const key = normalizeTitle(title);
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const addAll = async () => {
    if (included.length === 0 || saving) return;
    setSaving(true);
    const today = dayKey(new Date());
    for (const p of included) {
      const quest = await addQuest({
        title: p.title,
        category: p.category,
        difficulty: p.difficulty,
        ...(p.scheduledTime !== undefined ? { scheduledTime: p.scheduledTime } : {}),
        // Project-scoped captures become daily habits so they power the project.
        ...(projectScoped ? { scheduledDays: [0, 1, 2, 3, 4, 5, 6] } : {}),
      });
      if (!quest) continue;
      // File each captured habit into the chosen goal / group / projects.
      if (ctxGoal) {
        await linkGoal(quest.id, ctxGoal.id);
        if (ctxGoal.kind === 'project' && ctxGoal.projectId) await linkHabit(quest.id, ctxGoal.projectId);
      }
      if (ctxBucketId) await assignActivity(quest.id, ctxBucketId);
      for (const pid of ctxProjectIds) await linkHabit(quest.id, pid);
      if (planToday || projectScoped) await togglePlanned(today, quest.id);
    }
    navigation.goBack();
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Quick add
        </Text>
        <View style={styles.chevronSpacer} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.lead}>Type it, or tap the 🎤 on your keyboard and just say it.</Text>

        {targetLabel.length > 0 && (
          <View style={styles.scopeBanner}>
            <Text style={styles.scopeText} numberOfLines={2}>🎯 Adding to {targetLabel}{projectScoped ? ' — as daily habits' : ''}</Text>
          </View>
        )}

        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus
          multiline
          placeholder="e.g. walk 20 min after lunch, drink water, no soda at 7pm"
          placeholderTextColor={MUTED}
          style={styles.input}
          accessibilityLabel="Capture your habits"
        />

        {parsed.length > 0 ? (
          <View style={styles.preview}>
            <Text style={styles.sectionLabel}>I HEARD {included.length} HABIT{included.length === 1 ? '' : 'S'}</Text>
            {parsed.map((p) => {
              const off = excluded.has(normalizeTitle(p.title));
              return (
                <Pressable
                  key={normalizeTitle(p.title)}
                  onPress={() => toggleExclude(p.title)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !off }}
                  accessibilityLabel={`${p.title}, ${CATEGORY_META[p.category].label}${p.scheduledTime !== undefined ? `, at ${minutesToLabel(p.scheduledTime)}` : ''}. ${off ? 'Excluded, tap to include' : 'Included, tap to exclude'}`}
                  style={[styles.chip, off && styles.chipOff]}
                >
                  <Text style={styles.chipIcon}>{CATEGORY_META[p.category].icon}</Text>
                  <View style={styles.chipMain}>
                    <Text style={[styles.chipTitle, off && styles.chipTitleOff]} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={styles.chipMeta}>
                      {CATEGORY_META[p.category].label}
                      {p.scheduledTime !== undefined ? ` · ⏰ ${minutesToLabel(p.scheduledTime)}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.chipMark, off && styles.chipMarkOff]}>{off ? '+' : '✓'}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : text.trim().length > 0 ? (
          <Text style={styles.hint}>Hmm, I couldn’t pick out a habit yet — try “walk 20 min” or “drink water”.</Text>
        ) : null}

        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Add to today’s plan</Text>
          <Switch
            value={planToday}
            onValueChange={setPlanToday}
            trackColor={{ true: TEAL, false: TRACK }}
            accessibilityLabel="Add these to today's plan"
          />
        </View>
      </ScrollView>

      <Pressable
        onPress={() => void addAll()}
        disabled={included.length === 0 || saving}
        accessibilityRole="button"
        accessibilityLabel={`Add ${included.length} habit${included.length === 1 ? '' : 's'}`}
        style={[styles.cta, (included.length === 0 || saving) && styles.ctaOff]}
      >
        <Text style={styles.ctaText}>
          {included.length === 0 ? 'Add habits' : `Add ${included.length} habit${included.length === 1 ? '' : 's'}`}
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  title: { ...typography.heading, color: INK },

  content: { gap: spacing.md, paddingBottom: spacing.xl },
  lead: { ...typography.body, color: MUTED },
  scopeBanner: { backgroundColor: VIOLET_SOFT, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  scopeText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  input: {
    ...typography.body,
    color: INK,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: spacing.md,
    minHeight: 96,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: TRACK,
  },
  hint: { ...typography.caption, color: MUTED },

  preview: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: VIOLET_SOFT },
  chipOff: { opacity: 0.5, borderColor: TRACK },
  chipIcon: { fontSize: 20 },
  chipMain: { flex: 1, gap: 2 },
  chipTitle: { ...typography.body, color: INK, fontWeight: '700' },
  chipTitleOff: { textDecorationLine: 'line-through' },
  chipMeta: { ...typography.caption, color: MUTED },
  chipMark: { ...typography.label, color: VIOLET, fontWeight: '800', width: 22, textAlign: 'center' },
  chipMarkOff: { color: MUTED },

  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  planLabel: { ...typography.body, color: INK, fontWeight: '600' },

  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
