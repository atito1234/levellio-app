/**
 * Project application — creating a Community Project is vetted. Applicants describe
 * the project, pick public (world-listed) or private (invite-only), say why, and
 * explicitly agree to moderate it + uphold the community rules. The owner reviews
 * in the moderation console; once approved, the applicant can create the project.
 * This is how a solo founder scales moderation: vetted, accountable project leaders.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenContainer, ScreenHeader } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { screenText } from '@/lib/contentSafety';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectApplication'>;

export function ProjectApplicationScreen({ navigation }: Props) {
  const { t } = useTranslation(['projects', 'common']);
  const { submitProjectApplication } = useCommunity();
  const [title, setTitle] = useState('');
  const [region, setRegion] = useState('');
  const [summary, setSummary] = useState('');
  const [why, setWhy] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const clean = [title, region, summary, why].every((s) => screenText(s).ok);
  const canSubmit = title.trim() && region.trim() && summary.trim() && why.trim() && agreed && clean && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    await submitProjectApplication({
      title: title.trim(),
      region: region.trim(),
      summary: summary.trim(),
      why: why.trim(),
      visibility,
      agreedToModerate: true,
    });
    setBusy(false);
    navigation.goBack();
  };

  return (
    <ScreenContainer keyboardAvoiding>
      <ScreenHeader title={t('projects:application.title')} onBack={() => navigation.goBack()} backLabel={t('common:action.close')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>{t('projects:application.lead')}</Text>

        <TextInput value={title} onChangeText={setTitle} placeholder={t('projects:application.namePlaceholder')} placeholderTextColor={colors.textMuted} style={styles.input} maxLength={60} />
        <TextInput value={region} onChangeText={setRegion} placeholder={t('projects:application.regionPlaceholder')} placeholderTextColor={colors.textMuted} style={styles.input} maxLength={60} />
        <TextInput value={summary} onChangeText={setSummary} placeholder={t('projects:application.summaryPlaceholder')} placeholderTextColor={colors.textMuted} style={[styles.input, styles.multiline]} multiline maxLength={240} />
        <TextInput value={why} onChangeText={setWhy} placeholder={t('projects:application.whyPlaceholder')} placeholderTextColor={colors.textMuted} style={[styles.input, styles.multiline]} multiline maxLength={280} />

        <Text style={styles.label}>{t('projects:application.visibilityLabel')}</Text>
        <View style={styles.chips}>
          {(['private', 'public'] as const).map((v) => {
            const on = visibility === v;
            return (
              <Pressable key={v} onPress={() => setVisibility(v)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(`projects:application.visibility_${v}`)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{t(`projects:application.visibilityHint_${visibility}`)}</Text>

        <Pressable onPress={() => setAgreed((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} style={styles.agreeRow}>
          <View style={[styles.box, agreed && styles.boxOn]}>{agreed && <Text style={styles.check}>✓</Text>}</View>
          <Text style={styles.agreeText}>{t('projects:application.agree')}</Text>
        </Pressable>

        <PrimaryButton label={t('projects:application.submit')} variant="action" onPress={() => void submit()} disabled={!canSubmit} loading={busy} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  lead: { ...typography.body, color: colors.textSecondary },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  label: { ...typography.label, color: colors.textSecondary, letterSpacing: 1, marginTop: spacing.xs },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.violetSoft, borderColor: colors.identity },
  chipText: { ...typography.label, color: colors.textPrimary, fontWeight: '700' },
  chipTextOn: { color: colors.violetDeep, fontWeight: '800' },
  hint: { ...typography.caption, color: colors.textSecondary },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xs },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.identity, borderColor: colors.identity },
  check: { color: '#FFFFFF', fontWeight: '900' },
  agreeText: { ...typography.body, color: colors.textPrimary, flex: 1, fontWeight: '600' },
});
