# Levellio v1.0 — manual stress-test script

A guided, on-device test pass for the v1.0 **beta**. Work top to bottom and
record a ✅/❌ + note for each step in the **Sign-off** table at the end.

- **Build under test:** Levellio v1.0.0 (beta)
- **Honesty bar:** monetization is OFF; no charge may ever start, and no
  unshipped feature (cloud sync, accounts, managed/no-key cloud AI, workouts,
  health integrations, social) may appear anywhere user-facing.
- **No secrets required.** A BYO AI key is optional and is yours; never commit it.

---

## 0. Prerequisites & how to launch

Requires Node 18+ and the Expo tooling. From the repo root:

```bash
npm install            # install dependencies
```

### Option A — Expo Go (fastest; recommended for this pass)

Levellio's native modules (`react-native-svg`, `expo-secure-store`,
`@react-native-async-storage/async-storage`) are all part of the Expo SDK, so
**Expo Go works** — no custom native build needed.

```bash
npm start              # starts the Metro/Expo dev server, shows a QR code
```

- **iOS:** open the Camera app, scan the QR, open in **Expo Go**.
- **Android:** open **Expo Go** → "Scan QR code".
- Phone and computer must be on the **same Wi-Fi**. If it won't connect, run
  `npx expo start --tunnel`.

### Option B — Native dev build (for release-fidelity testing)

```bash
npx expo run:ios       # requires Xcode (macOS)
npx expo run:android   # requires Android Studio + SDK
```

Or a cloud dev build with EAS (requires an Expo account):

```bash
npx eas build --profile development --platform ios   # or android
```

### Option C — Web smoke test (limited)

```bash
npm run web
```

> Web is for quick layout checks only; `expo-secure-store` (BYO key) is not
> available on web, so test AI key flows on a device.

### Resetting between runs

