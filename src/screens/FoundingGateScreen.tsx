/**
 * Founding invite gate — the community is invite-only during the beta (INVITE_ONLY).
 * Enter a founding code; it's validated against the Firestore `foundingCodes`
 * collection the owner manages (offline/dev accepts any well-formed code). On
 * success we persist `foundingInviteCodeAccepted` and return to the community.
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AnimatedHero, PressableScale, ScreenContainer } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useSettings } from '@/state/SettingsContext';
import { communityBackend } from '@/services/community';
import { isValidInviteCode, normalizeInviteCode } from '@/lib/projects';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FoundingGate'>;

export function FoundingGateScreen({ navigation }: Props) {
  const { t } = useTranslation(['feed', 'common']);
  const { character } = useGame();
  const { update } = useSettings();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isValidInviteCode(code) && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const ok = await communityBackend.isValidFoundingCode(code);
    setBusy(false);
    if (ok) {
      await update({ foundingInviteCodeAccepted: true });
      navigation.goBack();
    } else {
      setError(t('feed:founding.invalid'));
    }
  };

  return (
    <ScreenContainer keyboardAvoiding>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('common:action.back')} hitSlop={12}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
        </View>
        <View style={styles.body}>
          <View style={styles.stage}>
            <View style={styles.halo} />
            <AnimatedHero presentation={character?.presentation ?? 'neutral'} tier={character?.tier ?? 'pathfinder'} size={108} />
          </View>
          <Text style={styles.title} accessibilityRole="header">{t('feed:founding.title')}</Text>
          <Text style={styles.lead}>{t('feed:founding.body')}</Text>

          <TextInput
            value={code}
            onChangeText={(text) => { setCode(normalizeInviteCode(text)); if (error) setError(null); }}
            placeholder={t('feed:founding.placeholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
            accessibilityLabel={t('feed:founding.placeholder')}
          />
          {error && <Text style={styles.error}>{error}</Text>}

          <PressableScale
            onPress={() => void submit()}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={t('feed:founding.cta')}
            style={[styles.cta, !canSubmit && styles.ctaOff]}
          >
            <Text style={styles.ctaText}>{t('feed:founding.cta')}</Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: colors.textPrimary, width: 28 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  stage: { width: 150, height: 150, borderRadius: radii.xl, backgroundColor: colors.violetDeep, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadows.lg },
  halo: { position: 'absolute', width: 116, height: 116, borderRadius: radii.round, backgroundColor: colors.identity, opacity: 0.5 },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  lead: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  input: { ...typography.title, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, alignSelf: 'stretch', textAlign: 'center', letterSpacing: 4 },
  error: { ...typography.caption, color: '#C0202C', fontWeight: '700' },
  cta: { backgroundColor: colors.identity, borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center', alignSelf: 'stretch' },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
