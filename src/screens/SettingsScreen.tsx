import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
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
import { reloadApp, resetAppData } from '@/lib/appReset';
import { AUDIENCE_CONTROLS_ENABLED } from '@/config/features';
import type { AppSettings } from '@/services/settings/appSettings';
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
import { useSpotlight, WELCOME_TOUR } from '@/components/spotlight';
import { COSMETIC_THEMES, getTheme } from '@/data/cosmetics';
import { canUseCosmetics } from '@/services/monetization';
import { useEntitlements } from '@/state/SubscriptionContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Provider names are brand names — not translated.
const PROVIDER_OPTIONS: ChipOption<CloudProvider>[] = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
];

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { t, i18n } = useTranslation('settings');
  const activeLocale = isSupportedLocale(i18n.language) ? i18n.language : 'en';
  const { character, setPresentation, setName } = useGame();
  const [nameDraft, setNameDraft] = useState(character?.name ?? '');
  const { account, isReal, signOut, deleteAccount } = useAuth();
  const { settings, ready, update } = useSettings();
  const { start: startTour } = useSpotlight();
  const entitlements = useEntitlements();

  // Replay the first-run tour on demand: clear the flag, jump to Today, run it.
  const replayTour = () => {
    void update({ welcomeTourCompleted: false });
    navigation.navigate('Main', { screen: 'Dashboard' });
    setTimeout(() => startTour(WELCOME_TOUR), 350);
  };

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

  const aiModeOptions: ChipOption<AIMode>[] = [
    { value: 'on-device', label: t('ai.onDevice') },
    { value: 'cloud', label: t('ai.cloud') },
  ];
  const presentationOptions: ChipOption<HeroPresentation>[] = [
    { value: 'female', label: t('hero.female') },
    { value: 'male', label: t('hero.male') },
    { value: 'neutral', label: t('hero.neutral') },
  ];

  const [keySaved, setKeySaved] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const confirmSignOut = () =>
    Alert.alert(t('account.signOutConfirmTitle'), t('account.signOutConfirmBody'), [
      { text: t('account.cancel'), style: 'cancel' },
      { text: t('account.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);

  // Full local wipe → reload → re-run the first-run onboarding funnel + tour.
  const runResetApp = async () => {
    await resetAppData();
    reloadApp();
  };

  const confirmResetApp = () =>
    Alert.alert(t('reset.confirmTitle'), t('reset.confirmBody'), [
      { text: t('account.cancel'), style: 'cancel' },
      { text: t('reset.confirmCta'), style: 'destructive', onPress: () => void runResetApp() },
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
      setDeleteError(res.error ?? t('account.deleteFailed'));
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
            <Text style={styles.cardTitle}>{t('account.title')}</Text>
            <Text style={styles.note}>{account.email ? t('account.signedInAs', { email: account.email }) : t('account.signedIn')}</Text>
            <PrimaryButton label={t('account.signOut')} variant="ghost" onPress={confirmSignOut} />
            <Pressable
              onPress={() => {
                setDeleteError(undefined);
                setDeletePassword('');
                setDeleteOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('account.delete')}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteBtnText}>{t('account.delete')}</Text>
            </Pressable>
            <Text style={styles.help}>{t('account.deleteHelp')}</Text>
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
          <Text style={styles.cardTitle}>{t('beta.title')}</Text>
          <Text style={styles.note}>{t('beta.note')}</Text>
          <PrimaryButton
            label={t('beta.cta')}
            variant="ghost"
            onPress={() => navigation.navigate('Paywall')}
          />
        </View>

        {/* AI section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('ai.title')}</Text>
          <Text style={styles.note}>{t('ai.note')}</Text>
          <PrimaryButton label={t('ai:learnMore')} variant="ghost" onPress={() => navigation.navigate('AISetup')} />

          <ChipSelector
            label={t('ai.mode')}
            options={aiModeOptions}
            selected={settings.aiMode}
            onSelect={(aiMode) => update({ aiMode })}
          />

          {settings.aiMode === 'on-device' ? (
            <Text style={styles.help}>{t('ai.onDeviceHelp')}</Text>
          ) : (
            <>
              <ChipSelector
                label={t('ai.provider')}
                options={PROVIDER_OPTIONS}
                selected={settings.provider}
                onSelect={(provider) => update({ provider })}
              />
              <View
                style={[styles.statusPill, keySaved ? styles.statusOk : styles.statusWarn]}
                accessibilityLabel={keySaved ? t('ai.keySaved') : t('ai.noKey')}
              >
                <Text style={styles.statusText}>{keySaved ? t('ai.keySaved') : t('ai.noKey')}</Text>
              </View>
              <TextField
                label={t('ai.yourKey')}
                value={keyInput}
                onChangeText={setKeyInput}
                placeholder={t('ai.keyPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                helper={t('ai.keyHelper')}
              />
              <PrimaryButton
                label={t('ai.saveKey')}
                variant="action"
                onPress={handleSaveKey}
                disabled={keyInput.trim().length === 0}
              />
              {keySaved && (
                <PrimaryButton label={t('ai.clearKey')} variant="ghost" onPress={handleClearKey} />
              )}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{t('ai.recipesTitle')}</Text>
                <Switch
                  value={settings.aiRecipesEnabled}
                  onValueChange={(v) => void update({ aiRecipesEnabled: v })}
                  accessibilityLabel={t('ai.recipesTitle')}
                  accessibilityRole="switch"
                  trackColor={{ true: colors.identity, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </View>
              <Text style={styles.help}>{t('ai.recipesHelp')}</Text>
            </>
          )}

          <Text style={styles.help}>{t('ai.noKeyHelp')}</Text>
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
              options={presentationOptions}
              selected={character.presentation}
              onSelect={(p) => setPresentation(p)}
            />
          </View>
        )}

        {/* Community & feedback */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('community.title')}</Text>
          <Text style={styles.note}>{t('community.note')}</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('community.haptics')}</Text>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(v) => void update({ hapticsEnabled: v })}
              accessibilityLabel={t('community.haptics')}
              accessibilityRole="switch"
              trackColor={{ true: colors.identity, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('community.showWorld')}</Text>
            <Switch
              value={settings.worldProjectsEnabled}
              onValueChange={(v) => void update({ worldProjectsEnabled: v, ...(v ? {} : { worldProjectAlerts: false }) })}
              accessibilityLabel={t('community.showWorld')}
              accessibilityRole="switch"
              trackColor={{ true: colors.identity, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          {settings.worldProjectsEnabled && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('community.notifyWorld')}</Text>
              <Switch
                value={settings.worldProjectAlerts}
                onValueChange={(v) => void update({ worldProjectAlerts: v })}
                accessibilityLabel={t('community.notifyWorld')}
                accessibilityRole="switch"
                trackColor={{ true: colors.identity, false: colors.border }}
                thumbColor={colors.surface}
              />
            </View>
          )}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('community.prepGoals')}</Text>
            <Switch
              value={settings.projectPrepLinkMode === 'full'}
              onValueChange={(v) => void update({ projectPrepLinkMode: v ? 'full' : 'visual' })}
              accessibilityLabel={t('community.prepGoals')}
              accessibilityRole="switch"
              trackColor={{ true: colors.identity, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          <Text style={styles.help}>{t('community.prepHelp')}</Text>
        </View>

        {/* Privacy — default audience for new posts. */}
        {AUDIENCE_CONTROLS_ENABLED && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('privacy.title')}</Text>
            <ChipSelector
              label={t('privacy.audienceLabel')}
              options={[
                { value: 'ask', label: t('privacy.audienceAsk') },
                { value: 'public', label: t('feed:composerScreen.audience_public') },
                { value: 'friends', label: t('feed:composerScreen.audience_friends') },
                { value: 'private', label: t('feed:composerScreen.audience_private') },
              ] as ChipOption<AppSettings['feedDefaultAudience']>[]}
              selected={settings.feedDefaultAudience}
              onSelect={(feedDefaultAudience) => update({ feedDefaultAudience })}
            />
            <Text style={styles.help}>{t('privacy.audienceHelp')}</Text>
          </View>
        )}

        {/* Habit insights & privacy (on-device, opt-in) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('insights.title')}</Text>
          <Text style={styles.note}>{t('insights.note')}</Text>
          <PrivacyToggle label={t('insights.recordProvenance')} value={settings.metadataPrivacy.recordProvenance} field="recordProvenance" privacy={settings.metadataPrivacy} update={update} />
          <PrivacyToggle label={t('insights.recordContribution')} value={settings.metadataPrivacy.recordContribution} field="recordContribution" privacy={settings.metadataPrivacy} update={update} />
          <PrivacyToggle label={t('insights.includeContext')} value={settings.metadataPrivacy.includeContext} field="includeContext" privacy={settings.metadataPrivacy} update={update} />
          <PrivacyToggle label={t('insights.includeSourceActivities')} value={settings.metadataPrivacy.includeSourceActivities} field="includeSourceActivities" privacy={settings.metadataPrivacy} update={update} />
          <PrivacyToggle label={t('insights.includeTimestamps')} value={settings.metadataPrivacy.includeTimestamps} field="includeTimestamps" privacy={settings.metadataPrivacy} update={update} />
          <PrivacyToggle label={t('insights.recordSession')} value={settings.metadataPrivacy.recordSession} field="recordSession" privacy={settings.metadataPrivacy} update={update} />
          <PrivacyToggle label={t('insights.includeLocation')} value={settings.metadataPrivacy.includeLocation} field="includeLocation" privacy={settings.metadataPrivacy} update={update} />
        </View>

        {/* Start over — full local wipe that replays the first-run onboarding. */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('reset.title')}</Text>
          <Text style={styles.note}>{t('reset.body')}</Text>
          <Pressable
            onPress={confirmResetApp}
            accessibilityRole="button"
            accessibilityLabel={t('reset.cta')}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteBtnText}>{t('reset.cta')}</Text>
          </Pressable>
          <Text style={styles.help}>{t('reset.help')}</Text>
        </View>

        {/* Danger zone — scoped, permanent data deletion. */}
        <DataDangerZone />

        {/* About & Legal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('about.title')}</Text>

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
            accessibilityLabel={t('about.emailSupportA11y', { email: CONTACT_EMAIL })}
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            style={styles.row}
          >
            <Text style={styles.rowLabel}>{t('about.contact')}</Text>
            <Text style={styles.rowValue}>{CONTACT_EMAIL}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('about.replayTour')}
            onPress={replayTour}
            style={styles.row}
          >
            <Text style={styles.rowLabel}>{t('about.replayTour')}</Text>
            <Text style={styles.rowChevron} accessibilityElementsHidden>
              ›
            </Text>
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
            <Text style={styles.modalTitle}>{t('account.deleteConfirmTitle')}</Text>
            <Text style={styles.note}>{t('account.deleteConfirmBody')}</Text>
            {isReal && (
              <TextField
                label={t('account.confirmPassword')}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder={t('account.passwordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
            {deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
            <PrimaryButton
              label={t('account.deleteForever')}
              variant="ghost"
              onPress={() => void runDelete()}
              loading={deleteBusy}
              disabled={deleteBusy || (isReal && deletePassword.trim().length === 0)}
            />
            <PrimaryButton label={t('account.cancel')} variant="ghost" onPress={() => setDeleteOpen(false)} disabled={deleteBusy} />
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
