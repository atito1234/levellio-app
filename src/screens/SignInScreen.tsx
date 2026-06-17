import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';
const ERR = '#C0202C';

export function SignInScreen({ navigation }: Props) {
  const { signIn, signUp, resetPassword, isReal } = useAuth();
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
    else setError(result.error ?? 'Something went wrong.');
  };

  const onReset = async () => {
    if (email.trim().length < 4) {
      setError('Enter your email above first.');
      return;
    }
    const result = await resetPassword(email);
    setInfo(result.ok ? 'Password reset email sent (if the address exists).' : null);
    setError(result.ok ? null : result.error ?? null);
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {isUp ? 'Create account' : 'Sign in'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Community projects connect you with others working toward a shared, real-world goal. Sign in so your progress
          counts toward the project — on any device.
        </Text>

        {!isReal && (
          <Text style={styles.note}>
            Offline mode: your account is stored on this device only until Levellio’s backend keys are configured.
          </Text>
        )}

        <View style={styles.form}>
          {isUp && (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Display name (e.g. your hero)"
              placeholderTextColor={MUTED}
              style={styles.input}
              maxLength={40}
              accessibilityLabel="Display name"
            />
          )}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={MUTED}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            accessibilityLabel="Email"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (6+ characters)"
            placeholderTextColor={MUTED}
            style={styles.input}
            secureTextEntry
            accessibilityLabel="Password"
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <Pressable
            onPress={() => void submit()}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={isUp ? 'Create account' : 'Sign in'}
            style={[styles.cta, !canSubmit && styles.ctaOff]}
          >
            <Text style={styles.ctaText}>{isUp ? 'Create account' : 'Sign in'}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(isUp ? 'in' : 'up');
              setError(null);
              setInfo(null);
            }}
            accessibilityRole="button"
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {isUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </Text>
          </Pressable>

          {!isUp && isReal && (
            <Pressable onPress={() => void onReset()} accessibilityRole="button" style={styles.switch}>
              <Text style={styles.switchText}>Forgot password?</Text>
            </Pressable>
          )}
        </View>
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
  note: { ...typography.caption, color: MUTED, backgroundColor: '#FFF6E5', padding: spacing.sm, borderRadius: 12 },
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
