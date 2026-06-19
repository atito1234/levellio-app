import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  APP_VERSION,
  CONTACT_EMAIL,
  EFFECTIVE_DATE,
  GOVERNING_LAW,
  LEGAL_LINKS,
  MISSION,
  OWNER,
  PRINCIPAL,
  versionLabel,
} from '@/content/aboutInfo';

const root = process.cwd();
const readJson = (p: string): Record<string, unknown> => JSON.parse(readFileSync(join(root, p), 'utf8'));

describe('app identity', () => {
  it('matches the version in app.json and package.json', () => {
    const appJson = readJson('app.json') as { expo: { version: string } };
    const pkg = readJson('package.json') as { version: string };
    expect(appJson.expo.version).toBe(APP_VERSION);
    expect(pkg.version).toBe(APP_VERSION);
  });

  it('exposes the real owner, principal and contact', () => {
    expect(OWNER).toBe('Ethix Innova LLC');
    expect(PRINCIPAL).toContain('Antonio Joel Tito');
    expect(CONTACT_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    expect(GOVERNING_LAW).toMatch(/Texas/);
    expect(EFFECTIVE_DATE).toBe('June 19, 2026');
  });

  it('renders a version label with the beta channel', () => {
    expect(versionLabel()).toBe('Version 1.0.0 (beta)');
  });
});

describe('mission statement honesty', () => {
  it('stays qualitative: no fixed %, no named nonprofit, no tax-deduction claim', () => {
    const m = MISSION.toLowerCase();
    expect(m).not.toMatch(/\d+\s?%/); // no percentage
    expect(m).not.toContain('percent');
    expect(m).not.toContain('nonprofit');
    expect(m).not.toContain('non-profit');
    expect(m).not.toContain('501(c)');
    expect(m).not.toContain('tax-deduct');
    expect(m).not.toContain('tax deduct');
  });

  it('is future-framed (no proceeds during the free beta)', () => {
    expect(MISSION.toLowerCase()).toMatch(/will support|in the future/);
    expect(MISSION).toContain('Fort Liberté');
  });
});

describe('legal links', () => {
  it('exposes privacy and terms with accessible labels', () => {
    expect(LEGAL_LINKS.map((l) => l.key).sort()).toEqual(['privacy', 'terms']);
    for (const link of LEGAL_LINKS) {
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.a11yLabel.length).toBeGreaterThan(0);
    }
  });
});
