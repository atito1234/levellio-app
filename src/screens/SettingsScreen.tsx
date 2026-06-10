import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChipSelector,
  PrimaryButton,
  ScreenContainer,
  TextField,
  type ChipOption,
} from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useSettings } from '@/state/SettingsContext';
import { type AIMode, type CloudProvider } from '@/services/settings';
import { clearByoApiKey, getByoApiKey, setByoApiKey } from '@/services/security/secureKeyStore';
import { syncService } from '@/services/sync';
import { canUseCloudSync, canUseCosmetics } from '@/services/monetization';
import { COSMETIC_THEMES } from '@/data/cosmetics';
import type { HeroPresentation } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AI_MODE_OPTIONS: ChipOption<AIMode>[] = [
  { value: 'on-device', label: '🔒 On-device (Free)' },
  { value: 'cloud', label: '☁️ Cloud · your key (Free)' },
];

const PROVIDER_OPTIONS: ChipOption<CloudProvider>[] = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
];

const PRESENTATION_OPTIONS: ChipOption<HeroPresentation>[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'neutral', label: 'Neutral' },
];

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { character, quests, setPresentation } = useGame();
  const { settings, ready, update } = useSettings();

  const [keySaved, setKeySaved] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    let active = true;
    getByoApiKey().then((key) => {
      if (active) setKeySaved(Boolean(key));
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.identity} />
        </View>
      </ScreenContainer>
    );
  }

  const cosmeticsUnlocked = canUseCosmetics(settings);
  const syncUnlocked = canUseCloudSync(settings);

  const handleSaveKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    await setByoApiKey(trimmed);
    setKeyInput('');
    setKeySaved(true);
  };

  const handleClearKey = async () => {
    await clearByoApiKey();
    setKeySaved(false);
  };

  const handleSync = async () => {
    if (!character) return;
    await syncService.sync({ character, quests, updatedAt: Date.now() });
    setSyncMsg('Backed up to cloud (mock) ✓');
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Plan banner */}
        <View style={[styles.card, settings.isPremium ? styles.premiumCard : undefined]}>
          <Text style={styles.cardTitle}>
            {settings.isPremium ? 'Premium active ✨' : 'You’re on the Free plan'}
          </Text>
          <Text style={styles.note}>
            {settings.isPremium
              ? 'Thanks for supporting Levellio. Manage your plan anytime.'
              : 'The free plan is fully featured forever. Premium adds optional extras only.'}
          </Text>
          <PrimaryButton
            label={settings.isPremium ? 'Manage plan' : 'See Premium'}
            variant={settings.isPremium ? 'ghost' : 'reward'}
            onPress={() => navigation.navigate('Paywall')}
          />
        </View>

        {/* AI section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Quest Suggestions</Text>
          <Text style={styles.note}>
            Levellio is fully usable without AI. Cloud AI uses your own API key, which we never see.
          </Text>

          <ChipSelector
            label="AI mode"
            options={AI_MODE_OPTIONS}
            selected={settings.aiMode}
            onSelect={(aiMode) => update({ aiMode })}
          />

          {settings.aiMode === 'on-device' ? (
            <Text style={styles.help}>
              Runs privately on your device. No key or network required.
            </Text>
          ) : (
            <>
              <ChipSelector
                label="Provider"
                options={PROVIDER_OPTIONS}
                selected={settings.provider}
                onSelect={(provider) => update({ provider })}
              />
              <View
                style={[styles.statusPill, keySaved ? styles.statusOk : styles.statusWarn]}
                accessibilityLabel={keySaved ? 'API key saved' : 'No API key set'}
              >
                <Text style={styles.statusText}>{keySaved ? '✓ API key saved' : 'No API key set'}</Text>
              </View>
              <TextField
                label="Your API key"
                value={keyInput}
                onChangeText={setKeyInput}
                placeholder="Paste your provider API key"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                helper="Stored only in your device's secure keychain. Never logged or uploaded."
              />
              <PrimaryButton
                label="Save key"
                variant="action"
                onPress={handleSaveKey}
                disabled={keyInput.trim().length === 0}
              />
              {keySaved && (
                <PrimaryButton label="Clear key" variant="ghost" onPress={handleClearKey} />
              )}
            </>
          )}

          <Text style={styles.help}>
            Prefer not to manage a key? Managed cloud AI is a Premium perk.
          </Text>
        </View>

        {/* Cosmetics (premium) */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Cosmetic Themes</Text>
            {!cosmeticsUnlocked && <Text style={styles.lock}>🔒 Premium</Text>}
          </View>
          <View style={styles.swatchRow}>
            {COSMETIC_THEMES.map((theme) => {
              const locked = theme.premium && !cosmeticsUnlocked;
              const selected = settings.cosmeticThemeId === theme.id;
              return (
                <Pressable
                  key={theme.id}
                  disabled={locked}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: locked }}
                  accessibilityLabel={`${theme.name}${locked ? ', locked, premium' : ''}`}
                  onPress={() => update({ cosmeticThemeId: theme.id })}
                  style={styles.swatchWrap}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: theme.accent },
                      selected && styles.swatchSelected,
                      locked && styles.swatchLocked,
                    ]}
                  >
                    {locked && <Text style={styles.swatchLockIcon}>🔒</Text>}
                    {selected && !locked && <Text style={styles.swatchCheck}>✓</Text>}
                  </View>
                  <Text style={styles.swatchLabel} numberOfLines={1}>
                    {theme.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!cosmeticsUnlocked && (
            <PrimaryButton
              label="Unlock themes with Premium"
              variant="ghost"
              onPress={() => navigation.navigate('Paywall')}
            />
          )}
        </View>

        {/* Hero presentation (free) */}
        {character && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Hero</Text>
            <ChipSelector
              label="Presentation"
              options={PRESENTATION_OPTIONS}
              selected={character.presentation}
              onSelect={(p) => setPresentation(p)}
            />
          </View>
        )}

        {/* Account & sync (premium, stubbed) */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Account & Sync</Text>
            {!syncUnlocked && <Text style={styles.lock}>🔒 Premium</Text>}
          </View>
          <Text style={styles.note}>
            Signed in as a guest. Cloud accounts and sync are a Premium perk — this is a local mock,
            no real network.
          </Text>
          {syncUnlocked ? (
            <>
              <PrimaryButton label="Back up to cloud (mock)" variant="action" onPress={handleSync} />
              {syncMsg ? (
                <Text style={styles.help} accessibilityLiveRegion="polite">
                  {syncMsg}
                </Text>
              ) : null}
            </>
          ) : (
            <PrimaryButton
              label="Unlock cloud sync with Premium"
              variant="ghost"
              onPress={() => navigation.navigate('Paywall')}
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  premiumCard: {
    borderWidth: 2,
    borderColor: colors.gold,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  lock: {
    ...typography.label,
    color: colors.goldDeep,
  },
  note: {
    ...typography.body,
    color: colors.textSecondary,
  },
  help: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  statusOk: { backgroundColor: colors.tealSoft },
  statusWarn: { backgroundColor: colors.goldSoft },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatchWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 64,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.textPrimary,
  },
  swatchLocked: {
    opacity: 0.45,
  },
  swatchLockIcon: {
    fontSize: 16,
  },
  swatchCheck: {
    color: colors.textOnBrand,
    fontWeight: '800',
    fontSize: 18,
  },
  swatchLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
