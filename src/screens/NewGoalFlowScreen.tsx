/**
 * "Become" goal creation — a playful, gamified flow (not a form):
 *   A) pick who you want to become (identity cards)
 *   B) swipe right/left to choose the activities that build it
 *   C) cast your first vote — do one right now for an instant win.
 * Reuses GOAL_TEMPLATES, HABIT_LIBRARY, addGoal/linkGoals, addLibraryHabit/addQuest,
 * togglePlanned and useCompleteActivity — no new data model.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, ScreenHeader } from '@/components';
import { SwipeDeck, type DeckItem } from '@/components/SwipeDeck';
import { spacing, typography } from '@/theme';
import { useGoals } from '@/state/GoalContext';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useCompleteActivity } from '@/state/useCompleteActivity';
import { GOAL_TEMPLATES, type GoalTemplate } from '@/data/goalTemplates';
import { HABIT_LIBRARY } from '@/data/habitLibrary';
import { getBucketColor, type BucketColorId } from '@/lib/buckets';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import type { Goal } from '@/lib/goal';
import type { Quest, QuestCategory } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NewGoal'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';
const VIOLET_SOFT = '#EDE9FE';

const EMOJI_CHOICES = ['🎯', '💪', '🥗', '❤️', '🧘', '💰', '📚', '🌱', '🏆', '✨', '😴', '🧠'];

type Step = 'identity' | 'custom' | 'deck' | 'firstVote';

export function NewGoalFlowScreen({ navigation }: Props) {
  const { t } = useTranslation(['goals', 'goalTemplates', 'categories']);
  const { addGoal, linkGoals } = useGoals();
  const { addLibraryHabit, addQuest } = useGame();
  const { togglePlanned } = usePlan();
  const completeActivity = useCompleteActivity();

  const [step, setStep] = useState<Step>('identity');
  const [template, setTemplate] = useState<GoalTemplate | null>(null);
  // Custom-goal fields (when "create your own").
  const [customTitle, setCustomTitle] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🎯');
  const [customCats, setCustomCats] = useState<QuestCategory[]>([]);

  const [kept, setKept] = useState<Set<string>>(new Set());
  const [ownTitle, setOwnTitle] = useState('');
  const [ownTitles, setOwnTitles] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ goal: Goal; quests: Quest[] } | null>(null);

  const tplTitle = (tpl: GoalTemplate) => t(`goalTemplates:${tpl.key}`, { defaultValue: tpl.title });

  // Identity in play (template or the custom draft).
  const identity = template
    ? { title: tplTitle(template), emoji: template.emoji, colorId: template.colorId as BucketColorId, categories: template.categories }
    : { title: customTitle.trim(), emoji: customEmoji, colorId: 'violet' as BucketColorId, categories: customCats };
  const accent = getBucketColor(identity.colorId).accent;

  // The deck: template's suggestions first, then library habits in its areas.
  const deckItems: DeckItem[] = useMemo(() => {
    const cats = identity.categories;
    const seen = new Set<string>();
    const out: DeckItem[] = [];
    const push = (id: string) => {
      const h = HABIT_LIBRARY.find((x) => x.id === id);
      if (!h || seen.has(h.id)) return;
      seen.add(h.id);
      out.push({ id: h.id, emoji: CATEGORY_META[h.category].icon, title: h.title, subtitle: t(`categories:${h.category}`) });
    };
    if (template) template.suggestedHabitIds.forEach(push);
    HABIT_LIBRARY.filter((h) => cats.includes(h.category)).forEach((h) => push(h.id));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, customCats.join(','), t]);

  const total = kept.size + ownTitles.length;

  const toggleCat = (c: QuestCategory) =>
    setCustomCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const addOwn = () => {
    const v = ownTitle.trim();
    if (!v) return;
    setOwnTitles((prev) => [...prev, v]);
    setOwnTitle('');
  };

  const finalize = async () => {
    if (creating) return;
    setCreating(true);
    const goal = await addGoal({ title: identity.title, emoji: identity.emoji, colorId: identity.colorId, categories: identity.categories });
    if (!goal) {
      setCreating(false);
      return;
    }
    const quests: Quest[] = [];
    for (const id of kept) {
      const habit = HABIT_LIBRARY.find((h) => h.id === id);
      if (!habit) continue;
      const q = await addLibraryHabit(habit);
      if (q) quests.push(q);
    }
    const primary = identity.categories[0] ?? 'productivity';
    for (const title of ownTitles) {
      const q = await addQuest({ title, category: primary, difficulty: 'easy' });
      if (q) quests.push(q);
    }
    if (quests.length > 0) {
      await linkGoals(quests.map((q) => q.id), goal.id);
      const today = dayKey(new Date());
      for (const q of quests) await togglePlanned(today, q.id);
    }
    setCreated({ goal, quests });
    setCreating(false);
    if (quests.length === 0) navigation.goBack();
    else setStep('firstVote');
  };

  const castVote = async (quest: Quest) => {
    await completeActivity(quest, { method: 'manual', durationSec: 0 });
    navigation.goBack(); // celebration fires via the app-root MilestoneCelebration
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScreenHeader onBack={() => navigation.goBack()} backLabel={t('back')} />

      {step === 'identity' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.h1}>{t('become.title')}</Text>
          <Text style={styles.sub}>{t('become.subtitle')}</Text>
          <View style={styles.grid}>
            {GOAL_TEMPLATES.map((tpl) => (
              <Pressable
                key={tpl.key}
                onPress={() => { setTemplate(tpl); setKept(new Set()); setOwnTitles([]); setStep('deck'); }}
                accessibilityRole="button"
                accessibilityLabel={t('become.pickA11y', { title: tplTitle(tpl) })}
                style={styles.idCard}
              >
                <Text style={styles.idEmoji}>{tpl.emoji}</Text>
                <Text style={styles.idTitle}>{tplTitle(tpl)}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => { setTemplate(null); setStep('custom'); }}
              accessibilityRole="button"
              accessibilityLabel={t('become.createOwn')}
              style={[styles.idCard, styles.idCardOwn]}
            >
              <Text style={styles.idEmoji}>✏️</Text>
              <Text style={[styles.idTitle, { color: VIOLET }]}>{t('become.createOwn')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {step === 'custom' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.h1}>{t('become.customTitle')}</Text>
          <TextInput
            value={customTitle}
            onChangeText={setCustomTitle}
            placeholder={t('become.customPlaceholder')}
            placeholderTextColor={MUTED}
            style={styles.input}
            maxLength={60}
          />
          <Text style={styles.fieldLabel}>{t('icon')}</Text>
          <View style={styles.emojiRow}>
            {EMOJI_CHOICES.map((e) => (
              <Pressable key={e} onPress={() => setCustomEmoji(e)} accessibilityRole="button" accessibilityState={{ selected: customEmoji === e }} style={[styles.emojiCell, customEmoji === e && styles.emojiCellOn]}>
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fieldLabel}>{t('lifeAreas')}</Text>
          <View style={styles.chips}>
            {CATEGORY_ORDER.map((c) => {
              const on = customCats.includes(c);
              return (
                <Pressable key={c} onPress={() => toggleCat(c)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{CATEGORY_META[c].icon} {t(`categories:${c}`)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => { setKept(new Set()); setOwnTitles([]); setStep('deck'); }}
            disabled={customTitle.trim().length === 0 || customCats.length === 0}
            accessibilityRole="button"
            style={[styles.primary, (customTitle.trim().length === 0 || customCats.length === 0) && styles.primaryOff]}
          >
            <Text style={styles.primaryText}>{t('become.next')}</Text>
          </Pressable>
        </ScrollView>
      )}

      {step === 'deck' && (
        // A fixed (non-scrolling) layout so the deck's horizontal swipe isn't
        // swallowed by a vertical ScrollView.
        <View style={[styles.content, styles.deckStep]}>
          <Text style={styles.h1}>{identity.emoji} {identity.title}</Text>
          <Text style={styles.sub}>{t('become.pickActivities')}</Text>

          <SwipeDeck
            items={deckItems}
            accent={accent}
            addWord={t('become.add')}
            skipWord={t('become.skip')}
            addA11y={t('become.addA11y')}
            skipA11y={t('become.skipA11y')}
            onDecision={(item, keep) => {
              if (keep) setKept((prev) => new Set(prev).add(item.id));
            }}
            onDone={() => { /* deck exhausted; the Continue button finishes */ }}
          />

          {/* Add your own activity to the deck's chosen set. */}
          <View style={styles.ownRow}>
            <TextInput
              value={ownTitle}
              onChangeText={setOwnTitle}
              placeholder={t('become.addOwn')}
              placeholderTextColor={MUTED}
              style={styles.ownInput}
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={addOwn}
            />
            <Pressable onPress={addOwn} accessibilityRole="button" accessibilityLabel={t('become.addOwn')} hitSlop={8}>
              <Text style={[styles.ownPlus, { color: accent }]}>＋</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => void finalize()}
            disabled={creating}
            accessibilityRole="button"
            style={[styles.primary, { backgroundColor: accent }, creating && styles.primaryOff]}
          >
            <Text style={styles.primaryText}>{t('become.continue', { count: total })}</Text>
          </Pressable>
        </View>
      )}

      {step === 'firstVote' && created && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.voteEmoji}>{created.goal.emoji}</Text>
          <Text style={styles.h1}>{t('become.firstVoteTitle')}</Text>
          <Text style={styles.sub}>{t('become.firstVoteSub', { title: created.goal.title })}</Text>
          {created.quests.length > 0 && <Text style={styles.voteHint}>{t('become.firstVoteHint')}</Text>}
          {/* Tap ANY activity to do it right now (cast your vote). */}
          <View style={styles.voteList}>
            {created.quests.map((q) => (
              <Pressable
                key={q.id}
                onPress={() => void castVote(q)}
                accessibilityRole="button"
                accessibilityLabel={t('become.firstVoteCta', { title: q.title })}
                style={[styles.voteRow, { borderColor: accent }]}
              >
                <Text style={styles.voteRowText} numberOfLines={2}>🗳️ {q.title}</Text>
                <Text style={[styles.voteRowGo, { color: accent }]}>›</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('become.later')}</Text>
          </Pressable>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },

  content: { gap: spacing.md, paddingBottom: spacing.xl },
  deckStep: { flex: 1, paddingTop: spacing.sm },
  h1: { ...typography.heading, color: INK, fontWeight: '800' },
  sub: { ...typography.body, color: MUTED },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  idCard: { width: '48%', backgroundColor: CARD, borderRadius: 20, padding: spacing.lg, gap: 6, alignItems: 'flex-start', borderWidth: 1, borderColor: TRACK },
  idCardOwn: { borderStyle: 'dashed', borderColor: VIOLET, backgroundColor: VIOLET_SOFT },
  idEmoji: { fontSize: 30 },
  idTitle: { ...typography.title, color: INK, fontWeight: '800' },

  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: TRACK },
  fieldLabel: { ...typography.label, color: MUTED, marginTop: spacing.xs },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emojiCell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: TRACK },
  emojiCellOn: { borderColor: VIOLET, backgroundColor: VIOLET_SOFT },
  emojiText: { fontSize: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  chipOn: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET },
  chipText: { ...typography.label, color: MUTED, fontWeight: '600' },
  chipTextOn: { color: VIOLET, fontWeight: '700' },

  ownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: TRACK },
  ownInput: { ...typography.body, flex: 1, color: INK, paddingVertical: spacing.sm },
  ownPlus: { fontSize: 26, fontWeight: '900' },

  primary: { borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm, backgroundColor: VIOLET },
  primaryOff: { opacity: 0.4 },
  primaryText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: spacing.md },
  secondaryText: { ...typography.label, color: MUTED, fontWeight: '700' },

  voteEmoji: { fontSize: 56, textAlign: 'center', marginTop: spacing.lg },
  voteHint: { ...typography.label, color: MUTED, fontWeight: '700', textAlign: 'center' },
  voteList: { gap: spacing.sm },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: CARD, borderRadius: 16, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1.5 },
  voteRowText: { ...typography.title, color: INK, fontWeight: '700', flex: 1 },
  voteRowGo: { fontSize: 26, fontWeight: '800' },
});
