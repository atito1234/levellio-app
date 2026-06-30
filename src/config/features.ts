/**
 * App feature flags. Keep these as plain constants so flipping one is a trivial,
 * reviewable change.
 */

/**
 * Photo/video uploads (post media + story creation) require Firebase Storage,
 * which needs the Blaze plan. Flip to `true` after the Blaze upgrade — every media
 * affordance reads this flag and is shown-but-disabled until then.
 */
export const MEDIA_UPLOADS_ENABLED = false;

/**
 * During the alpha, everyone is a "founding member" and gets Levellio Plus for
 * free. Set to `false` at launch (alongside turning on real billing) so Plus
 * perks become paid. Core habit-building + community always stay free regardless.
 */
export const FOUNDING_FREE = true;

// --- Pre-launch remodel flags (staged rollout; land code dark, flip per wave) ---

/** Per-post audience controls (public/friends/private) + privacy defaults. */
export const AUDIENCE_CONTROLS_ENABLED = true;

/** Reciprocal friends graph (request/accept) layered on one-way follow. */
export const FRIENDS_GRAPH_ENABLED = false;

/**
 * Third-party sign-in (Apple / Google). OFF for launch: the providers are stubbed
 * (return "unavailable"), so showing the buttons is broken UX and, on iOS, would
 * trigger Apple's "must offer Sign in with Apple" rule (4.8). Email/password only
 * until these are really implemented. Flip on once wired (add Sign in with Apple).
 */
export const THIRD_PARTY_AUTH_ENABLED = false;

/** Verified-vs-self-reported activity completion + keep-awake lock-in. */
export const ACTIVITY_VERIFICATION_ENABLED = true;

/** Step/motion verification via expo-sensors (Pedometer). */
export const HEALTH_STEPS_ENABLED = false;

/** Deep HealthKit / Health Connect integration (workouts, HR, sleep). */
export const HEALTH_CONNECT_ENABLED = false;

/** User checklists + daily "check-out" ritual (retention loop). */
export const CHECKLISTS_ENABLED = true;

/**
 * Capture + save/share the achievement certificate AS AN IMAGE. Needs native libs
 * (react-native-view-shot + expo-media-library/expo-sharing) → a custom EAS dev
 * build, so it's off in Expo Go. Text-share works regardless.
 */
export const CERTIFICATE_IMAGE_ENABLED = false;

/** "Focus Lock" — opt-in lock that blocks leaving a running timed activity. */
export const FOCUS_LOCK_ENABLED = true;

/**
 * Habit "buckets" (the Organize screen + bucket assignment everywhere). Retired
 * from the UI — all code stays in place so flipping this back to `true` restores
 * the feature; the BucketsProvider remains mounted harmlessly while it's off.
 */
export const BUCKETS_ENABLED = false;
