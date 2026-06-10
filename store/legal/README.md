# Levellio — legal documents

This folder holds Levellio's **Privacy Policy** and **Terms of Service**.

- `privacy-policy.md` / `terms-of-service.md` — canonical Markdown sources.
- `privacy-policy.html` / `terms-of-service.html` — self-contained, printable
  HTML, **generated** from the Markdown via `npm run generate:listing`
  (do not edit the HTML by hand).
- The same Markdown is bundled into the app (`src/content/legalContent.ts`,
  generated) and rendered in-app from **Settings → About & Legal**.

## Status (v1.0)

The owner placeholders have been filled with real values:

- **App owner / legal entity:** Ethix Innova LLC
- **Principal:** Antonio Joel Tito, PhD
- **Contact:** doctortitoconsulting@gmail.com
- **Effective date:** June 10, 2026
- **Governing law:** State of Texas, USA

The mission language is intentionally **qualitative** (no fixed percentage, no
named/registered nonprofit, no implied tax-deductibility) and future-tense
(there are no proceeds during the free beta).

## ⚠️ Still required before public launch

- [ ] Host both documents publicly and set **`[HOSTED-PRIVACY-POLICY-URL]`** in
      the store listings (`store/listing/app-store.md`, `google-play.md`). A
      Privacy Policy URL is **required** by App Store Connect and Google Play.
- [ ] These remain a **template prepared in good faith, not legal advice** —
      have them reviewed by a qualified professional before publishing.
- [ ] Re-confirm accuracy (and update the docs **and** the store data-safety /
      privacy-label answers) before activating accounts, cloud features, paid
      plans, analytics, or any health integration.
