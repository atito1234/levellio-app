import { containsObjectionable, screenText, normalizeForScreen } from './contentSafety';

describe('contentSafety', () => {
  it('passes ordinary text', () => {
    for (const s of [
      'Drank a glass of water 💧',
      'Cleaned 3 sites for the Port-au-Prince project!',
      'I feel great about my streak',
      'Assistant manager at the clinic', // contains "ass" — must NOT trip
      'I went to Scunthorpe', // classic false-positive guard
      'analysis of my habits this week',
    ]) {
      expect(screenText(s).ok).toBe(true);
      expect(containsObjectionable(s)).toBe(false);
    }
  });

  it('blocks clearly objectionable terms (word-boundary)', () => {
    for (const s of ['you are a retard', 'kill yourself', 'KYS', 'such a slut']) {
      expect(screenText(s).ok).toBe(false);
      expect(screenText(s).reason).toBe('objectionable');
    }
  });

  it('sees through light obfuscation (leetspeak / accents / repeats)', () => {
    expect(containsObjectionable('you r3tard')).toBe(true);
    expect(containsObjectionable('rétard')).toBe(true);
    expect(containsObjectionable('sluuuut')).toBe(true);
  });

  it('normalizes consistently (accents, case, separators, repeats)', () => {
    expect(normalizeForScreen('Héllo  WORLD!!!')).toBe('helo world');
  });

  it('treats empty/whitespace as clean', () => {
    expect(screenText('').ok).toBe(true);
    expect(screenText('   ').ok).toBe(true);
  });
});
