/**
 * Single source of truth for app identity, ownership, contact, mission, and the
 * in-app legal links. Keeping these here lets the About/Settings UI and the unit
 * tests stay in sync (e.g., the version is asserted against app.json/package.json).
 */

export const APP_NAME = 'Levellio';
/** Must match app.json `expo.version` and package.json `version` (asserted in tests). */
export const APP_VERSION = '1.0.0';
/** Release channel shown to users. v1.0 ships as an open beta. */
export const APP_CHANNEL = 'beta';

export const OWNER = 'Ethix Innova LLC';
export const PRINCIPAL = 'Antonio Joel Tito, PhD';
export const CONTACT_EMAIL = 'doctortitoconsulting@gmail.com';
export const GOVERNING_LAW = 'State of Texas, USA';
export const EFFECTIVE_DATE = 'June 10, 2026';

/**
 * Mission statement — intentionally QUALITATIVE and future-tense. There are no
 * proceeds during the free beta, no fixed percentage is promised, no registered
 * nonprofit is named, and no tax-deductibility is implied.
 */
export const MISSION =
  'When Levellio introduces paid features in the future, a portion of the proceeds will ' +
  'support community health efforts in Fort Liberté, Haiti.';

export type LegalDocKey = 'privacy' | 'terms';

export interface LegalLink {
  key: LegalDocKey;
  label: string;
  /** Spoken label for screen readers. */
  a11yLabel: string;
}

/** Rows surfaced in Settings → About & Legal. */
export const LEGAL_LINKS: readonly LegalLink[] = [
  { key: 'privacy', label: 'Privacy Policy', a11yLabel: 'Open the Privacy Policy' },
  { key: 'terms', label: 'Terms of Service', a11yLabel: 'Open the Terms of Service' },
];

/** Human-readable version line, e.g. "Version 1.0.0 (beta)". */
export function versionLabel(): string {
  return `Version ${APP_VERSION} (${APP_CHANNEL})`;
}
