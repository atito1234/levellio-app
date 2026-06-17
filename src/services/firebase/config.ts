/**
 * Firebase web config, read from EXPO_PUBLIC_* env vars (see .env.example).
 * Expo inlines EXPO_PUBLIC_* into the client bundle. These are not secrets —
 * Firebase security is enforced by Auth + Firestore security rules, not by
 * hiding the config. When the keys are absent the app falls back to the local,
 * on-device projects backend (no crash, no network).
 */
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
} as const;

/** True only when the minimum keys needed to init Firebase are present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}
