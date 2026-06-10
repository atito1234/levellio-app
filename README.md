# Levellio

> Turn your real life into an epic solo RPG. Habits, workouts, and goals become
> quests that level up your character.

Levellio is a mobile RPG habit-tracker. Complete real-life quests, earn XP, and
grow your hero from **Novice → Pathfinder → Luminary** alongside a **Wisp**
companion that evolves **Spark → Ember → Phoenixling**.

**Tech:** React Native + Expo + TypeScript. Free-first, with subscription +
cosmetics monetization layered in later.

---

## Status

This repo is being built incrementally.

**Day 4 — foundation:**

- ✅ Expo + TypeScript scaffold with a scalable `src/` structure
- ✅ Strongly-typed design-token / theme module (locked brand palette)
- ✅ React Navigation shell wiring all 5 MVP screens
- ✅ **Onboarding** screen (value-prop slides + hero presentation choice)
- ✅ Stub interfaces (with TODOs) for the pluggable AI layer and a
  Firebase-ready auth + data layer (local mock implementation)
- ✅ Leveling-math utility

**Day 5 — core gameplay loop:**

- ✅ Game state layer (`GameProvider` / `useGame`) on the mock backend
- ✅ **Dashboard** — today's quests, XP bar, level + streak, complete action
- ✅ **Quest Complete** — signature celebration (XP count-up, bar fill,
  level-up state), reduced-motion aware
- ✅ **Character** — hero variant (female/male/neutral) + Wisp companion,
  level, total XP, tier progression
- ✅ Hero presentation wired end-to-end (Onboarding → Dashboard → Character)
- ✅ Jest + ts-jest test runner; 26 unit tests for the leveling math

**Day 6 — engines, persistence, AI, a11y:**

- ✅ Date-based **streak engine** (`src/lib/gameEngine.ts` + `streak.ts` +
  `dates.ts`): real daily streaks with reset on missed days, same-day
  completions don't double-count, bonus capped at +100%
- ✅ **Local persistence** via AsyncStorage behind `BackendService`
  (`PersistentBackend`) — character, XP, streak, and quests survive restarts;
  schema-versioned with defensive migration
- ✅ **Pluggable AI layer** finalized: Gemini (default) / BYO-key / on-device.
  The on-device adapter holds no network client (privacy contract enforced
  structurally); BYO keys are entered at runtime and stored in the device
  keychain via `expo-secure-store` — never committed
- ✅ **Resilient AI quest generation** with timeout/error/offline → deterministic
  fallback quests
- ✅ **WCAG AA** contrast fixes (buttons + celebration text); reduced-motion
  and a11y labels intact
- ✅ 71 unit tests (leveling, dates, streak, engine, persistence, AI)

**Day 7 — value without AI, BYO-key, auth/sync scaffolding:**

- ✅ **Manual quest creator** (no AI): create/edit/delete with validation
  (`QuestEditor` screen + `questForm`/`questCrud` logic)
- ✅ **Starter habit library** (no AI): 35+ curated habits across 8 categories,
  one-tap add (`HabitLibrary` screen + structured data)
- ✅ **Bring-your-own-key** is the primary cloud path — **no developer-funded
  key**. Settings screen to paste/clear a provider key, stored only in the OS
  keychain. "Gemini (your own key)" relabel.
- ✅ **On-device AI** fully wired as the default (no key, no network)
- ✅ **Firebase auth still stubbed**: `AuthService` + `MockAuthService`;
  **cloud-sync scaffolding** (`SyncService` + `MockSyncService` + pure
  `mergeSnapshots`), no real network
- ✅ Real-shaped **Gemini response parser** (valid key → real quests) with
  graceful fallback to `FALLBACK_QUESTS`
- ✅ 120 unit tests; WCAG AA maintained (incl. darker error red)

The app is fully usable with **zero AI**.

**Day 8 — monetization surface + final polish (Phase 1 complete):**

