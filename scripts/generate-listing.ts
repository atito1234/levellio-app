/**
 * Generates Levellio's store-listing Markdown (from src/content/storeListing.ts)
 * and the printable legal HTML (from store/legal/*.md). Pure Node — runs on
 * Node's built-in TypeScript support (Node >= 22), no extra dependency.
 *
 *   npm run generate:listing
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  APPLE,
  checkFieldLengths,
  PLAY,
  RELEASE_NOTES_V1,
} from '../src/content/storeListing.ts';
import { renderHtmlDocument, renderMarkdown } from '../src/content/markdownLite.ts';

const root = process.cwd();
const listingDir = join(root, 'store', 'listing');
const legalDir = join(root, 'store', 'legal');

const GENERATED = '> Generated from source by `npm run generate:listing` — do not edit by hand.\n';

function write(path: string, body: string): void {
  writeFileSync(path, body.endsWith('\n') ? body : body + '\n', 'utf8');
  console.log(`  wrote ${path.replace(root + '/', '')}`);
}

// --- Apple App Store ---
write(
  join(listingDir, 'app-store.md'),
  `# Levellio — Apple App Store listing

${GENERATED}
## App name (≤30)

${APPLE.name}

## Subtitle (≤30)

${APPLE.subtitle}

## Promotional text (≤170)

${APPLE.promotionalText}

## Keywords (≤100 — comma-separated, no spaces)

${APPLE.keywords}

## Description

${APPLE.description}

---

## Also configure in App Store Connect

- **Primary category:** Health & Fitness · **Secondary:** Productivity _(suggested — confirm)_
- **Privacy Policy URL:** host \`store/legal/privacy-policy.html\` and paste the URL _(required)_
- **Support URL / Marketing URL:** [YOUR-URLS]
- **Age rating:** complete the questionnaire (no objectionable content; not directed to children)
- **App Privacy / "Nutrition label":** see \`store/listing/data-disclosure.md\`
`,
);

// --- Google Play ---
write(
  join(listingDir, 'google-play.md'),
  `# Levellio — Google Play listing

${GENERATED}
## Title (≤30)

${PLAY.title}

## Short description (≤80)

${PLAY.shortDescription}

## Full description (≤4000)

${PLAY.fullDescription}

## Feature bullets (for graphics / highlights)

${PLAY.featureBullets.map((b) => `- ${b}`).join('\n')}

---

## Also configure in Play Console

- **Category:** Health & Fitness _(suggested — confirm)_
- **Privacy Policy URL:** host \`store/legal/privacy-policy.html\` and paste the URL _(required)_
- **Data safety form:** see \`store/listing/data-disclosure.md\`
- **Content rating (IARC):** complete the questionnaire
`,
);

// --- Release notes ---
write(
  join(listingDir, 'release-notes.md'),
  `# Levellio — release notes

${GENERATED}
## v1.0.0

${RELEASE_NOTES_V1}
`,
);

// --- Live character-count compliance table ---
const rows = checkFieldLengths()
  .map((r) => `| ${r.label} | ${r.length} | ${r.limit} | ${r.ok ? '✅' : '❌ OVER'} |`)
  .join('\n');
write(
  join(listingDir, 'CHARACTER-COUNTS.md'),
  `# Levellio — store field character counts

${GENERATED}
| Field | Length | Limit | Status |
| --- | ---: | ---: | :---: |
${rows}
`,
);

// --- Legal: Markdown → printable HTML ---
for (const [slug, title] of [
  ['privacy-policy', 'Levellio — Privacy Policy'],
  ['terms-of-service', 'Levellio — Terms of Service'],
] as const) {
  const md = readFileSync(join(legalDir, `${slug}.md`), 'utf8');
  write(join(legalDir, `${slug}.html`), renderHtmlDocument(title, renderMarkdown(md)));
}

const over = checkFieldLengths().filter((r) => !r.ok);
if (over.length > 0) {
  console.error(`\n✖ ${over.length} field(s) exceed their limit.`);
  process.exit(1);
}
console.log('\nAll store fields within limits.');
