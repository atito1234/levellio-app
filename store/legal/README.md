# Levellio — legal documents

This folder holds Levellio's **Privacy Policy** and **Terms of Service**.

- `privacy-policy.md` / `terms-of-service.md` — canonical Markdown sources.
- `privacy-policy.html` / `terms-of-service.html` — self-contained, printable
  HTML, **generated** from the Markdown via `npm run generate:listing`
  (do not edit the HTML by hand).

## ⚠️ Template — not legal advice

These documents are a careful **starting template** that reflects how the app
actually works today (local-first storage; optional bring-your-own-key AI; no
analytics/ads; stubbed cloud features that are not active). They are **not legal
advice**. The app owner is responsible for having them reviewed by a qualified
professional and for keeping them accurate as the product changes.

## Placeholder checklist (fill before publishing)

Replace every occurrence in **both** documents:

- [ ] `[APP-OWNER]` — your developer / legal entity name (must match the app
      store listing's seller/developer name).
- [ ] `[YOUR-CONTACT-EMAIL]` — a monitored support/privacy contact address.
- [ ] `[EFFECTIVE-DATE]` — the date you publish (e.g., `June 10, 2026`).
- [ ] `[YOUR-JURISDICTION]` — governing law / venue (Terms §13), e.g. a country
      or US state.

Then:

- [ ] Re-run `npm run generate:listing` to refresh the HTML.
- [ ] Host both documents at public URLs (a Privacy Policy URL is **required**
      in App Store Connect and Google Play; a Terms URL is recommended).
- [ ] Re-confirm accuracy if you later enable accounts, cloud sync, paid plans,
      analytics, or any health-data integration — update the docs **and** the
      store data-safety / privacy-label answers before those features ship.
