# Levellio — data disclosure (App Privacy & Data Safety)

Answers for Apple's **App Privacy** label and Google Play's **Data safety** form.
Levellio is local-first: solo habit data stays on-device. Community features are
**optional** — when a user creates an account and uses Community Projects / the
feed, that data is stored in Google Firebase (Auth + Firestore). No analytics,
ads, or tracking SDKs. No third-party "managed" AI (bring-your-own-key only).

> ⚠️ Keep this file, the Privacy Policy, and the live store forms in agreement.
> Re-answer before shipping any release that adds new data collection (e.g. media
> uploads, push notifications, crash reporting, analytics).

## What is collected (only when the user opts into accounts/community)

| Data type | When | Linked to identity? | Used for tracking? | Purpose |
| --- | --- | --- | --- | --- |
| Email address | On account sign-up (Firebase Auth) | Yes | No | Account / app functionality |
| Name (display name) | On sign-up; shown in projects/feed | Yes | No | App functionality |
| User content (posts, comments, shared habit titles, reactions, contributions) | Using Community Projects / feed | Yes | No | App functionality |
| User ID (uid) + "following" graph | Account + network | Yes | No | App functionality |
| Coarse/precise location | **Optional**, only if the user enables it | Yes | No | App functionality (on-site confirmation) |

Solo habit data (quests, goals, XP, streaks, settings) is stored **on-device** and
not collected by us. The BYO-key AI request text is sent **from the device, using
the user's own key, to the provider the user chooses** — not to us.

## Apple — App Privacy

- **Data Used to Track You:** None. The app does **not** track users across other
  companies' apps/websites (App Tracking Transparency not required).
- **Data Linked to You** (when accounts/community are used): **Contact Info**
  (email, name), **User Content** (posts, comments, shared habit titles, photos
  only if later enabled), **Identifiers** (user ID), **Location** (optional).
  Purpose: **App Functionality**. Not used for advertising or tracking.
- **Data Not Linked to You:** None additional.

## Google Play — Data safety

- **Does your app collect or share user data?** Yes — collected (not shared with
  third parties for their own use). Data is **encrypted in transit** (HTTPS to
  Google Firebase).
- **Data types collected:** Personal info (email, name), Messages/User content
  (posts, comments, shared habit titles, reactions), App activity (in-project
  contributions, following), Device/other IDs (account uid), **Location
  (optional)**. All collected only when the user opts into accounts/community.
- **Is data collection optional?** Yes — the solo app works with no account; all
  account/community/location collection is user-initiated.
- **Can users request that data be deleted?** Yes — in-app: **Settings → Account →
  Delete account** removes the account and the user's community/project data;
  on-device data is cleared via the in-app Danger Zone or by uninstalling.
- **Directed at children?** No.

## Notes for review

- **Privacy Policy URL is required** by both stores — host
  `store/legal/privacy-policy.html` and link it in App Store Connect + Play Console.
- Account deletion is available in-app (Apple Guideline 5.1.1(v)).
