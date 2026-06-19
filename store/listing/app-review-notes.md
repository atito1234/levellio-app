# Levellio — App Review notes (paste into App Store Connect + Play Console)

> Generated for store submission. Paste the relevant block into **App Store
> Connect → App Review Information → Notes**, and **Play Console → App content**.

## What Levellio is

Levellio is a **local-first habit tracker / RPG**. Your habits, goals, and
progress are stored **on the device by default** — the core app needs **no
account and no network**. An **optional, free account** unlocks **Community
Projects** (collaborate on shared real-world goals) and a community feed
(posts, comments, reactions, follow). Optional cloud AI uses the user's **own**
API key. No third-party analytics, ads, or tracking SDKs.

## Do you need an account to review the app?

No — the full solo experience works without signing in. To review the
account/community features, either **sign up in-app** (instant, any email) or use
the demo account below.

**Demo account** _(create one in Firebase Auth and fill these in before submitting):_
- Email: `[DEMO_EMAIL]`
- Password: `[DEMO_PASSWORD]`

## How to test account creation + sign-in

1. Open the **Projects** or **Feed** tab → tap **Sign in** → **Create account**.
2. Enter any email + a 6+ character password → you're signed in.

## How to test ACCOUNT DELETION (Apple Guideline 5.1.1(v))

1. Sign in (above).
2. Go to **Settings** (gear tab) → **Account** card.
3. Tap **Delete account** → confirm in the dialog → **enter your password** →
   **Delete forever**.
4. The account and all of the user's community + project data (memberships,
   contributions, posts, comments, reactions, follows) are permanently removed,
   and the app returns to the signed-out state. Signing in again with the old
   credentials fails.

(Sign out is in the same **Settings → Account** card.)

## Privacy / data

- **Authentication:** email/password via Firebase Authentication. No third-party
  / social sign-in, so "Sign in with Apple" does not apply.
- **Cloud data (only when signed in + using community):** Firebase Firestore.
- **Location:** opt-in only (Settings), used to confirm on-site project work.
- **AI:** optional, bring-your-own-key; requests go from the device to the
  provider the user chooses — not to us.
- **Analytics/ads:** none.
- See `store/listing/data-disclosure.md` for the exact App Privacy / Data Safety
  answers, and the hosted Privacy Policy URL.

## Contact

Ethix Innova LLC — doctortitoconsulting@gmail.com