- ✅ Honest **free-vs-premium Paywall** (no dark patterns) driven by a
  `PLAN_CONFIG` object — **no hardcoded prices** (premium `amount: null`,
  copy/pricing tunable for v2)
- ✅ **Entitlement gating** (`isPremium` flag, default false, no real billing):
  free features never gated; premium gates only managed cloud AI, cosmetics,
  and cloud sync — with unit tests
- ✅ **Cosmetic themes** (premium) + **reactive settings** (`SettingsProvider`)
- ✅ Polished flows: graceful empty/loading states, gated perks, a11y labels,
  reduced-motion preserved
- ✅ 136 unit tests; WCAG AA verified numerically

#### Free vs Premium

| Capability | Free | Premium |
| --- | --- | --- |
| Manual quest creator | ✅ | ✅ |
| Full starter habit library | ✅ | ✅ |
| Streaks & leveling | ✅ | ✅ |
| On-device AI (private) | ✅ | ✅ |
| Bring-your-own-key cloud AI | ✅ | ✅ |
| Managed cloud AI (no key) | — | ✅ |
| Cosmetic themes & avatars | — | ✅ |
| Cloud sync & backup | — | ✅ |

The free tier is generous forever. Premium adds optional "delight multipliers"
only. `isPremium` is a flag with **no real IAP** — the paywall CTA is a clearly
labeled demo toggle. Prices/conversion are a deliberate v2 pass.

**Day 8.5 — art polish (pre-Phase-2):**

- ✅ **Vector hero art** — `HeroAvatar` is now a scalable SVG (`react-native-svg`)
  with all 3 tiers (Novice / Pathfinder / Luminary) and female/male/neutral
  variants, per the concept spec (teal hoodie → violet cape → gold laurel).
- ✅ **Wisp companion** SVG (`Wisp`) across Spark → Ember → Phoenixling.
- ✅ Wired into the Dashboard avatar, the Character screen (current tier + a
  3-tier "journey" row + Wisp), and the Onboarding gender-variant picker.
  Graceful fallback to Novice/Spark for unknown inputs.
- ✅ **Quest Complete** elevated into the signature shareable moment: full-violet
  payoff, hero + Wisp reveal, XP count-up, progress-bar fill, level-up flourish,
  GPU-driven confetti, and a Share action — with a **reduced-motion** static
  fallback (no confetti, values snap to final).
- ✅ 174 unit tests (incl. SVG render tests + reduced-motion fallback); WCAG AA
  verified numerically.

**Day 9 — store assets (Phase 2):**

- ✅ **Production app icon** + adaptive icon (foreground/background), splash and
  favicon, generated from a vector mark and **wired into `app.json`** (closes
  the "app icon not wired" store-review flag).
- ✅ **Dependency-free** generator (`src/tools/icon`, run via
  `npm run generate:assets`): from-scratch PNG encoder + anti-aliased rasterizer
  + SVG writer, all Node built-ins — unit-tested.
- ✅ **Five framed store screenshots** as self-contained HTML/SVG mockups that
  render the real recreated art, sized for App Store + Play, with value-prop
  captions, safe-area framing and AA-safe text (`store/`).

> Art is **faithful in-app recreations** of the concept art, drawn in-code as
> flat geometric SVG (filled shapes, same-hue depth shading, soft drop shadows;
> locked palette). They are intentionally not pixel-identical to the canonical
> PNG/HTML exports (kept in Google Drive). No bundled binaries, no secrets.

### Store assets

The production **app icon, adaptive icon, splash and favicon** are generated
from a vector mark (level-up double chevron, locked palette) with a
dependency-free Node renderer — and are **wired into `app.json`**
(`icon`, `android.adaptiveIcon`, `splash`, `web.favicon`):

```bash
npm run generate:assets   # → assets/*.png + assets/*.svg (sources)
```

