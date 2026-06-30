# Firebase setup (community + moderation backend)

Levellio runs fully **local/offline by default**. Setting these four env vars turns
on the real, multi-user community (accounts, shared feed, projects, DMs) and makes
reporting/blocking/moderation enforceable. The Firebase JS SDK is lazy-loaded and
Expo-Go-safe — no custom native build is needed for this.

## What you need
- A Firebase project (the **free Spark plan is enough for the beta** — Auth +
  Firestore only; no servers, no Cloud Functions, no billing).

## Steps (~20 min)
1. **Create the project** — https://console.firebase.google.com → *Add project*
   (e.g. `levellio-beta`). Turn **off** Google Analytics (we collect none).
2. **Add a Web app** — click the `</>` icon (we use the JS SDK, *not* the native
   SDKs). Copy the config values: `apiKey`, `authDomain`, `projectId`, `appId`.
3. **Authentication** → *Get started* → enable **Email/Password**. (Enable
   **Anonymous** too if you want try-before-signup.)
4. **Firestore Database** → *Create database* → **Production mode** → choose a region
   near your users (e.g. `nam5` / us-central).
5. **Publish the security rules** — Firestore → *Rules* → paste the contents of
   [`firestore.rules`](./firestore.rules) → *Publish*. (Or, with the Firebase CLI:
   `firebase deploy --only firestore:rules`.)
6. **Make yourself a moderator** — open the app once (signed in) so your account
   exists, then Firebase → *Authentication* → *Users* → copy your **User UID**. In
   Firestore, create a collection **`admins`**, document id = **your uid**, with any
   field (e.g. `role: "owner"`). The in-app moderation console and the rules key off
   this. To ban a user later, the console writes a `bans/{uid}` doc (or add it
   manually) — that immediately strips their ability to post/comment/DM.
7. **Set the env vars** — copy `.env.example` → `.env` and fill in:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...      # e.g. levellio-beta.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   ```
   For EAS builds, add the same as EAS secrets (`eas secret:create`). Restart the
   bundler. The community is now multi-user and reports/blocks/bans are enforced.
8. **Seed the featured projects** (optional) — `node --import tsx scripts/seedProjects.ts`.

## Later (post-beta, needs the Blaze pay-as-you-go plan — not required now)
- **Storage** (photo/video uploads): enable Cloud Storage, publish
  [`storage.rules`](./storage.rules), add `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, and
  flip `MEDIA_UPLOADS_ENABLED`.
- **Cloud Functions** (optional): server push (APNs/FCM), automated moderation
  (auto-eject after N reports, purge expired stories), media scanning.

## How moderation maps to the rules
- `admins/{uid}` → global remove (any post/comment/story/message/profile/project)
  + ban power. Set in the console.
- `bans/{uid}` → that user's `canCreate()` fails everywhere → **ejected** (the 24h
  action lever). Written by admins (or the console).
- `reports/{id}` → any user files; only admins read/resolve. The in-app owner console
  reads this collection directly — no separate server required.
- `projectApplications/{id}` → vetted project-creation requests; admins approve, and
  approved owners moderate their own projects (remove members/contributions).
