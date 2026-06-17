import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useProjects } from '@/state/ProjectsContext';
import { PROJECT_COLOR_IDS, validateProjectDraft, type ProjectSuggestedHabit } from '@/lib/projects';
import { getBucketColor, type BucketColorId } from '@/lib/buckets';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import type { QuestCategory } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectEditor'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

const EMOJI_CHOICES = ['🎯', '🌱', '💧', '♻️', '🦟', '🎒', '🤝', '❤️', '🏥', '🌍', '🏫', '🍎'];

export function ProjectEditorScreen({ navigation }: Props) {
  const { createProject } = useProjects();

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [colorId, setColorId] = useState<BucketColorId>('teal');
  const [region, setRegion] = useState('');
  const [summary, setSummary] = useState('');
  const [unit, setUnit] = useState('');
  const [goalText, setGoalText] = useState('');
  const [reward, setReward] = useState('');
  const [habits, setHabits] = useState<ProjectSuggestedHabit[]>([]);
  const [saving, setSaving] = useState(false);

  // suggested-habit draft
  const [hTitle, setHTitle] = useState('');
  const [hValue, setHValue] = useState('1');
  const [hCat, setHCat] = useState<QuestCategory>('health');

  const weeklyGoal = parseInt(goalText, 10) || 0;
  const canSave = validateProjectDraft({ title, unit, weeklyGoal }).valid && !saving;

  const addHabit = () => {
    const t = hTitle.trim();
    if (t.length === 0) return;
    setHabits((prev) => [...prev, { title: t, category: hCat, contribution: Math.max(1, parseInt(hValue, 10) || 1) }]);
    setHTitle('');
    setHValue('1');
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const project = await createProject({
      title,
      emoji,
      colorId,
      region,
      summary,
      unit,
      weeklyGoal,
      reward,
      suggestedHabits: habits,
    });
    if (project) navigation.replace('ProjectDetail', { projectId: project.id });
    else {
      setSaving(false);
      navigation.goBack();
    }
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          New project
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>Rally people around a shared, real-world goal. Invite others once it’s created.</Text>

        <TextInput value={title} onChangeText={setTitle} placeholder="Project name" placeholderTextColor={MUTED} style={styles.input} maxLength={60} accessibilityLabel="Project name" />
        <TextInput value={region} onChangeText={setRegion} placeholder="Where (e.g. Fort-Liberté, Haiti)" placeholderTextColor={MUTED} style={styles.input} maxLength={60} accessibilityLabel="Region" />
        <TextInput value={summary} onChangeText={setSummary} placeholder="What are you working toward and why?" placeholderTextColor={MUTED} style={[styles.input, styles.multiline]} multiline maxLength={240} accessibilityLabel="Summary" />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Counting</Text>
            <TextInput value={unit} onChangeText={setUnit} placeholder="trees planted" placeholderTextColor={MUTED} style={styles.input} maxLength={40} accessibilityLabel="Unit being counted" />
          </View>
          <View style={{ width: 110 }}>
            <Text style={styles.fieldLabel}>Weekly goal</Text>
            <TextInput value={goalText} onChangeText={setGoalText} placeholder="100" placeholderTextColor={MUTED} style={styles.input} keyboardType="number-pad" maxLength={6} accessibilityLabel="Weekly goal" />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Reward when the goal is met</Text>
        <TextInput value={reward} onChangeText={setReward} placeholder="e.g. Seeds + tools for the garden" placeholderTextColor={MUTED} style={styles.input} maxLength={80} accessibilityLabel="Reward" />

        <Text style={styles.fieldLabel}>Icon</Text>
        <View style={styles.wrap}>
          {EMOJI_CHOICES.map((e) => (
            <Pressable key={e} onPress={() => setEmoji(e)} accessibilityRole="button" accessibilityState={{ selected: emoji === e }} style={[styles.emojiCell, emoji === e && styles.emojiCellOn]}>
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.wrap}>
          {PROJECT_COLOR_IDS.map((c) => (
            <Pressable key={c} onPress={() => setColorId(c)} accessibilityRole="button" accessibilityState={{ selected: colorId === c }} accessibilityLabel={`${c} color`} style={[styles.swatch, { backgroundColor: getBucketColor(c).accent }, colorId === c && styles.swatchOn]} />
          ))}
        </View>

        <Text style={styles.fieldLabel}>Suggested habits (optional)</Text>
        {habits.map((h, i) => (
          <View key={`${h.title}-${i}`} style={styles.habitRow}>
            <Text style={styles.habitText} numberOfLines={1}>
              {CATEGORY_META[h.category].icon} {h.title} · +{h.contribution} {unit || 'units'}
            </Text>
            <Pressable onPress={() => setHabits((prev) => prev.filter((_, idx) => idx !== i))} accessibilityRole="button" accessibilityLabel={`Remove ${h.title}`} hitSlop={8}>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.habitAdder}>
          <TextInput value={hTitle} onChangeText={setHTitle} placeholder="Habit (e.g. Plant 5 seedlings)" placeholderTextColor={MUTED} style={[styles.input, { flex: 1 }]} maxLength={60} accessibilityLabel="Suggested habit title" />
          <TextInput value={hValue} onChangeText={setHValue} style={[styles.input, { width: 56, textAlign: 'center' }]} keyboardType="number-pad" maxLength={4} accessibilityLabel="Units per completion" />
        </View>
        <View style={styles.wrap}>
          {CATEGORY_ORDER.map((c) => (
            <Pressable key={c} onPress={() => setHCat(c)} accessibilityRole="button" accessibilityState={{ selected: hCat === c }} style={[styles.chip, hCat === c && styles.chipOn]}>
              <Text style={[styles.chipText, hCat === c && styles.chipTextOn]}>{CATEGORY_META[c].icon} {CATEGORY_META[c].label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={addHabit} accessibilityRole="button" accessibilityLabel="Add suggested habit" style={styles.addHabit}>
          <Text style={styles.addHabitText}>+ Add habit</Text>
        </Pressable>

        <Pressable onPress={() => void save()} disabled={!canSave} accessibilityRole="button" accessibilityLabel="Create project" style={[styles.cta, !canSave && styles.ctaOff]}>
          <Text style={styles.ctaText}>Create project</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  title: { ...typography.heading, color: INK },
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  lead: { ...typography.body, color: MUTED, marginBottom: spacing.xs },
  fieldLabel: { ...typography.label, color: MUTED, marginTop: spacing.xs },
  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: TRACK },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emojiCell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: TRACK },
  emojiCellOn: { borderColor: VIOLET, backgroundColor: VIOLET_SOFT },
  emojiText: { fontSize: 22 },
  swatch: { width: 36, height: 36, borderRadius: 999, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: INK },
  habitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  habitText: { ...typography.label, color: INK, flex: 1 },
  remove: { ...typography.label, color: MUTED, fontSize: 16 },
  habitAdder: { flexDirection: 'row', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: TRACK },
  chipOn: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET },
  chipText: { ...typography.caption, color: MUTED, fontWeight: '600' },
  chipTextOn: { color: VIOLET, fontWeight: '700' },
  addHabit: { alignItems: 'center', paddingVertical: spacing.sm, backgroundColor: VIOLET_SOFT, borderRadius: 999 },
  addHabitText: { ...typography.label, color: VIOLET, fontWeight: '700' },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