Renderer core lives in `src/tools/icon` (pure TS, unit-tested: PNG encoder,
CRC-32, anti-aliased rasterizer, SVG writer). Five **framed store screenshots**
(device mockups rendering the real recreated art, with value-prop captions)
live as self-contained HTML/SVG templates in `store/screenshots`, sized for the
App Store (1290×2796) and Play (1080×1920) — see `store/README.md`.

### Testing

```bash
npm test            # run the unit suite (174 tests)
npm run test:watch  # watch mode
```

Game logic lives in `src/lib` (pure TypeScript) and services in `src/services`,
both shipping with tests. New game logic is expected to add tests alongside it.

### Privacy & secrets

- **On-device AI** makes no network calls — user data never leaves the device.
- **BYO API keys** are entered at runtime and stored only in the OS secure
  store (`expo-secure-store`); they are never logged or committed.
- Non-sensitive game state uses AsyncStorage. No real keys or Firebase config
  live in the repo; the placeholder app id is `app.levellio.placeholder`.

---

## Getting started

Requires Node 18+ and the Expo tooling.

```bash
npm install          # install dependencies
npm start            # start the Expo dev server (then press i / a / w)
npm run typecheck    # strict TypeScript check, no emit
```

Run on a device with the **Expo Go** app, or in an iOS/Android simulator.

### Environment

Copy `.env.example` to `.env` and fill in values as needed. The app runs fully
on **local mock data** with no keys. **Never commit real secrets** — `.env`,
`google-services.json`, and `GoogleService-Info.plist` are git-ignored. Only
`EXPO_PUBLIC_*` vars are exposed to the client bundle.

Placeholder app id (iOS bundle / Android package): `app.levellio.placeholder`.

---

## Architecture

```
App.tsx                  # entry: SafeAreaProvider + RootNavigator
src/
  components/            # reusable UI (PrimaryButton, ScreenContainer)
  navigation/            # RootNavigator, MainTabs, typed route params
  screens/               # one file per screen (Onboarding built; rest placeholder)
  theme/                 # design tokens: colors, spacing, typography, radii, shadows
  services/
    ai/                  # pluggable AI layer (interface + 3 adapters, mock data)
    backend/             # Firebase-ready auth + data (interface + local mock)
  lib/                   # leveling.ts — XP / progression math
  types/                 # shared domain types (Quest, Character, ...)
```

Path alias `@/*` maps to `src/*` (see `tsconfig.json`).

### Design tokens (locked brand palette)

| Token   | Hex       | Meaning              |
| ------- | --------- | -------------------- |
| violet  | `#6C4CF1` | identity / progress  |
| teal    | `#16C8A8` | action / completion  |
| gold    | `#FFB23E` | reward               |

Neutral light surfaces, modern flat illustration style. Import tokens from
`@/theme`. The three brand hues are **locked** — do not change them.

### Pluggable AI layer (`src/services/ai`)

One `AIEngine` interface, three interchangeable adapters:

1. **Gemini** — cloud, default
2. **Bring-your-own-key** — user supplies OpenAI / Anthropic / any key at runtime
3. **On-device** — privacy mode, data never leaves the device

All adapters currently return deterministic **mock data** (no keys / network
required). Real integrations are marked `TODO(day5+)`.

### Backend layer (`src/services/backend`)

A `BackendService` interface (auth + character/quest persistence) with a
`LocalMockBackend` in-memory implementation. **Firebase** is the planned
provider; it will implement the same interface so callers don't change.

### Leveling math (`src/lib/leveling.ts`)

- XP to next level: `100 * level^1.5`
- Quest XP: `20 / 40 / 70` (easy / medium / hard)
- Streak bonus: `+10%` per day, capped at **+100%**

---

## Quality bar

Targets Google Play + Apple App Store: strict TypeScript, no hardcoded
secrets, accessibility-minded components (labels, roles, contrast), and small,
descriptive commits.
