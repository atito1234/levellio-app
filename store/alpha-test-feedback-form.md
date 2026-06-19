# Alpha feedback — Google Form setup (5 minutes)

This is the **no-login, phone-friendly** capture path for non-technical testers (our Haiti partner).
Form responses land automatically in a Google Sheet that **Clifford** and the host can watch and
copy into the GitHub checklist (`store/alpha-test-checklist.md`, §4).

## Build it
1. Go to **forms.google.com** → **Blank form**. Title: **"Levellio Alpha — Feedback"**.
2. Add the questions below.
3. Top-right **Settings → Responses →** turn **OFF** "Limit to 1 response" and leave "Collect email"
   **off** (so testers need no Google account). Allow file uploads (Google will note uploaders may
   need to sign in to attach files — if that's a problem for the Haiti tester, he uses WhatsApp
   screenshots instead; see the simple guide).
4. **Send → 🔗 link →** shorten and share that link with the testers.
5. **Responses → Link to Sheets** → creates the live results spreadsheet. Share that sheet with
   Clifford (edit) so he can triage.

## Questions to add

1. **Your name** — Short answer.
2. **Where are you?** — Multiple choice: Haiti · Mexico · USA/Host · Other.
3. **Phone** — Multiple choice: iPhone · Android.
4. **Which screen / feature?** — Multiple choice (add "Other"):
   Today · Hero · Feed/Community · Projects · Join a project · Settings · Onboarding · Other.
5. **What happened?** — Multiple choice:
   👍 Works great · ⚠️ Works but looks wrong · ❓ Confusing · 🐞 Broke / froze / crashed · 💡 Idea.
6. **Tell us more** — Paragraph. ("What did you tap? What did you expect vs. what happened?")
7. **Screenshot / photo (optional)** — File upload (images), allow multiple.
8. **How often does it happen?** — Multiple choice: Always · Sometimes · Just once.

## Workflow
- **Haiti tester:** uses the app → submits this form (or sends WhatsApp screenshots).
- **Clifford (test coordinator):** watches the linked Sheet + WhatsApp, reproduces issues, and logs
  confirmed ones into `store/alpha-test-checklist.md` §4 / opens GitHub issues.
- **Host:** runs the build, triages with Clifford, assigns fixes.
