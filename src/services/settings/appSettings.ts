/**
 * App settings (non-secret) persisted via the KeyValueStore. Holds the user's
 * AI preference: on-device (private, no key) or cloud (their own key + provider).
 */
import type { KeyValueStore } from '@/services/storage';
import {
  DEFAULT_METADATA_PRIVACY,
  normalizeMetadataPrivacy,
  type MetadataPrivacy,
} from '@/lib/metadata';
import { isSupportedLocale, type LocaleSetting } from '@/i18n/config';

export type AIMode = 'on-device' | 'cloud';
export type CloudProvider = 'gemini' | 'openai' | 'anthropic';

/** How the activity/organize surface is displayed. */
export type BucketViewMode = 'list' | 'buckets';

/** How a personal goal that "prepares" for a project goal links to it. */
export type PrepLinkMode = 'visual' | 'full';

/** Persisted onboarding questionnaire answers (used to personalize + for later tuning). */
export interface OnboardingAnswersStored {
  focus?: string[];
  /** Per-focus follow-up answers: focus key → selected option ids. */
  focusDetail?: Record<string, string[]>;
  /** Dietary profile chosen for the eat focus (e.g. 'vegan'), if any. */
  dietaryTag?: string;
  blocker?: string;
  habitCount?: number;
  why?: string;
  reminderTime?: string;
}

export interface AppSettings {
  aiMode: AIMode;
  provider: CloudProvider;
  /** Premium entitlement flag. No real billing — default false. */
  isPremium: boolean;
  /** Selected cosmetic theme id (premium-gated to change). */
  cosmeticThemeId: string;
  /** Remembered organize view: classic flat list vs. bucket cards. */
  bucketViewMode: BucketViewMode;
  /** Per-field opt-in toggles for habit-formation metadata capture. */
  metadataPrivacy: MetadataPrivacy;
  /** Tactile feedback (vibration) on completions & community wins. */
  hapticsEnabled: boolean;
  /** Opt-in: surface the "Around the world" community projects strip on Today. */
  worldProjectsEnabled: boolean;
  /** Opt-in: alerts about world/community project milestones. */
  worldProjectAlerts: boolean;
  /** Whether a "prepare" personal goal merely links visually or shares progress. */
  projectPrepLinkMode: PrepLinkMode;
  /** App language: an explicit locale, or 'system' to follow the device. */
  locale: LocaleSetting;
  /** First-run welcome flow finished — never show the intro cards again. */
  onboardingCompleted: boolean;
  /** First-run interactive spotlight tour finished or skipped — runs once only. */
  welcomeTourCompleted: boolean;
  /** Where the user said they heard about Levellio (onboarding attribution). */
  attributionSource?: string;
  /** Preferred reminder time of day captured in onboarding ('morning'|'afternoon'|'evening'). */
  reminderTime?: string;
  /** Raw onboarding questionnaire answers (focus areas, blocker, habit count, why). */
  onboardingAnswers?: OnboardingAnswersStored;
  /** Featured project ids recommended from the questionnaire (surfaced in Projects). */
  recommendedProjectIds?: string[];
  /** Recipe ids recommended from the dietary follow-up (surfaced in Recipes). */
  recommendedRecipeIds?: string[];
  /** True once we've shown the in-onboarding store-rating prompt (show at most once). */
  ratingRequested?: boolean;
  /** Optional public profile headline (LinkedIn-style one-liner). */
  profileHeadline?: string;
  /** Optional public profile location/country. */
  profileCountry?: string;
}

/** Privacy-first, free-by-default settings. */
export const DEFAULT_SETTINGS: AppSettings = {
  aiMode: 'on-device',
  provider: 'gemini',
  isPremium: false,
  cosmeticThemeId: 'classic',
  bucketViewMode: 'list',
  metadataPrivacy: { ...DEFAULT_METADATA_PRIVACY },
  // Haptics on by default (delightful); world projects opt-in so members feel in control.
  hapticsEnabled: true,
  worldProjectsEnabled: false,
  worldProjectAlerts: false,
  projectPrepLinkMode: 'visual',
  locale: 'system',
  onboardingCompleted: false,
  welcomeTourCompleted: false,
};

const SETTINGS_KEY = 'levellio:settings';

/** Coerce arbitrary stored data into valid settings. */
export function normalizeSettings(raw: unknown): AppSettings {
  const r = (raw ?? {}) as Partial<AppSettings>;
  const aiMode: AIMode = r.aiMode === 'cloud' ? 'cloud' : 'on-device';
  const provider: CloudProvider =
    r.provider === 'openai' || r.provider === 'anthropic' ? r.provider : 'gemini';
  return {
    aiMode,
    provider,
    isPremium: r.isPremium === true,
    cosmeticThemeId:
      typeof r.cosmeticThemeId === 'string' ? r.cosmeticThemeId : DEFAULT_SETTINGS.cosmeticThemeId,
    bucketViewMode: r.bucketViewMode === 'buckets' ? 'buckets' : 'list',
    metadataPrivacy: normalizeMetadataPrivacy(r.metadataPrivacy),
    hapticsEnabled: r.hapticsEnabled !== false,
    worldProjectsEnabled: r.worldProjectsEnabled === true,
    worldProjectAlerts: r.worldProjectAlerts === true,
    projectPrepLinkMode: r.projectPrepLinkMode === 'full' ? 'full' : 'visual',
    locale: r.locale === 'system' || isSupportedLocale(r.locale) ? r.locale : 'system',
    onboardingCompleted: r.onboardingCompleted === true,
    welcomeTourCompleted: r.welcomeTourCompleted === true,
    ...(typeof r.attributionSource === 'string' ? { attributionSource: r.attributionSource } : {}),
    ...(typeof r.reminderTime === 'string' ? { reminderTime: r.reminderTime } : {}),
    ...(r.onboardingAnswers && typeof r.onboardingAnswers === 'object'
      ? { onboardingAnswers: r.onboardingAnswers as OnboardingAnswersStored }
      : {}),
    ...(Array.isArray(r.recommendedProjectIds)
      ? { recommendedProjectIds: r.recommendedProjectIds.filter((x): x is string => typeof x === 'string') }
      : {}),
    ...(Array.isArray(r.recommendedRecipeIds)
      ? { recommendedRecipeIds: r.recommendedRecipeIds.filter((x): x is string => typeof x === 'string') }
      : {}),
    ...(r.ratingRequested === true ? { ratingRequested: true } : {}),
    ...(typeof r.profileHeadline === 'string' ? { profileHeadline: r.profileHeadline } : {}),
    ...(typeof r.profileCountry === 'string' ? { profileCountry: r.profileCountry } : {}),
  };
}

export class SettingsStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(): Promise<AppSettings> {
    const raw = await this.store.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    try {
      return normalizeSettings(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async save(settings: AppSettings): Promise<void> {
    await this.store.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const next = normalizeSettings({ ...(await this.load()), ...patch });
    await this.save(next);
    return next;
  }
}
