# Levellio — Alpha Test Checklist (3 testers: You · Mexico · Haiti)

> **App version:** 1.0.0 (beta) · **Branch:** `claude/magical-maxwell-iamycz` (PR #34)
> **Goal of this round:** confirm real, cross-user community works end-to-end (the just-fixed
> invite-code joining is the #1 thing to validate), plus a full sweep of the solo experience.

---

## 0. How to run the test

**Host (You):**
1. `git pull origin claude/magical-maxwell-iamycz` (get the latest).
2. Start the dev server in tunnel mode (so Mexico/Haiti can reach your laptop):
   ```
   npx expo start --tunnel -c
   ```
   `--tunnel` = reachable from other networks/countries · `-c` = clear cache after a code change.
3. Keep this terminal running for the whole session.

**Partners (Mexico & Haiti):**
1. Install **Expo Go** from the App Store / Play Store.
2. Scan the QR from the host's terminal (iPhone: Camera app; Android: scan inside Expo Go).
3. After any host push: fully close the app and re-scan so you get the new bundle.

**Sanity check before testing (everyone):**
- [ ] App opens to onboarding (first run) or Today (returning).
- [ ] Settings / Sign-in screens do **NOT** say "offline mode". (If they do, you're not on the
      shared backend — tell the host; community sync won't work.)
- [ ] Everyone is signed in with a distinct display name.

---

## 1. Tester matrix (roles)

| Code | Tester | Location | Device / OS |
|------|--------|----------|-------------|
| **H** | You (host) | _e.g. USA_ | _fill in_ |
| **MX** | Partner 1 | Mexico | _fill in_ |
| **HT** | Partner 2 | Haiti | _fill in_ |

Cross-user steps below name who acts (e.g. "**MX** posts → **HT** sees → **H** reacts").

---

## 2. Expected-OFF — do NOT log these as bugs

- [ ] **Push notifications** — not built. No alerts will arrive. The "Notify me about world
      milestones" toggle exists but is a stub (won't fire).
- [ ] **Photo / video in feed posts** — turned off (needs Firebase Storage/Blaze). Feed posts are
      text-only. (Battle **journal** entries CAN attach media — that's fine.)
- [ ] **Bulk "Add several at once" / "Add all"** — deactivated for alpha (had an "only adds the last
      one" bug). Add habits **one at a time**.
- [ ] **Payments / premium** — free beta. Paywall shows "coming soon"; there's no purchase button.
- [ ] **Premium cosmetics / cloud sync of solo data** — not in this build.

---

## 3. Checklist by area

> Format: each box is "do X → **expect** Y". Tick it if it matches; if not, log a row in §4.

### A. First run / onboarding
- [ ] Fresh launch → 3 value-prop slides; Continue/Back/Skip work.
- [ ] Hero presentation choice (Female / Male / Neutral) → "Begin your journey".
- [ ] Today shows **3 starter quests** (water / workout / deep-work).
- [ ] Projects tab shows the **5 featured projects** (Malaria, Gardens/Huertos, Clean Water, Waste, School Kits).
- [ ] Relaunch does **not** repeat onboarding.

### B. Today / Dashboard
- [ ] Greeting + streak 🔥 / level pill render.
- [ ] Focus card ring shows "% complete / done of total today".
- [ ] Swipe focus card **left** = next activity; swipe **right** = "do next" (prioritize).
- [ ] "Do it now" → Ripple → complete → **confetti / celebration** plays.
- [ ] Goals strip shows **Your goals** (and **Project goals** row once you've joined a project).
- [ ] "Your community" strip appears (signed in); composer "Share an update…" opens the post screen.
- [ ] (If enabled in Settings) "Around the world" featured-projects strip appears.
- [ ] Quick chips work: 📓 Journal · 📚 Library · 🗂 Buckets · 🔗 Connections · ✨ Suggest.
- [ ] Capacities strip (7-day) → tap a ring → CapacityFocus.
- [ ] "Share completion" after a finish opens the post composer pre-filled.

### C. Hero / Character
- [ ] Avatar matches chosen presentation; tier chip shows Novice/Pathfinder/Luminary.
- [ ] Level + total XP correct; "See your progress" → Progress hub.
- [ ] Wisp companion card shows (Spark/Ember/Phoenixling).
- [ ] "Change kit" → KitSelect → pick a kit → reflects on hero.

### D. Quests / Habits
- [ ] Create a custom quest: title, difficulty (Easy/Med/Hard XP), one of **8 categories**.
- [ ] Set a **time** and a **repeat** (weekdays / Every day) → saves and shows on the right days.
- [ ] Edit an existing quest → Save changes persists.
- [ ] Delete a quest → confirm → gone.
- [ ] Habit **Library** → add a habit (one tap) → shows "✓ Added"; appears on Today.
- [ ] "Contributes to a project" picker appears (signed in + member) and links the habit.
- [ ] _Expected-off:_ no "Add all / add several at once" button.

### E. Goals
- [ ] "+ New goal" → pick a **template** (seeds 3–5 habits) OR build custom (icon, life areas, color).
- [ ] Goal card shows weekly consistency bar + "done/planned today".
- [ ] Tap goal → selects it (focus ring follows); "✎ Edit activities" → GoalFocus.
- [ ] GoalFocus: activities list, mini-calendar heat, add activity.
- [ ] Joining a project **auto-creates a project goal**; its habits live there (not mixed into personal goals).

### F. Schedule / Calendar / Analytics
- [ ] Plan screen: Month/Year toggle; tap a day → that day's plan; toggle a habit on/off for the day.
- [ ] Progress hub: all **5 tabs** load (Overview, Goals, Buckets, Capacities, Habits).
- [ ] Monthly progress heatmap; prev/next month nav; Insights opens.

### G. Battles / Focus / Connections
- [ ] BattleSetup: pick habit(s) + technique + dragon → start.
- [ ] Battle: timer/Pomodoro counts down; pause works; **Victory** screen shows XP + 🪙 coins + confetti.
- [ ] "⚔️ Slay these" appears when a project has 2+ of your habits.
- [ ] Connections map renders; tap an action → highlights the capacities it feeds.

### H. Accounts / Auth
- [ ] Sign up (email + 6+ char password + display name) → signed in.
- [ ] Sign out → community gates behind "Sign in"; sign back in restores.
- [ ] Settings → Account shows your email.
- [ ] **Delete account:** confirm dialog → enter password → "Delete forever" → returns to signed-out;
      old credentials no longer work. _(See I/J for verifying the data purge cross-user.)_

### I. 🔑 Projects — CROSS-USER (primary focus this round)
- [ ] **H**: open a featured project → **Invite** → share the code (e.g. `MALARIA`).
- [ ] **MX/HT**: Projects → **Join with code** → type `MALARIA` — **the letter L types now** → Join →
      lands on the project screen.
- [ ] **H**: project now shows **MEMBERS (2+)** with the partners listed. _(If still MEMBERS (1) after a
      successful join, that's the key bug — log it with details.)_
- [ ] Try all 5 featured codes are typeable: `MALARIA`, `HUERTOS`, `CLEANH2O`, `CLEANUP`, `SCHOOL1`.
- [ ] **MX**: tap **Adopt** on a suggested habit → it appears on MX's Today and is linked to the project.
- [ ] **MX**: complete that habit → choose contribution mode → **H/HT** see it appear in **LIVE ACTIVITY**.
- [ ] Weekly cycle progress bar increases as members contribute; shows "X days left / resets tomorrow".
- [ ] "Share my activity" OFF (at join or in detail) → that member's completions **don't** show in the
      feed but **still count** toward the goal total.
- [ ] "Post an update to your community" from the project → appears in the feed.
- [ ] **Leave project** → removed from members; your habits remain but stop contributing.
- [ ] Per-project calendar (MiniScheduler) shows done/planned days and lets you schedule.
- [ ] After **H** deletes their account (§H), **MX/HT** no longer see H in members or H's posts.

### J. 💬 Community feed / social — CROSS-USER
- [ ] **MX** posts an update → appears in **HT's** and **H's** "For you" tab in real time.
- [ ] "Your network" tab only shows yourself + people you follow.
- [ ] **HT** taps a reaction (👏/🔥/💪/❤️) on MX's post → count updates for everyone; tapping again clears it.
- [ ] **H** comments on MX's post → MX/HT see it in the thread (full threads).
- [ ] **People** screen: **HT** follows **MX** → MX's posts now show in HT's "Your network".
- [ ] **MX** posts an **Ask** ("How do you…?") → **HT** answers and **attaches an adoptable habit** →
      **MX** taps **Adopt** → habit added to MX's Today (linked to the project if the ask was project-scoped).
- [ ] Compose from the **Today** home composer (Facebook-style) works too.

### K. 📍 Location / geofence — CROSS-COUNTRY
- [ ] Settings → "Capture location & speed" OFF by default; toggling ON triggers the OS permission prompt.
- [ ] **Deny** permission → activities still complete normally (never blocked).
- [ ] Completing a **project habit** with a geofence: **MX** (far from a Haiti project) → "From anywhere"
      suggested; **HT** (near it, GPS on) → "📍 On-site" suggested. Either can still pick manually.
- [ ] Slow/no GPS → completion still finishes within a few seconds (no hang).

### L. Settings toggles
- [ ] **Haptic feedback** ON → feel a buzz on completion; OFF → none.
- [ ] **Show World Projects on Today** → the "Around the world" strip appears/disappears.
- [ ] **Prep goals feed project progress** → linking a personal goal to a project goal behaves per the toggle.
- [ ] Metadata-privacy toggles flip without error (all on-device).
- [ ] Hero presentation change reflects on your posts/avatar; partners see the change.

### M. AI
- [ ] On-device "✨ Suggest" works with **no key** and **offline** (instant suggestions).
- [ ] (Optional) add a BYO API key (Gemini/OpenAI/Anthropic) → key hidden after save ("✓ saved").
- [ ] With key but no network → request falls back to default quests (no crash) within ~8s.

### N. Data / offline / persistence
- [ ] Create + complete a quest **offline** → XP/streak update locally.
- [ ] Kill the app and relaunch → all data still there.
- [ ] Settings → **Danger zone**: "Clear schedule", "Clear schedule + repeats", "Delete everything"
      each ask to confirm and do what they say. Cancel leaves data intact. _(Use throwaway data.)_

### O. ⏰ Timezone / day boundary — CROSS-COUNTRY
- [ ] Daily reset happens at **each tester's local midnight** (not UTC, not the host's time): complete a
      quest before midnight → after local midnight it's available again and the streak advances.
- [ ] Weekly project cycle resets on **local Sunday** for each tester.
- [ ] MX and HT see their own day/week boundaries independently.

### P. Resilience
- [ ] Background the app for a while, reopen → no crash; day rolls over correctly if a new day started.
- [ ] Drop Wi-Fi mid-action (post / contribute / complete) → no crash; state stays consistent on reconnect.
- [ ] Deny location and photo permissions → app keeps working.
- [ ] Two testers act on the **same project** at once → both contributions land; totals reconcile.

### Q. Legal / About
- [ ] Settings → About shows "Version 1.0.0 (beta)" and the contact email (opens mail app).
- [ ] Privacy Policy and Terms open and render fully (work offline).

---

## 4. Results log

Add a row per test you run. Tester = H / MX / HT. Result = ✅ / ❌ / ⚠️ (partial).

| Area | Test | Tester | Device / OS | Result | Notes |
|------|------|--------|-------------|--------|-------|
| A | Onboarding + starter data |  |  |  |  |
| B | Today / Dashboard sweep |  |  |  |  |
| C | Hero / Character |  |  |  |  |
| D | Quests / Habits CRUD |  |  |  |  |
| E | Goals |  |  |  |  |
| F | Schedule / Analytics |  |  |  |  |
| G | Battles / Connections |  |  |  |  |
| H | Accounts / delete account |  |  |  |  |
| I | Project join by code (MALARIA) |  |  |  |  |
| I | Members list grows to 2+ |  |  |  |  |
| I | Contribute → LIVE ACTIVITY cross-user |  |  |  |  |
| J | Feed post visible cross-user |  |  |  |  |
| J | Reactions / comments / follow |  |  |  |  |
| J | Ask → answer → adopt habit |  |  |  |  |
| K | Geofence on-site vs from-anywhere |  |  |  |  |
| L | Settings toggles |  |  |  |  |
| M | AI on-device / BYO key |  |  |  |  |
| N | Offline + persistence + danger zone |  |  |  |  |
| O | Local midnight / Sunday reset |  |  |  |  |
| P | Resilience (network/permission) |  |  |  |  |
| Q | Legal / About |  |  |  |  |

---

## 5. Bug report template

Copy this block per bug into the table notes or a new issue:

```
Title:
Area (A–Q):
Tester (H/MX/HT) + device/OS:
Steps to reproduce:
  1.
  2.
Expected:
Actual:
Frequency (always / sometimes):
Screenshot/screen recording:
```

---

_Last updated: 2026-06-19. Built from a full code inventory of the app on
`claude/magical-maxwell-iamycz`._
