import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChipSelector,
  DataDangerZone,
  PrimaryButton,
  ScreenContainer,
  TextField,
  type ChipOption,
} from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useAuth } from '@/state/AuthContext';
import { useSettings } from '@/state/SettingsContext';
import { type AIMode, type CloudProvider } from '@/services/settings';
import type { MetadataPrivacy } from '@/lib/metadata';
import { clearByoApiKey, getByoApiKey, setByoApiKey } from '@/services/security/secureKeyStore';
import { SETTINGS_COPY } from '@/content/uiCopy';
import {
  CONTACT_EMAIL,
  LEGAL_LINKS,
  MISSION,
  OWNER,
  versionLabel,
} from '@/content/aboutInfo';
import type { HeroPresentation } from '@/types';
import type { RootStackParamList } from '@/navigation/types';
import {
  LOCALE_LABELS,
  OFFERED_LOCALES,
  isSupportedLocale,
  type LocaleSetting,
} from '@/i18n/config';
import { COSMETIC_THEMES, getTheme } from '@/data/cosmetics';
import { canUseCosmetics } from '@/services/monetization';
import { useEntitlements } from '@/state/SubscriptionContext';

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
  const { t, i18n } = useTranslation('settings');
  const activeLocale = isSupportedLocale(i18n.language) ? i18n.language : 'en';
  const { character, setPresentation, setName } = useGame();
  const [nameDraft, setNameDraft] = useState(character?.name ?? '');
  const { account, isReal, signOut, deleteAccount } = useAuth();
  const { settings, ready, update } = useSettings();
  const entitlements = useEntitlements();

  const pickTheme = (id: string) => {
    const theme = getTheme(id);
    if (theme.premium && !canUseCosmetics(entitlements)) {
      navigation.navigate('Paywall');
      return;
    }
    void update({ cosmeticThemeId: id });
  };

  // Only the languages you can switch TO — the active one is hidden (shown as a
  // "current" line below), and Creole is not offered yet.
  const localeOptions: ChipOption<LocaleSetting>[] = OFFERED_LOCALES.filter((l) => l !== activeLocale).map((l) => ({
    value: l as LocaleSetting,
    label: LOCALE_LABELS[l],
  }));

  const [keySaved, setKeySaved] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  const runDelete = async () => {
    setDeleteBusy(true);
    setDeleteError(undefined);
    const res = await deleteAccount(isReal ? deletePassword : undefined);
    setDeleteBusy(false);
    if (res.ok) {
      setDeleteOpen(false);
      setDeletePassword('');
    } else {
      setDeleteError(res.error ?? 'Could not delete your account. Please try again.');
    }
  };

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

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Account — only when signed in (community/projects). */}
        {account && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account</Text>
            <Text style={styles.note}>Signed in{account.email ? ` as ${account.email}` : ''}.</Text>
            <PrimaryButton label="Sign out" variant="ghost" onPress={confirmSignOut} />
            <Pressable
              onPress={() => {
                setDeleteError(undefined);
                setDeletePassword('');
                setDeleteOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteBtnText}>Delete account</Text>
            </Pressable>
            <Text style={styles.help}>
              Permanently deletes your account and your community + project data (memberships,
              contributions, posts, comments, reactions, follows). This can’t be undone.
            </Text>
          </View>
        )}

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('language.title')}</Text>
          <Text style={styles.note}>{t('language.current', { lang: LOCALE_LABELS[activeLocale] })}</Text>
          {localeOptions.length > 0 && (
            <ChipSelector
              label={t('language.switchTo')}
              options={localeOptions}
              selected={settings.locale}
              onSelect={(locale) => update({ locale })}
            />
          )}
        </View>

        {/* Levellio Plus — founding member during the beta */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('plus.title')}</Text>
          <Text style={styles.note}>{t('plus.founding')}</Text>
          <PrimaryButton label={t('plus.cta')} variant="primary" onPress={() => navigation.navigate('Paywall')} />
        </View>

        {/* Theme / accent personalization (a Plus cosmetic) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('themes.title')}</Text>
          <Text style={styles.note}>{t('themes.subtitle')}</Text>
          <View style={styles.swatchRow}>
            {COSMETIC_THEMES.map((theme) => {
              const on = settings.cosmeticThemeId === theme.id;
              return (
                <Pressable
                  key={theme.id}
                  onPress={() => pickTheme(theme.id)}
                  accessibilityRole="button"
                  accessibilityLabel={theme.name}
                  accessibilityState={{ selected: on }}
                  style={[styles.swatch, { backgroundColor: theme.accent }, on && styles.swatchOn]}
                >
                  {on && <Text style={styles.swatchCheck}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Beta banner — honest, no charging */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{SETTINGS_COPY.betaBannerTitle}</Text>
          <Text style={styles.note}>{SETTINGS_COPY.betaBannerNote}</Text>
          <PrimaryButton
            label={SETTINGS_COPY.betaBannerCta}
            variant="ghost"
            onPress={() => navigation.navigate('Paywall')}
          />
        </View>

        {/* AI section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{SETTINGS_COPY.aiSectionTitle}</Text>
          <Text style={styles.note}>{SETTINGS_COPY.aiSectionNote}</Text>
          <PrimaryButton label={t('ai:learnMore')} variant="ghost" onPress={() => navigation.navigate('AISetup')} />

          <ChipSelector
            label="AI mode"
            options={AI_MODE_OPTIONS}
            selected={settings.aiMode}
            onSelect={(aiMode) => update({ aiMode })}
          />

          {settings.aiMode === 'on-device' ? (
            <Text style={styles.help}>{SETTINGS_COPY.aiOnDeviceHelp}</Text>
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

          <Text style={styles.help}>{SETTINGS_COPY.aiNoKeyHelp}</Text>
        </View>

        {/* Hero presentation (free) */}
        {character && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('hero.title')}</Text>
            <TextField
              label={t('hero.nameLabel')}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder={t('hero.namePlaceholder')}
              maxLength={40}
              onEndEditing={() => {
                if (nameDraft.trim() && nameDraft.trim() !== character.name) void setName(nameDraft);
              }}
            />
            <ChipSelector
              label={t('hero.presentation')}
              options={PRESENTATION_OPTIONS}
              selected={character.presentation}
              onSelect={(p) => setPresentation(p)}
            />
          </View>
        )}

        {/* Community & feedback */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Community &amp; feedback</Text>
          <Text style={styles.note}>
            Community Projects let you build habits together toward a shared, real-world goal. These
            controls are yours — turn them on when you want them.
          </Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Haptic feedback</Text>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(v) => void update({ hapticsEnabled: v })}
              accessibilityLabel="Haptic feedback"
              accessibilityRole="switch"
              trackColor={{ true: colors.identity, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show World Projects on Today</Text>
            <Switch
              value={settings.worldProjectsEnabled}
              onValueChange={(v) => void update({ worldProjectsEnabled: v, ...(v ? {} : { worldProjectAlerts: false }) })}
              accessibilityLabel="Show World Projects on Today"
              accessibilityRole="switch"
              trackColor={{ true: colors.identity, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          {settings.worldProjectsEnabled && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Notify me about world milestones</Text>
              <Switch
                value={settings.worldProjectAlerts}
                onValueChange={(v) => void update({ worldProjectAlerts: v })}
                accessibilityLabel="Notify me about world milestones"
                accessibilityRole="switch"
                trackColor={{ true: colors.identity, false: colors.border }}
                thumbColor={colors.surface}
              />
            </View>
          )}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Prep goals feed project progress</Text>
            <Switch
              value={settings.projectPrepLinkMode === 'full'}
              onValueChange={(v) => void update({ projectPrepLinkMode: v ? 'full' : 'visual' })}
              accessibilityLabel="Prep goals feed project progress"
              accessibilityRole="switch"
              trackColor={{ true: colors.identity, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          <Text style={styles.help}>
            When you pick a personal goal to “prepare” for a project goal: ON makes its habits count
            toward the project goal’s progress; OFF just shows it as a reminder. See what people
            around the world are building toward — a premium membership for projects is coming soon.
          </Text>
        </View>

        {/* Habit insights & privacy (on-device, opt-in) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Habit insights</Text>
          <Text style={styles.note}>
            Levellio keeps simple notes on your device about how your habits form, so a future update
            can show you insights. Nothing is uploaded — no analytics, no accounts. You choose exactly
            what&apos;s recorded.
          </Text>
          <PrivacyToggle
            label="Remember how buckets are formed"
            value={settings.metadataPrivacy.recordProvenance}
            field="recordProvenance"
            privacy={settings.metadataPrivacy}
            update={update}
          />
          <PrivacyToggle
            label="Track which activities build which buckets"
            value={settings.metadataPrivacy.recordContribution}
            field="recordContribution"
            privacy={settings.metadataPrivacy}
            update={update}
          />
          <PrivacyToggle
            label="Include activity details (category, difficulty, XP)"
            value={settings.metadataPrivacy.includeContext}
            field="includeContext"
            privacy={settings.metadataPrivacy}
            update={update}
          />
          <PrivacyToggle
            label="Include which activities inspired a bucket"
            value={settings.metadataPrivacy.includeSourceActivities}
            field="includeSourceActivities"
            privacy={settings.metadataPrivacy}
            update={update}
          />
          <PrivacyToggle
            label="Keep exact timestamps"
            value={settings.metadataPrivacy.includeTimestamps}
            field="includeTimestamps"
            privacy={settings.metadataPrivacy}
            update={update}
          />
          <PrivacyToggle
            label="Record activity sessions (duration, time of day)"
            value={settings.metadataPrivacy.recordSession}
            field="recordSession"
            privacy={settings.metadataPrivacy}
            update={update}
          />
          <PrivacyToggle
            label="Capture location &amp; speed (needs permission)"
            value={settings.metadataPrivacy.includeLocation}
            field="includeLocation"
            privacy={settings.metadataPrivacy}
            update={update}
          />
        </View>

        {/* Danger zone — scoped, permanent data deletion. */}
        <DataDangerZone />

        {/* About & Legal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About &amp; Legal</Text>

          {LEGAL_LINKS.map((link) => (
            <Pressable
              key={link.key}
              accessibilityRole="button"
              accessibilityLabel={link.a11yLabel}
              onPress={() => navigation.navigate('Legal', { doc: link.key })}
              style={styles.row}
            >
              <Text style={styles.rowLabel}>{link.label}</Text>
              <Text style={styles.rowChevron} accessibilityElementsHidden>
                ›
              </Text>
            </Pressable>
          ))}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Email support at ${CONTACT_EMAIL}`}
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            style={styles.row}
          >
            <Text style={styles.rowLabel}>Contact support</Text>
            <Text style={styles.rowValue}>{CONTACT_EMAIL}</Text>
          </Pressable>

          <Text style={styles.mission}>{MISSION}</Text>
          <Text style={styles.help}>
            {OWNER} · {versionLabel()}
          </Text>
        </View>
      </ScrollView>

      {/* Delete-account confirmation (with password re-verify for real accounts). */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.note}>
              This permanently removes your account and your community + project data. It can’t be undone.
            </Text>
            {isReal && (
              <TextField
                label="Confirm your password"
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
            {deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
            <PrimaryButton
              label="Delete forever"
              variant="ghost"
              onPress={() => void runDelete()}
              loading={deleteBusy}
              disabled={deleteBusy || (isReal && deletePassword.trim().length === 0)}
            />
            <PrimaryButton label="Cancel" variant="ghost" onPress={() => setDeleteOpen(false)} disabled={deleteBusy} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

/** A single per-field metadata privacy toggle (accessible Switch row). */
function PrivacyToggle({
  label,
  value,
  field,
  privacy,
  update,
}: {
  label: string;
  value: boolean;
  field: keyof MetadataPrivacy;
  privacy: MetadataPrivacy;
  update: (patch: { metadataPrivacy: MetadataPrivacy }) => Promise<void>;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(next) => void update({ metadataPrivacy: { ...privacy, [field]: next } })}
        accessibilityLabel={label}
        accessibilityRole="switch"
        trackColor={{ true: colors.identity, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const DANGER = '#C0202C';
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  deleteBtnText: { ...typography.label, color: DANGER, fontWeight: '800' },
  deleteError: { ...typography.caption, color: DANGER, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(31,41,55,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  modalTitle: { ...typography.title, color: DANGER, fontWeight: '800' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  toggleLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
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
  swatchRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  swatch: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: colors.textPrimary },
  swatchCheck: { color: '#FFFFFF', fontWeight: '800' },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  rowValue: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  rowChevron: {
    ...typography.title,
    color: colors.textMuted,
  },
  mission: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