App data is **local**. To start fresh: delete the app from the device (or clear
Expo Go's data for the project), then relaunch.

---

## 1. Onboarding → hero pick

1. Launch the app fresh (no prior data).
   - **Expect:** Onboarding appears with value-prop content and a hero
     presentation choice (female / male / neutral), each showing the real
     vector hero art.
2. Select a hero and continue.
   - **Expect:** You land on the Dashboard; the chosen hero appears there.

## 2. Create a quest manually (no AI)

1. From the Dashboard, open the quest creator.
2. Try to save with an empty title.
   - **Expect:** Validation blocks save with a clear message; no crash.
3. Enter a title, pick a category and difficulty, save.
   - **Expect:** The new quest appears in today's list with the right category
     icon and an XP value.
4. Edit the quest, then delete a different test quest.
   - **Expect:** Edits persist; deletion removes the row; no orphaned state.

## 3. Use the habit library

1. Open the starter habit library.
   - **Expect:** 38 curated habits across 8 categories (Fitness, Mind,
     Learning, Health, Productivity, Relationships, Creativity, Finance).
2. One-tap add a habit.
   - **Expect:** It becomes a quest on the Dashboard; adding the same one again
     behaves sensibly (no duplicate/no crash).

## 4. Complete a quest → celebration → XP + level up

1. Mark a quest complete.
   - **Expect:** Quest Complete celebration: hero + Wisp, XP count-up, progress
     bar fill, confetti.
2. Complete enough quests to cross a level boundary.
   - **Expect:** A level-up state is shown; the hero tier/Wisp stage reflects
     progress on the Character screen afterward.
3. Complete the **same** quest twice (if possible) / complete across two days.
   - **Expect:** No double-counting in a single day; streak logic increments
     by day, resets after a missed day (see §9 for date-edge testing).

## 5. Open the paywall — confirm honest no-charge beta state

1. Settings → "About Premium (coming soon)" (or the beta banner CTA).
   - **Expect:** The upgrade screen shows **"Premium is coming soon"** and your
     **Free** plan's real features. A "COMING SOON" pill is shown.
   - **Expect:** There is **NO** "Buy", "Subscribe", "Unlock Premium", or price
     button. Nothing initiates a purchase. The only action is **Close**.
   - **Expect:** Nowhere does it claim cloud sync, accounts, managed/no-key
     cloud AI, workouts, or social features.

## 6. Switch AI modes (on-device / BYO key / off)

1. Settings → AI section. Confirm copy says the app is fully usable without AI.
2. Select **On-device**.
   - **Expect:** Helper says it runs privately on-device, no key/network needed.
   - **Expect:** Generating a suggestion works offline (enable Airplane Mode and
     retry — it still returns a suggestion or a graceful fallback, never a crash).
3. Select **Cloud · your key**, choose a provider, leave the key empty.
   - **Expect:** Status shows "No API key set"; the app still works; suggestions
     fall back gracefully.
4. Paste a valid provider key, save.
   - **Expect:** Status shows "✓ API key saved"; the field is secure (obscured).
     Suggestions now use your key. Clear the key → status returns to "not set".
   - **Privacy check:** the key is never shown in logs; it lives only in the
     device keychain.

## 7. Toggle reduced motion

1. Enable the OS "Reduce Motion" setting (iOS: Settings → Accessibility → Motion;
   Android: Settings → Accessibility → Remove animations).
2. Complete a quest.
   - **Expect:** The celebration still conveys the win but **without** confetti
     animation; values snap to final instead of animating. No motion that
     violates the OS preference.

## 8. Open Privacy + Terms from Settings

1. Settings → **About & Legal** → "Privacy Policy".
   - **Expect:** The Privacy Policy opens **in-app** (offline), readable, with
     headings/sections, naming **Ethix Innova LLC** and the contact email.
2. Back, then open "Terms of Service".
   - **Expect:** Terms open in-app; include the **State of Texas** governing law
     and the qualitative mission line (Fort Liberté, Haiti) with no fixed
     percentage and no tax-deduction claim.
3. Tap "Contact support".
   - **Expect:** The mail composer opens to `doctortitoconsulting@gmail.com`.

## 9. Persistence & date edges

1. Force-quit and relaunch.
   - **Expect:** Hero, level, XP, streak, and quests are all restored.
2. (Optional) Change the device date forward one day and reopen.
   - **Expect:** A new day's quests behave correctly; streak logic holds.

## 10. Accessibility pass (screen reader)

1. Enable VoiceOver (iOS) or TalkBack (Android).
2. Sweep each screen.
   - **Expect:** Hero/Wisp art is announced as a labeled image (e.g.,
     "Female hero, Luminary tier"; "Wisp companion: Ember").
   - **Expect:** Buttons announce a role and a meaningful label; the legal rows
     announce "Open the Privacy Policy / Terms of Service"; headings in the
     legal docs are announced as headers.
   - **Expect:** Status pills (API key saved / not set) are announced.
   - **Expect:** Tap targets are reachable and labeled; no unlabeled controls.
3. Contrast: confirm text is legible (the app targets WCAG AA).

---

## Sign-off

| # | Area | Result (✅/❌) | Notes |
| --- | --- | :---: | --- |
| 1 | Onboarding / hero pick | | |
| 2 | Manual quest create/edit/delete | | |
| 3 | Habit library (38 / 8 cats) | | |
| 4 | Complete → celebration → level up | | |
| 5 | Paywall = honest, **no charge** | | |
| 6 | AI modes (on-device / BYO / empty) | | |
| 7 | Reduced motion respected | | |
| 8 | Privacy + Terms open in-app | | |
| 9 | Persistence & date edges | | |
| 10 | Accessibility / screen reader | | |

**Overall verdict:** ☐ Ship beta ☐ Fix-then-ship ☐ Blocked

**Tester:** ______________   **Device / OS:** ______________   **Date:** __________

> Pre-submission reminders (tracked elsewhere, not part of this functional pass):
> host the Privacy Policy URL and set `[HOSTED-PRIVACY-POLICY-URL]`; set real
> bundle identifiers (currently `app.levellio.placeholder`); complete store age
> rating + data-safety/privacy-label forms.
