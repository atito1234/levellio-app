import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LibraryPickerSheet, ScreenContainer, ScreenHeader, SectionLabel } from '@/components';
import { radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useGoals } from '@/state/GoalContext';
import { useBuckets } from '@/state/BucketsContext';
import { BUCKETS_ENABLED } from '@/config/features';
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
  const { t, i18n } = useTranslation('quickCapture');
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
  const [libraryOpen, setLibraryOpen] = useState(false);

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
      if (BUCKETS_ENABLED && ctxBucketId) await assignActivity(quest.id, ctxBucketId);
      for (const pid of ctxProjectIds) await linkHabit(quest.id, pid);
      if (planToday || projectScoped) await togglePlanned(today, quest.id);
    }
    navigation.goBack();
  };

  return (
    <ScreenContainer backgroundColor={BG} keyboardAvoiding>
      <ScreenHeader title={t('title')} onBack={() => navigation.goBack()} backLabel={t('close')} />

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.lead}>{t('lead')}</Text>

        <Pressable onPress={() => setLibraryOpen(true)} accessibilityRole="button" style={styles.ideasRow}>
          <Text style={styles.ideasText}>{t('quests:library.ideas')}</Text>
        </Pressable>

        {targetLabel.length > 0 && (
          <View style={styles.scopeBanner}>
            <Text style={styles.scopeText} numberOfLines={2}>{t(projectScoped ? 'scopeDaily' : 'scope', { target: targetLabel })}</Text>
          </View>
        )}

        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus
          multiline
          placeholder={t('inputPlaceholder')}
          placeholderTextColor={MUTED}
          style={styles.input}
          accessibilityLabel={t('inputA11y')}
        />

        {parsed.length > 0 ? (
          <View style={styles.preview}>
            <SectionLabel>{t('heard', { count: included.length })}</SectionLabel>
            {parsed.map((p) => {
              const off = excluded.has(normalizeTitle(p.title));
              const timePart = p.scheduledTime !== undefined ? t('chipAt', { time: minutesToLabel(p.scheduledTime, i18n.language) }) : '';
              return (
                <Pressable
                  key={normalizeTitle(p.title)}
                  onPress={() => toggleExclude(p.title)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !off }}
                  accessibilityLabel={`${p.title}, ${t(`categories:${p.category}`)}${timePart}. ${off ? t('chipExcluded') : t('chipIncluded')}`}
                  style={[styles.chip, off && styles.chipOff]}
                >
                  <Text style={styles.chipIcon}>{CATEGORY_META[p.category].icon}</Text>
                  <View style={styles.chipMain}>
                    <Text style={[styles.chipTitle, off && styles.chipTitleOff]} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={styles.chipMeta}>
                      {t(`categories:${p.category}`)}
                      {p.scheduledTime !== undefined ? ` · ⏰ ${minutesToLabel(p.scheduledTime, i18n.language)}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.chipMark, off && styles.chipMarkOff]}>{off ? '+' : '✓'}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : text.trim().length > 0 ? (
          <Text style={styles.hint}>{t('noMatch')}</Text>
        ) : null}

        <View style={styles.planRow}>
          <Text style={styles.planLabel}>{t('addToToday')}</Text>
          <Switch
            value={planToday}
            onValueChange={setPlanToday}
            trackColor={{ true: TEAL, false: TRACK }}
            accessibilityLabel={t('addToTodayA11y')}
          />
        </View>
      </ScrollView>

      <Pressable
        onPress={() => void addAll()}
        disabled={included.length === 0 || saving}
        accessibilityRole="button"
        accessibilityLabel={included.length === 0 ? t('addEmpty') : t('add', { count: included.length })}
        style={[styles.cta, (included.length === 0 || saving) && styles.ctaOff]}
      >
        <Text style={styles.ctaText}>
          {included.length === 0 ? t('addEmpty') : t('add', { count: included.length })}
        </Text>
      </Pressable>

      <LibraryPickerSheet
        visible={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        defaultGoalId={route.params?.goalId ?? null}
      />
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
  ideasRow: { alignSelf: 'flex-start' },
  ideasText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  scopeBanner: { backgroundColor: VIOLET_SOFT, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  scopeText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  input: {
    ...typography.body,
    color: INK,
    backgroundColor: CARD,
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 96,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: TRACK,
  },
  hint: { ...typography.caption, color: MUTED },

  preview: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: VIOLET_SOFT },
  chipOff: { opacity: 0.5, borderColor: TRACK },
  chipIcon: { fontSize: 20 },
  chipMain: { flex: 1, gap: 2 },
  chipTitle: { ...typography.body, color: INK, fontWeight: '700' },
  chipTitleOff: { textDecorationLine: 'line-through' },
  chipMeta: { ...typography.caption, color: MUTED },
  chipMark: { ...typography.label, color: VIOLET, fontWeight: '800', width: 22, textAlign: 'center' },
  chipMarkOff: { color: MUTED },

  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  planLabel: { ...typography.body, color: INK, fontWeight: '600' },

  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
