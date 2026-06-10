# Levellio store assets

Marketing assets for the App Store and Google Play. Everything here is
**self-contained** (HTML/SVG/CSS, no network, no build step) and renders the
**real recreated app art** — the same vector Hero/Wisp/mark used in the app.

## Screenshots (`screenshots/`)

Five framed, device-mockup screenshots with value-prop captions:

| # | Template | Showcases |
|---|----------|-----------|
| 1 | `01-onboarding.html` | Onboarding / hero pick |
| 2 | `02-dashboard.html` | Dashboard with quests + XP |
| 3 | `03-quest-complete.html` | Quest Complete celebration |
| 4 | `04-character.html` | Character / level-up + companion |
| 5 | `05-premium.html` | Settings / Premium surface |

Each template renders at an **exact export size**, chosen by query string:

- **App Store** (default): `1290×2796` (6.7"/6.9")
- **Google Play**: append `?size=play` → `1080×1920`

The device is scaled to fit each frame, so the in-screen UI proportions stay
identical at both sizes. The marketing caption sits on a deep-violet zone for
WCAG-AA-safe white text; the in-device UI uses the app's AA light theme. The
templates are static (no animation), so captures inherently respect
reduced-motion.

### Exporting to PNG

Open `screenshots/index.html` in a browser and capture each full page, **or**
batch with headless Chrome (no repo dependency required):

```bash
# App Store (1290×2796)
chrome --headless --screenshot=01-onboarding.png \
  --window-size=1290,2796 --hide-scrollbars --force-device-scale-factor=1 \
  store/screenshots/01-onboarding.html

# Google Play (1080×1920)
chrome --headless --screenshot=01-onboarding-play.png \
  --window-size=1080,1920 --hide-scrollbars --force-device-scale-factor=1 \
  "store/screenshots/01-onboarding.html?size=play"
```

(Playwright/Puppeteer work too; the page exposes `window.Levellio` and finishes
layout on the `load` event.)

## App icon & splash (`../assets/`)

The app icon, adaptive icon (foreground + background), splash and favicon are
generated from vector source — see the repo `README.md` and
`npm run generate:assets`. Both PNG outputs and `.svg` sources live in
`../assets/`.

## Keeping art in sync

`screenshots/art.js` ports the geometry from `src/components/HeroAvatar.tsx`,
`src/components/Wisp.tsx` and `src/tools/icon`. `screenshots/templates.test.ts`
executes the templates in a DOM stub to guard rendering and the ported art.
