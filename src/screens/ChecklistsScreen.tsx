/**
 * Checklists: keep small lists, tick items off, and "check out" to close the day
 * with a streak. Items can be REAL activities (linked to a habit) — checking one
 * completes the habit and counts toward streak/XP/group/goal/project — or quick
 * text items. See src/lib/checklist.ts + ChecklistsContext.
 *
 * Day-aware: a list bound to a date (`date`) is only interactive ON that day —
 * future lists are read-only plans ("Opens …"), past lists are read-only history.
 * Routine (recurring, undated) lists are always today-scoped and reset daily. A
 * day-browser strip at the top filters dated lists; routine lists always show.
 */
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ConfettiBurst, PressableScale, PrimaryButton, ScreenContainer, SelectActivitySheet } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useChecklists } from '@/state/ChecklistsContext';
import { useGame } from '@/state/GameContext';
import { useProjects } from '@/state/ProjectsContext';
import { useGoals } from '@/state/GoalContext';
import { useBuckets } from '@/state/BucketsContext';
import { useCompleteActivity } from '@/state/useCompleteActivity';
import { MoveToBucketSheet } from '@/components/MoveToBucketSheet';
import { checklistDayState, checklistProgress, isItemDone, type ChecklistItem, type Checklist } from '@/lib/checklist';
import { BUCKET_COLORS, getBucketColor } from '@/lib/buckets';
import { dayKey, relativeDayLabel, shiftDayKey } from '@/lib/dates';

const accentOf = (id: Checklist['colorId']) => BUCKET_COLORS.find((b) => b.id === id) ?? BUCKET_COLORS[0]!;

// The day-browser spans a couple of days back through the next ~week-and-a-half.
const DAY_RANGE_BACK = 2;
const DAY_RANGE_FWD = 11;

