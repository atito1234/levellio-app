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

This repo is being built incrementally. **Day 4** delivers the foundation:

- ✅ Expo + TypeScript scaffold with a scalable `src/` structure
- ✅ Strongly-typed design-token / theme module (locked brand palette)
- ✅ React Navigation shell wiring all 5 MVP screens
- ✅ **Onboarding** screen fully built (value-prop slides + hero presentation)
- ✅ Stub interfaces (with TODOs) for the pluggable AI layer and a
  Firebase-ready auth + data layer (local mock implementation)
- ✅ Leveling-math utility (infra for Day 5's Dashboard)

Dashboard, Quest Complete, Character, and Settings/Paywall are runnable
placeholders (Days 5–8).

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
