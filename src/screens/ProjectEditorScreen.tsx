import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useProjects } from '@/state/ProjectsContext';
import { captureLocationSafely } from '@/services/sensors/deviceContext';
import { DEFAULT_GEOFENCE_KM, PROJECT_COLOR_IDS, validateProjectDraft, type ProjectSuggestedHabit } from '@/lib/projects';
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
  const { t } = useTranslation('projects');
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
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinning, setPinning] = useState(false);
  const [saving, setSaving] = useState(false);

  const capturePin = async () => {
    if (pin) {
      setPin(null);
      return;
    }
    setPinning(true);
    try {
      const sample = await captureLocationSafely(true);
      if (sample) setPin({ lat: sample.lat, lng: sample.lng });
    } finally {
      setPinning(false);
    }
  };

  // suggested-habit draft
  const [hTitle, setHTitle] = useState('');
  const [hValue, setHValue] = useState('1');
  const [hCat, setHCat] = useState<QuestCategory>('health');

  const weeklyGoal = parseInt(goalText, 10) || 0;
  const canSave = validateProjectDraft({ title, unit, weeklyGoal }).valid && !saving;

  const addHabit = () => {
    const ht = hTitle.trim();
    if (ht.length === 0) return;
    setHabits((prev) => [...prev, { title: ht, category: hCat, contribution: Math.max(1, parseInt(hValue, 10) || 1) }]);
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
      ...(pin ? { lat: pin.lat, lng: pin.lng, radiusKm: DEFAULT_GEOFENCE_KM } : {}),
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
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('editor.close')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t('editor.title')}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>{t('editor.lead')}</Text>

        <TextInput value={title} onChangeText={setTitle} placeholder={t('editor.namePlaceholder')} placeholderTextColor={MUTED} style={styles.input} maxLength={60} accessibilityLabel={t('editor.nameA11y')} />
        <TextInput value={region} onChangeText={setRegion} placeholder={t('editor.regionPlaceholder')} placeholderTextColor={MUTED} style={styles.input} maxLength={60} accessibilityLabel={t('editor.regionA11y')} />
        <TextInput value={summary} onChangeText={setSummary} placeholder={t('editor.summaryPlaceholder')} placeholderTextColor={MUTED} style={[styles.input, styles.multiline]} multiline maxLength={240} accessibilityLabel={t('editor.summaryA11y')} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>{t('editor.counting')}</Text>
            <TextInput value={unit} onChangeText={setUnit} placeholder={t('editor.unitPlaceholder')} placeholderTextColor={MUTED} style={styles.input} maxLength={40} accessibilityLabel={t('editor.unitA11y')} />
          </View>
          <View style={{ width: 110 }}>
            <Text style={styles.fieldLabel}>{t('editor.weeklyGoal')}</Text>
            <TextInput value={goalText} onChangeText={setGoalText} placeholder="100" placeholderTextColor={MUTED} style={styles.input} keyboardType="number-pad" maxLength={6} accessibilityLabel={t('editor.weeklyGoalA11y')} />
          </View>
        </View>

        <Text style={styles.fieldLabel}>{t('editor.rewardLabel')}</Text>
        <TextInput value={reward} onChangeText={setReward} placeholder={t('editor.rewardPlaceholder')} placeholderTextColor={MUTED} style={styles.input} maxLength={80} accessibilityLabel={t('editor.rewardA11y')} />

        <Text style={styles.fieldLabel}>{t('editor.locationLabel')}</Text>
        <Pressable onPress={() => void capturePin()} accessibilityRole="button" accessibilityLabel={pin ? t('editor.pinClearA11y') : t('editor.pinUseA11y')} style={[styles.pinBtn, pin && styles.pinBtnOn]}>
          <Text style={[styles.pinText, pin && styles.pinTextOn]}>
            {pin ? t('editor.pinned', { lat: pin.lat.toFixed(3), lng: pin.lng.toFixed(3) }) : pinning ? t('editor.gettingLocation') : t('editor.useLocation')}
          </Text>
        </Pressable>
        <Text style={styles.pinHint}>{t('editor.pinHint')}</Text>

        <Text style={styles.fieldLabel}>{t('editor.icon')}</Text>
        <View style={styles.wrap}>
          {EMOJI_CHOICES.map((e) => (
            <Pressable key={e} onPress={() => setEmoji(e)} accessibilityRole="button" accessibilityState={{ selected: emoji === e }} style={[styles.emojiCell, emoji === e && styles.emojiCellOn]}>
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>{t('editor.color')}</Text>
        <View style={styles.wrap}>
          {PROJECT_COLOR_IDS.map((c) => (
            <Pressable key={c} onPress={() => setColorId(c)} accessibilityRole="button" accessibilityState={{ selected: colorId === c }} accessibilityLabel={t('editor.colorA11y', { color: c })} style={[styles.swatch, { backgroundColor: getBucketColor(c).accent }, colorId === c && styles.swatchOn]} />
          ))}
        </View>

        <Text style={styles.fieldLabel}>{t('editor.suggestedHabits')}</Text>
        {habits.map((h, i) => (
          <View key={`${h.title}-${i}`} style={styles.habitRow}>
            <Text style={styles.habitText} numberOfLines={1}>
              {CATEGORY_META[h.category].icon} {h.title} · +{h.contribution} {unit || t('editor.units')}
            </Text>
            <Pressable onPress={() => setHabits((prev) => prev.filter((_, idx) => idx !== i))} accessibilityRole="button" accessibilityLabel={t('editor.removeHabitA11y', { title: h.title })} hitSlop={8}>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.habitAdder}>
          <TextInput value={hTitle} onChangeText={setHTitle} placeholder={t('editor.habitPlaceholder')} placeholderTextColor={MUTED} style={[styles.input, { flex: 1 }]} maxLength={60} accessibilityLabel={t('editor.habitTitleA11y')} />
          <TextInput value={hValue} onChangeText={setHValue} style={[styles.input, { width: 56, textAlign: 'center' }]} keyboardType="number-pad" maxLength={4} accessibilityLabel={t('editor.unitsPerA11y')} />
        </View>
        <View style={styles.wrap}>
          {CATEGORY_ORDER.map((c) => (
            <Pressable key={c} onPress={() => setHCat(c)} accessibilityRole="button" accessibilityState={{ selected: hCat === c }} style={[styles.chip, hCat === c && styles.chipOn]}>
              <Text style={[styles.chipText, hCat === c && styles.chipTextOn]}>{CATEGORY_META[c].icon} {t(`categories:${c}`)}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={addHabit} accessibilityRole="button" accessibilityLabel={t('editor.addHabitA11y')} style={styles.addHabit}>
          <Text style={styles.addHabitText}>{t('editor.addHabit')}</Text>
        </Pressable>

        <Pressable onPress={() => void save()} disabled={!canSave} accessibilityRole="button" accessibilityLabel={t('editor.createA11y')} style={[styles.cta, !canSave && styles.ctaOff]}>
          <Text style={styles.ctaText}>{t('editor.create')}</Text>
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
  pinBtn: { backgroundColor: CARD, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: TRACK, alignItems: 'center' },
  pinBtnOn: { backgroundColor: '#EAFBF6', borderColor: '#16C8A8' },
  pinText: { ...typography.label, color: INK, fontWeight: '600' },
  pinTextOn: { color: '#0A6E5C', fontWeight: '700' },
  pinHint: { ...typography.caption, color: MUTED },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
