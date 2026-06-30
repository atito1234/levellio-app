import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AnimatedHero, PressableScale, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_DEEP = '#4A32B0';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';
const ERR = '#C0202C';

export function SignInScreen({ navigation }: Props) {
  const { t } = useTranslation(['auth', 'common']);
  const { signIn, signUp, resetPassword, signInWithApple, signInWithGoogle, isReal } = useAuth();
  const { character } = useGame();

  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [name, setName] = useState(character?.name ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isUp = mode === 'up';
  const canSubmit =
    email.trim().length > 3 && password.length >= 6 && (!isUp || name.trim().length > 0) && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const result = isUp ? await signUp(email, password, name) : await signIn(email, password);
    setBusy(false);
    if (result.ok) navigation.goBack();
    else setError(result.error ?? t('auth:genericError'));
  };

  const onProvider = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (result.ok) navigation.goBack();
    else setError(result.error === 'unavailable' ? t('auth:providerSoon') : result.error ?? t('auth:genericError'));
  };

  const onReset = async () => {
    if (email.trim().length < 4) {
      setError(t('auth:needEmail'));
      return;
    }
    const result = await resetPassword(email);
    setInfo(result.ok ? t('auth:resetSent') : null);
    setError(result.ok ? null : result.error ?? null);
  };

  return (
    <ScreenContainer backgroundColor={BG} keyboardAvoiding>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('auth:close')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Cinematic header — your hero, ready for the ascent. */}
        <View style={styles.hero}>
          <View style={styles.heroStage}>
            <View style={styles.heroHalo} />
            <AnimatedHero presentation={character?.presentation ?? 'neutral'} tier="pathfinder" size={120} />
          </View>
          <Text style={styles.title} accessibilityRole="header">{t('auth:claimTitle')}</Text>
          <Text style={styles.lead}>{t('auth:claimLead')}</Text>
        </View>

        {/* One-tap providers (light up once OAuth is configured in the full build). */}
        <View style={styles.providers}>
          {Platform.OS === 'ios' && (
            <PressableScale
              onPress={() => void onProvider(signInWithApple)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('auth:continueApple')}
              style={[styles.provider, styles.providerApple]}
            >
              <Text style={[styles.providerText, styles.providerTextApple]}>{t('auth:continueApple')}</Text>
            </PressableScale>
          )}
          <PressableScale
            onPress={() => void onProvider(signInWithGoogle)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('auth:continueGoogle')}
            style={[styles.provider, styles.providerGoogle]}
          >
            <Text style={[styles.providerText, styles.providerTextGoogle]}>{t('auth:continueGoogle')}</Text>
          </PressableScale>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth:or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {!isReal && <Text style={styles.note}>{t('auth:offline')}</Text>}

        <View style={styles.form}>
          {isUp && (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('auth:namePlaceholder')}
              placeholderTextColor={MUTED}
              style={styles.input}
              maxLength={40}
              accessibilityLabel={t('auth:namePlaceholder')}
            />
          )}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth:emailPlaceholder')}
            placeholderTextColor={MUTED}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            accessibilityLabel={t('auth:emailPlaceholder')}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth:passwordPlaceholder')}
            placeholderTextColor={MUTED}
            style={styles.input}
            secureTextEntry
            accessibilityLabel={t('auth:passwordPlaceholder')}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <PressableScale
            onPress={() => void submit()}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={isUp ? t('auth:create') : t('auth:signIn')}
            style={[styles.cta, !canSubmit && styles.ctaOff]}
          >
            <Text style={styles.ctaText}>{isUp ? t('auth:create') : t('auth:signIn')}</Text>
          </PressableScale>

          <Pressable
            onPress={() => {
              setMode(isUp ? 'in' : 'up');
              setError(null);
              setInfo(null);
            }}
            accessibilityRole="button"
            style={styles.switch}
          >
            <Text style={styles.switchText}>{isUp ? t('auth:toSignIn') : t('auth:toSignUp')}</Text>
          </Pressable>

          {!isUp && isReal && (
            <Pressable onPress={() => void onReset()} accessibilityRole="button" style={styles.switch}>
              <Text style={styles.switchText}>{t('auth:forgot')}</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.trust}>{t('auth:trust')}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm },
  heroStage: { width: 160, height: 160, borderRadius: 28, backgroundColor: VIOLET_DEEP, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: spacing.xs },
  heroHalo: { position: 'absolute', width: 120, height: 120, borderRadius: 999, backgroundColor: VIOLET, opacity: 0.5 },
  title: { ...typography.heading, color: INK, textAlign: 'center' },
  lead: { ...typography.body, color: MUTED, textAlign: 'center', paddingHorizontal: spacing.sm },
  note: { ...typography.caption, color: MUTED, backgroundColor: '#FFF6E5', padding: spacing.sm, borderRadius: 12 },
  providers: { gap: spacing.sm, marginTop: spacing.xs },
  provider: { borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1 },
  providerApple: { backgroundColor: '#000000', borderColor: '#000000' },
  providerGoogle: { backgroundColor: CARD, borderColor: TRACK },
  providerText: { ...typography.label, fontWeight: '800' },
  providerTextApple: { color: '#FFFFFF' },
  providerTextGoogle: { color: INK },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: TRACK },
  dividerText: { ...typography.caption, color: MUTED },
  trust: { ...typography.caption, color: MUTED, textAlign: 'center', marginTop: spacing.sm },
  form: { gap: spacing.sm, marginTop: spacing.sm },
  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: TRACK },
  error: { ...typography.caption, color: ERR },
  info: { ...typography.caption, color: '#0A7D54' },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  switch: { alignItems: 'center', paddingVertical: spacing.sm },
  switchText: { ...typography.label, color: VIOLET, fontWeight: '700' },
});
