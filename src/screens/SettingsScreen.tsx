import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ChipSelector,
  PrimaryButton,
  ScreenContainer,
  TextField,
  type ChipOption,
} from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import {
  settingsStore,
  type AIMode,
  type AppSettings,
  type CloudProvider,
} from '@/services/settings';
import {
  clearByoApiKey,
  getByoApiKey,
  setByoApiKey,
} from '@/services/security/secureKeyStore';
import { syncService } from '@/services/sync';
import type { HeroPresentation } from '@/types';

const AI_MODE_OPTIONS: ChipOption<AIMode>[] = [
  { value: 'on-device', label: '🔒 On-device (Private)' },
  { value: 'cloud', label: '☁️ Cloud (your key)' },
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
  const { character, quests, setPresentation } = useGame();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [keySaved, setKeySaved] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [loaded, key] = await Promise.all([settingsStore.load(), getByoApiKey()]);
      if (!active) return;
      setSettings(loaded);
      setKeySaved(Boolean(key));
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const next = await settingsStore.update(patch);
    setSettings(next);
  };

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
        {/* AI section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Quest Suggestions</Text>
          <Text style={styles.note}>
            Levellio is fully usable without AI. Suggestions are optional — cloud AI uses your own
            API key, which we never see.
          </Text>

          {settings && (
            <>
              <ChipSelector
                label="AI mode"
                options={AI_MODE_OPTIONS}
                selected={settings.aiMode}
                onSelect={(aiMode) => updateSettings({ aiMode })}
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
                    onSelect={(provider) => updateSettings({ provider })}
                  />
                  <View
                    style={[styles.statusPill, keySaved ? styles.statusOk : styles.statusWarn]}
                    accessibilityLabel={keySaved ? 'API key saved' : 'No API key set'}
                  >
                    <Text style={styles.statusText}>
                      {keySaved ? '✓ API key saved' : 'No API key set'}
                    </Text>
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
            </>
          )}
        </View>

        {/* Hero section */}
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

        {/* Account / sync (stubbed) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account & Sync</Text>
          <Text style={styles.note}>
            Signed in as a guest. Cloud accounts and sync are coming soon — this is a local mock.
          </Text>
          <PrimaryButton label="Back up to cloud (mock)" variant="ghost" onPress={handleSync} />
          {syncMsg ? (
            <Text style={styles.help} accessibilityLiveRegion="polite">
              {syncMsg}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  cardTitle: {
    ...typography.title,
    color: colors.textPrimary,
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
  statusOk: {
    backgroundColor: colors.tealSoft,
  },
  statusWarn: {
    backgroundColor: colors.goldSoft,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
