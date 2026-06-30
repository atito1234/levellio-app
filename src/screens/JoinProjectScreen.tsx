import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, ScreenHeader } from '@/components';
import { radii, shadows, spacing, typography } from '@/theme';
import { useProjects } from '@/state/ProjectsContext';
import { isValidInviteCode, normalizeInviteCode } from '@/lib/projects';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinProject'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';
const ERR = '#C0202C';

export function JoinProjectScreen({ route, navigation }: Props) {
  const { t } = useTranslation('projects');
  const { joinByCode } = useProjects();
  const [code, setCode] = useState(normalizeInviteCode(route.params?.code ?? ''));
  const [shareFeed, setShareFeed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = isValidInviteCode(code);

  const join = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const project = await joinByCode(code, shareFeed);
    setBusy(false);
    if (project) navigation.replace('ProjectDetail', { projectId: project.id });
    else setError(t('join.notFound'));
  };

  return (
    <ScreenContainer backgroundColor={BG} keyboardAvoiding>
      <ScreenHeader title={t('join.title')} onBack={() => navigation.goBack()} backLabel={t('join.close')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>{t('join.lead')}</Text>

        <TextInput
          value={code}
          onChangeText={(text) => setCode(normalizeInviteCode(text))}
          placeholder={t('join.codePlaceholder')}
          placeholderTextColor={MUTED}
          style={styles.codeInput}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
          accessibilityLabel={t('join.codeA11y')}
        />

        <View style={styles.consent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.consentTitle}>{t('join.shareTitle')}</Text>
            <Text style={styles.consentBody}>{t('join.shareBody')}</Text>
          </View>
          <Switch value={shareFeed} onValueChange={setShareFeed} accessibilityLabel={t('join.shareA11y')} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={() => void join()}
          disabled={!valid || busy}
          accessibilityRole="button"
          accessibilityLabel={t('join.ctaA11y')}
          style={[styles.cta, (!valid || busy) && styles.ctaOff]}
        >
          <Text style={styles.ctaText}>{t('join.cta')}</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  title: { ...typography.heading, color: INK },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  lead: { ...typography.body, color: MUTED },
  codeInput: {
    ...typography.heading,
    color: INK,
    backgroundColor: CARD,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: TRACK,
    textAlign: 'center',
    letterSpacing: 4,
  },
  consent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: radii.lg, padding: spacing.md, ...shadows.sm },
  consentTitle: { ...typography.label, color: INK, fontWeight: '700' },
  consentBody: { ...typography.caption, color: MUTED, marginTop: 2 },
  error: { ...typography.caption, color: ERR },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
