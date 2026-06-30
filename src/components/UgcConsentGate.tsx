/**
 * Community consent gate — shown before a signed-in user can post, comment, message
 * or run a project. Required by Apple 1.2 / Google Play UGC policy: users must
 * accept the community rules + Terms before creating content, and (for our 17+
 * rating) confirm they are old enough. Acceptance persists in app settings, so this
 * is a one-time step. Reuse `useUgcConsent()` to read/guard the flag.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing, typography } from '@/theme';
import { useSettings } from '@/state/SettingsContext';
import { PressableScale } from './PressableScale';
import type { RootStackParamList } from '@/navigation/types';

/** Read consent state + an `accept()` that records it. */
export function useUgcConsent() {
  const { settings, update } = useSettings();
  const consented = Boolean(settings.communityTermsAcceptedAt) && settings.ageConfirmed === true;
  const accept = async () => {
    await update({ communityTermsAcceptedAt: Date.now(), ageConfirmed: true });
  };
  return { consented, accept };
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Full-panel consent gate. `onAccepted` runs after the flag is persisted. */
export function UgcConsentGate({ onAccepted }: { onAccepted?: () => void }) {
  const { t } = useTranslation(['feed', 'common']);
  const { accept } = useUgcConsent();
  const navigation = useNavigation<Nav>();
  const [ageOk, setAgeOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const onAgree = async () => {
    if (!ageOk || busy) return;
    setBusy(true);
    await accept();
    setBusy(false);
    onAccepted?.();
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
      <Text style={styles.emoji}>🤝</Text>
      <Text style={styles.title} accessibilityRole="header">{t('feed:consent.title')}</Text>
      <Text style={styles.body}>{t('feed:consent.body')}</Text>

      <View style={styles.rules}>
        {(t('feed:consent.rules', { returnObjects: true }) as string[]).map((r, i) => (
          <Text key={i} style={styles.rule}>• {r}</Text>
        ))}
      </View>

      <Pressable
        onPress={() => setAgeOk((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ageOk }}
        style={styles.ageRow}
      >
        <View style={[styles.box, ageOk && styles.boxOn]}>{ageOk && <Text style={styles.check}>✓</Text>}</View>
        <Text style={styles.ageText}>{t('feed:consent.age')}</Text>
      </Pressable>

      <View style={styles.links}>
        <Pressable onPress={() => navigation.navigate('Legal', { doc: 'terms' })} accessibilityRole="link" hitSlop={8}>
          <Text style={styles.link}>{t('feed:consent.terms')}</Text>
        </Pressable>
        <Text style={styles.linkSep}>·</Text>
        <Pressable onPress={() => navigation.navigate('Legal', { doc: 'privacy' })} accessibilityRole="link" hitSlop={8}>
          <Text style={styles.link}>{t('feed:consent.privacy')}</Text>
        </Pressable>
      </View>

      <PressableScale
        onPress={() => void onAgree()}
        disabled={!ageOk || busy}
        accessibilityRole="button"
        accessibilityLabel={t('feed:consent.agree')}
        style={[styles.cta, (!ageOk || busy) && styles.ctaOff]}
      >
        <Text style={styles.ctaText}>{t('feed:consent.agree')}</Text>
      </PressableScale>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emoji: { fontSize: 48 },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  rules: { alignSelf: 'stretch', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  rule: { ...typography.body, color: colors.textPrimary },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.identity, borderColor: colors.identity },
  check: { color: '#FFFFFF', fontWeight: '900' },
  ageText: { ...typography.body, color: colors.textPrimary, flex: 1, fontWeight: '600' },
  links: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  link: { ...typography.label, color: colors.identity, fontWeight: '700' },
  linkSep: { ...typography.label, color: colors.textMuted },
  cta: { backgroundColor: colors.identity, borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center', alignSelf: 'stretch' },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
