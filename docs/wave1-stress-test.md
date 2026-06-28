# Wave 1 stress test (Feeds + Activities remodel)

Validate on a real iPhone (Expo Go is fine — no dev build needed for Wave 1) and
verify the Firestore audience rules before moving to Wave 2.

Flags live in `src/config/features.ts`: `ACTIVITY_VERIFICATION_ENABLED`,
`CHECKLISTS_ENABLED`, `AUDIENCE_CONTROLS_ENABLED` (all `true`).

## A. Activity integrity (verified vs self-reported)
- [ ] Open a **timed** activity (e.g. "20-minute workout"). Start the timer → the screen stays awake (doesn't dim/lock).
- [ ] Let it run to 0 (or to ≥90%) → completion shows **"✓ Verified"**.
- [ ] Re-do another timed activity and tap **Just Log It** immediately → completion shows **"Self-reported"** (still completes, no fake "verified").
- [ ] Tap **Finish & log** partway (well under 90%) → **Self-reported**; partway ≥90% → **Verified**.
- [ ] Run a **Battle** with 2–3 habits to completion → each verified per its own target; screen stays awake during the battle.
- [ ] Background the app mid-timer, return → timer/keep-awake behave sanely (no crash; lock releases on pause/leave).

## B. Checklists + daily check-out
- [ ] Today → **Checklists** card → create a checklist ("Morning routine").
- [ ] Add 2–3 items; tick them → progress bar + "x/total" update.
- [ ] Tap **Check out** → confetti; streak shows **1-day**. Button becomes **Checked out ✓**.
- [ ] Force-quit + reopen → checklist persists; ticks for a *new day* reset (to simulate: change the device date forward a day, reopen → items unticked, list still there).
- [ ] Check out on a consecutive day → streak increments to **2**.
- [ ] Create a **one-off** (non-recurring) list, check out → it archives (drops off the active list).
- [ ] Switch app language (Settings → Language) to **Español / Français** → checklist UI is fully translated.

## C. Feed privacy & audience  *(needs 2 accounts — A and B)*
- [ ] As A, compose a post → the **audience picker** appears; you must choose (privacy-first "ask each time").
- [ ] Post as **Private** → visible to A only. On B's feed it does **not** appear.
- [ ] Post as **Friends** → on B's feed it appears only if **B follows A** (follow A from B first); a third account C (not following A) must **not** see it.
- [ ] Post as **Public** → visible to everyone.
- [ ] In the composer, tick **"Make this my default"**, post, then open the composer again → that audience is pre-selected. Confirm the same default in **Settings → Privacy → Default audience**, and change it there.
- [ ] Comments: a private/friends post's comments are only visible to people who can see the post.

## D. Safety (block / report)
- [ ] On someone else's post, tap **⋯** → **Block** → their posts (and comments) disappear from your feed everywhere; persists after restart.
- [ ] **⋯ → Report post** → the post hides immediately and you get the acknowledgement.

## E. Firestore audience rules (server-side enforcement)
The client filters too, but the rules are the real gate. Validate **before deploying to prod**.

Option 1 — emulator (safe, no prod data):
- [ ] `firebase emulators:start --only firestore` and exercise reads as A/B/C (or add rules unit tests).

Option 2 — deploy to your Firebase project, then re-run section C on device:
- [ ] After `firebase deploy --only firestore:rules`, confirm B literally cannot read A's private posts (they never arrive), and friends posts arrive only when following.

Watch for: a friends/private post leaking to a non-permitted account = rules bug. Public posts must still load for everyone.

---

## ✅ Next step (reminder)
When Wave 1 passes on device **and** the audience rules are confirmed:
1. Deploy the rules to prod (`firebase deploy --only firestore:rules`) if you tested via emulator.
2. Tell Claude **"start Wave 2"** → A3 (category color-coding + feed filters) and B2a (pedometer/steps via `expo-sensors`). Note: **B2a needs a custom dev build** (EAS) — pedometer isn't in Expo Go — so Wave 2 is where we move off Expo Go.
3. Then Wave 3 (A2 friends graph + B3 friends' progress + C2 social checklists).

If anything fails, note which checkbox + what you saw, and Claude will fix it before Wave 2.
