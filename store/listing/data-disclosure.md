# Levellio — data disclosure (App Privacy & Data Safety)

Answers for Apple's **App Privacy** label and Google Play's **Data safety** form,
based on how the app works **today**: local-first storage, no accounts, no
analytics/ads, optional bring-your-own-key AI. Stubbed cloud features are **not
active** and collect nothing.

> ⚠️ Re-answer both forms **before** shipping any release that activates
> accounts, cloud sync, managed cloud AI, analytics, crash reporting, or health
> integrations. Misdeclaring data practices is a common rejection/removal cause.

## Apple — App Privacy

- **Data Not Collected.** The developer does not collect any data from this app.
  - No data is transmitted to a developer-operated server (there isn't one).
  - No analytics, advertising, or tracking SDKs are present.
  - The app does **not** track users across apps/websites (App Tracking
    Transparency is not required).
- **Bring-your-own-key AI note.** If a user enables cloud AI, the request text
  they submit is sent **from their device, using their own key, to a third-party
  AI provider the user chooses** — not to us, and not to a partner we engage.
  This is user-initiated use of their own third-party account. Confirm this
  framing for your configuration; if in doubt, disclose the AI provider category
  conservatively.

## Google Play — Data safety

- **Does your app collect or share any of the required user data types?** No
  data collected; no data shared (by us).
- **Is all data encrypted in transit?** Yes — the only outbound traffic is the
  optional user-initiated AI request, sent over HTTPS to the user's chosen
  provider.
- **Can users request that data be deleted?** Data is stored on-device; users
  delete it by removing items in-app, clearing their AI key in Settings, or
  uninstalling the app. There is no server-side data to delete.
- **Committed to the Play Families policy / directed at children?** No — not
  designed for children.

## Notes for review

- Privacy Policy URL is **required** by both stores — host
  `store/legal/privacy-policy.html` and link it.
- Keep this file, the Privacy Policy, and the live store forms in agreement.
