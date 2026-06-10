# Levellio — store listing

Copy-paste-ready store metadata. The constrained fields and descriptions are
**generated** from `src/content/storeListing.ts` (the single source of truth) via:

```bash
npm run generate:listing
```

| File | What |
| --- | --- |
| `app-store.md` | Apple App Store fields (name, subtitle, promo, keywords, description) — _generated_ |
| `google-play.md` | Google Play fields (title, short/full description, bullets) — _generated_ |
| `release-notes.md` | "What's new" for v1.0.0 — _generated_ |
| `CHARACTER-COUNTS.md` | Live character-count compliance table — _generated_ |
| `keywords.md` | ASO keyword strategy + placement notes (hand-authored) |
| `data-disclosure.md` | Apple App Privacy + Play Data Safety answers (hand-authored) |

Legal documents (Privacy Policy, Terms) live in `../legal/`.

## Honesty

Listing copy is guarded by `src/content/storeListing.test.ts`, which fails the
build if a field exceeds its store limit **or** if the copy advertises features
that aren't live (cloud sync, accounts, managed cloud AI, health integrations,
social). Keep claims truthful — update the source, regenerate, and the tests
re-verify.

## Before submitting

- Fill the legal placeholders and host the Privacy Policy URL (see
  `../legal/README.md`).
- Confirm the suggested store **categories** and complete the **age/content
  rating** questionnaires.
- Complete the **App Privacy / Data safety** forms per `data-disclosure.md`.