export function ChecklistsScreen() {
  const { t, i18n } = useTranslation('checklists');
  const { checklists, addChecklist, removeChecklist, addItem, removeItem, toggleItem, checkOut } = useChecklists();
  const { quests, uncompleteQuest } = useGame();
  const { projectsForHabit } = useProjects();
  const { goals, goalsForHabit } = useGoals();
  const { buckets, bucketIdFor, assignActivity } = useBuckets();
  const completeActivity = useCompleteActivity();
  const [newTitle, setNewTitle] = useState('');
  const [query, setQuery] = useState('');
  const [confetti, setConfetti] = useState(0);
  // The linked item whose group the user is picking (drives MoveToBucketSheet).
  const [groupTarget, setGroupTarget] = useState<{ questId: string; label: string } | null>(null);

  const todayK = dayKey(new Date());
  const [selectedDay, setSelectedDay] = useState(todayK);

  const dayLabel = (key: string) =>
    relativeDayLabel(key, todayK, { today: t('jumpToday'), locale: i18n.language });

  const days = useMemo(
    () => Array.from({ length: DAY_RANGE_BACK + DAY_RANGE_FWD + 1 }, (_, i) => shiftDayKey(todayK, i - DAY_RANGE_BACK)),
    [todayK],
  );

  const q = query.trim().toLowerCase();
  const matchesQuery = (c: Checklist) =>
    c.title.toLowerCase().includes(q) || c.items.some((i) => i.label.toLowerCase().includes(q));

  // When searching, show all matches. Otherwise filter by the selected day:
  // routine/undated lists always show; dated lists only on their day.
  const shown = useMemo(() => {
    const base = q
      ? checklists.filter(matchesQuery)
      : checklists.filter((c) => !c.date || c.date === selectedDay);
    return [...base].sort((a, b) => {
      // Undated (routine) first, then dated ascending by their day.
      if (!a.date && !b.date) return a.order - b.order;
      if (!a.date) return -1;
      if (!b.date) return 1;
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
  }, [checklists, q, selectedDay]);

  const dayHasList = !q && checklists.some((c) => c.date === selectedDay);
  const showCreateForDay = !q && selectedDay !== todayK && !dayHasList;

  // Where a linked activity belongs — shown as a small subtitle (project > goal > group).
  const subtitleForQuest = (questId: string): string | null => {
    const proj = projectsForHabit(questId)[0];
    if (proj) return `${proj.emoji} ${proj.title}`;
    const goalId = goalsForHabit(questId)[0];
    if (goalId) {
      const g = goals.find((x) => x.id === goalId);
      if (g) return `${g.emoji} ${g.title}`;
    }
    const bId = bucketIdFor(questId);
    if (bId) {
      const b = buckets.find((x) => x.id === bId);
      if (b) return b.name;
    }
    return null;
  };

  // The group (bucket) a linked activity is filed in — drives the group pill.
  const groupForQuest = (questId: string): { name: string; accent: string; soft: string } | null => {
    const bId = bucketIdFor(questId);
    const b = bId ? buckets.find((x) => x.id === bId) : undefined;
    if (!b) return null;
    const c = getBucketColor(b.colorId);
    return { name: b.name, accent: c.accent, soft: c.soft };
  };

  // Toggling only happens on today-scoped lists (others render read-only). Flip
  // the local tick for every item; a linked item ALSO completes/uncompletes the
  // real habit (needs the navigation-bound useCompleteActivity, hence here).
  const handleToggle = async (checklist: Checklist, itemId: string) => {
    if (checklistDayState(checklist, todayK) !== 'today') return;
    const item = checklist.items.find((i) => i.id === itemId);
    const wasOn = item ? isItemDone(item, checklist.checkedItemIds) : false;
    await toggleItem(checklist.id, itemId);
    if (item?.questId) {
      const quest = quests.find((qq) => qq.id === item.questId);
      if (!quest) return;
      if (wasOn) {
        const doneToday = quest.completed && quest.lastCompletedDate === todayK;
        if (doneToday) await uncompleteQuest(quest.id); // un-tick → undo today's completion
      } else {
        await completeActivity(quest, { method: 'manual', durationSec: 0 });
      }
    }
  };

  const create = async () => {
    if (!newTitle.trim()) return;
    await addChecklist({ title: newTitle, recurring: true });
    setNewTitle('');
  };

  const createForDay = async () => {
    await addChecklist({ title: dayLabel(selectedDay), recurring: false, date: selectedDay });
  };

  const onCheckOut = async (c: Checklist) => {
    const res = await checkOut(c.id);
    if (res && !res.alreadyDoneToday) setConfetti((n) => n + 1);
  };

  const confirmDelete = (c: Checklist) =>
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => void removeChecklist(c.id) },
    ]);

  return (
    <ScreenContainer>
      {confetti > 0 && <ConfettiBurst key={confetti} />}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>

        {/* Day-browser strip — filters dated lists; routine lists always show. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStrip}
          keyboardShouldPersistTaps="handled"
        >
          {days.map((key) => {
            const on = key === selectedDay;
            const isToday = key === todayK;
            const [, , dd] = key.split('-');
            const wd = weekdayShort(key, i18n.language);
            return (
              <Pressable
                key={key}
                onPress={() => setSelectedDay(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.dayChip, on && styles.dayChipOn, isToday && !on && styles.dayChipToday]}
              >
                <Text style={[styles.dayChipWd, on && styles.dayChipTextOn]}>{wd}</Text>
                <Text style={[styles.dayChipNum, on && styles.dayChipTextOn]}>{dd}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.createRow}>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder={t('namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.createInput}
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={() => void create()}
          />
          <PrimaryButton label={t('create')} variant="action" onPress={() => void create()} disabled={!newTitle.trim()} />
        </View>

        {checklists.length > 2 && (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchChecklists')}
            placeholderTextColor={colors.textMuted}
            style={styles.createInput}
          />
        )}

        {checklists.length === 0 && <Text style={styles.empty}>{t('empty')}</Text>}

        {showCreateForDay && (
          <View style={styles.dayPlanRow}>
            <Text style={styles.dayPlanNote}>{t('noListForDay', { day: dayLabel(selectedDay) })}</Text>
            <PrimaryButton label={t('newForDay', { day: dayLabel(selectedDay) })} variant="action" onPress={() => void createForDay()} />
          </View>
        )}

        {shown.map((c) => (
          <ChecklistCard
            key={c.id}
            checklist={c}
            dayState={checklistDayState(c, todayK)}
            dateLabel={c.date ? dayLabel(c.date) : null}
            subtitleFor={subtitleForQuest}
            groupFor={groupForQuest}
            onMoveGroup={(item) => item.questId && setGroupTarget({ questId: item.questId, label: item.label })}
            t={t}
            onToggle={(itemId) => void handleToggle(c, itemId)}
            onAddText={(label) => void addItem(c.id, label)}
            onAddQuest={(questId, label) => void addItem(c.id, label, questId)}
            onRemoveItem={(itemId) => void removeItem(c.id, itemId)}
            onCheckOut={() => void onCheckOut(c)}
            onDelete={() => confirmDelete(c)}
          />
        ))}
      </ScrollView>

      <MoveToBucketSheet
        visible={groupTarget !== null}
        activityTitle={groupTarget?.label ?? ''}
        buckets={buckets}
        {...(groupTarget && bucketIdFor(groupTarget.questId) ? { currentBucketId: bucketIdFor(groupTarget.questId) } : {})}
        onSelect={(bucketId) => {
          if (groupTarget) void assignActivity(groupTarget.questId, bucketId);
          setGroupTarget(null);
        }}
        onClose={() => setGroupTarget(null)}
      />
    </ScreenContainer>
  );
}

function ChecklistCard({
  checklist,
  dayState,
  dateLabel,
  subtitleFor,
  groupFor,
  onMoveGroup,
  t,
  onToggle,
  onAddText,
  onAddQuest,
  onRemoveItem,
  onCheckOut,
  onDelete,
}: {
  checklist: Checklist;
  dayState: 'today' | 'past' | 'future';
  dateLabel: string | null;
  subtitleFor: (questId: string) => string | null;
  groupFor: (questId: string) => { name: string; accent: string; soft: string } | null;
  onMoveGroup: (item: ChecklistItem) => void;
  t: ReturnType<typeof useTranslation>['t'];
  onToggle: (itemId: string) => void;
  onAddText: (label: string) => void;
  onAddQuest: (questId: string, label: string) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckOut: () => void;
  onDelete: () => void;
}) {
  const [itemDraft, setItemDraft] = useState('');
  const [picking, setPicking] = useState(false);
  const accent = accentOf(checklist.colorId);
  const prog = checklistProgress(checklist);
  const checkedToday = checklist.lastCheckoutDate === dayKey(new Date());
  const interactive = dayState === 'today';

  const addDraft = () => {
    if (!itemDraft.trim()) return;
    onAddText(itemDraft);
    setItemDraft('');
  };

  return (
    <View style={[styles.card, { borderColor: accent.accent }, !interactive && styles.cardDim]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardEmoji}>{checklist.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{checklist.title}</Text>
          {/* Dated lists show their day; routine lists show a "Daily" tag. */}
          {dateLabel ? (
            <Text style={styles.cardDate}>📅 {dateLabel}</Text>
          ) : (
            <Text style={styles.cardTag}>{t('daily')}</Text>
          )}
          <Text style={styles.cardMeta}>
            {t('progress', { done: prog.done, total: prog.total })}
            {checklist.checkoutStreak > 0 ? ` · 🔥 ${t('streak', { count: checklist.checkoutStreak })}` : ''}
          </Text>
        </View>
        <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={t('delete')} hitSlop={8}>
          <Text style={styles.delete}>✕</Text>
        </Pressable>
      </View>

      {/* Read-only banner for non-today lists. */}
      {dayState === 'future' && <Text style={styles.banner}>{t('opensOn', { date: dateLabel })}</Text>}
      {dayState === 'past' && <Text style={styles.banner}>{t('readOnlyPast')}</Text>}

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${prog.pct}%`, backgroundColor: accent.accent }]} />
      </View>

      {checklist.items.map((item) => {
        const on = isItemDone(item, checklist.checkedItemIds);
        const linked = Boolean(item.questId);
        const subtitle = item.questId ? subtitleFor(item.questId) : null;
        const group = item.questId ? groupFor(item.questId) : null;
        return (
          <View key={item.id} style={styles.itemRow}>
            {/* Plain Pressable carries the row flex (fixes the prior blank-label
                collapse where flex landed on PressableScale's inner view). */}
            <Pressable
              onPress={() => interactive && onToggle(item.id)}
              disabled={!interactive}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: !interactive }}
              style={styles.itemTap}
            >
              <View style={[styles.checkbox, on && { backgroundColor: accent.accent, borderColor: accent.accent }]}>
                {on && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemLabel, on && styles.itemLabelDone]} numberOfLines={2}>{item.label}</Text>
                {subtitle ? <Text style={styles.itemSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
                {/* Linked items get a tappable group pill to (re)categorize them. */}
                {linked && interactive && (
                  <Pressable
                    onPress={() => onMoveGroup(item)}
                    accessibilityRole="button"
                    accessibilityLabel={t('group')}
                    style={[
                      styles.groupPill,
                      group
                        ? { backgroundColor: group.soft, borderColor: group.accent }
                        : styles.groupPillEmpty,
                    ]}
                  >
                    <Text style={[styles.groupPillText, { color: group ? group.accent : colors.textMuted }]} numberOfLines={1}>
                      {group ? `🗂️ ${group.name}` : t('addGroup')}
                    </Text>
                  </Pressable>
                )}
              </View>
              {linked && <Text style={styles.linkTag}>{t('linked')}</Text>}
            </Pressable>
            {interactive && (
              <Pressable onPress={() => onRemoveItem(item.id)} accessibilityRole="button" accessibilityLabel={t('delete')} hitSlop={8}>
                <Text style={styles.itemRemove}>✕</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {interactive && (
        <>
          <View style={styles.addRow}>
            <TextInput
              value={itemDraft}
              onChangeText={setItemDraft}
              placeholder={t('itemPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.addInput}
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={addDraft}
            />
            <Pressable onPress={addDraft} accessibilityRole="button" accessibilityLabel={t('addItem')} hitSlop={8}>
              <Text style={[styles.addPlus, { color: accent.accent }]}>＋</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => setPicking(true)} accessibilityRole="button" style={styles.addActivityRow}>
            <Text style={[styles.addActivityText, { color: accent.accent }]}>🔗 {t('addActivity')}</Text>
          </Pressable>

          <PressableScale
            onPress={onCheckOut}
            disabled={checkedToday || prog.total === 0}
            accessibilityRole="button"
            style={[styles.checkoutBtn, { backgroundColor: checkedToday ? colors.surfaceAlt : accent.accent }]}
          >
            <Text style={[styles.checkoutText, { color: checkedToday ? colors.textMuted : '#FFFFFF' }]}>
              {checkedToday ? t('checkedOut') : prog.complete ? t('allDone') : t('checkOut')}
            </Text>
          </PressableScale>

          <SelectActivitySheet
            visible={picking}
            onClose={() => setPicking(false)}
            onPick={(quest) => {
              onAddQuest(quest.id, quest.title);
              setPicking(false);
            }}
          />
        </>
      )}
    </View>
  );
}

/** Short localized weekday (e.g. "Mon") for a YYYY-MM-DD key. */
function weekdayShort(key: string, locale: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return '';
  try {
    return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'short' });
  } catch {
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
  }
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingVertical: spacing.lg, paddingBottom: spacing.xl },
  title: { ...typography.heading, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  empty: { ...typography.body, color: colors.textSecondary, marginVertical: spacing.md },

  dayStrip: { gap: spacing.xs, paddingVertical: spacing.xs, paddingRight: spacing.sm },
  dayChip: { width: 46, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 2 },
  dayChipOn: { backgroundColor: colors.violetDeep, borderColor: colors.violetDeep },
  dayChipToday: { borderColor: colors.violetDeep },
  dayChipWd: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  dayChipNum: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  dayChipTextOn: { color: '#FFFFFF' },

  dayPlanRow: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  dayPlanNote: { ...typography.body, color: colors.textSecondary },

  createRow: { gap: spacing.sm, marginBottom: spacing.sm },
  createInput: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },

  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1.5 },
  cardDim: { opacity: 0.85 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardEmoji: { fontSize: 26 },
  cardTitle: { ...typography.title, color: colors.textPrimary },
  cardDate: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  cardTag: { ...typography.caption, color: colors.violetDeep, fontWeight: '800', marginTop: 1 },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  banner: { ...typography.caption, color: colors.textSecondary, backgroundColor: colors.surfaceAlt, borderRadius: radii.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  delete: { ...typography.title, color: colors.textMuted },

  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  itemTextCol: { flexShrink: 1 },
  itemLabel: { ...typography.body, color: colors.textPrimary },
  itemLabelDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  itemSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  groupPill: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: 4, maxWidth: 180 },
  groupPillEmpty: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderStyle: 'dashed' },
  groupPillText: { ...typography.caption, fontWeight: '800', fontSize: 11 },
  linkTag: { ...typography.caption, color: colors.violetDeep, fontWeight: '800' },
  itemRemove: { ...typography.body, color: colors.textMuted },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addInput: { ...typography.body, flex: 1, color: colors.textPrimary, backgroundColor: colors.surfaceAlt, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addPlus: { fontSize: 26, fontWeight: '900' },
  addActivityRow: { paddingVertical: spacing.xs },
  addActivityText: { ...typography.label, fontWeight: '800' },

  checkoutBtn: { borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  checkoutText: { ...typography.label, fontWeight: '800' },
});
