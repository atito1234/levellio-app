import { getLegalDoc, LEGAL_DOCS } from '@/content/legalContent';

describe('bundled legal content', () => {
  it('bundles both privacy and terms', () => {
    expect(LEGAL_DOCS.map((d) => d.key).sort()).toEqual(['privacy', 'terms']);
    for (const doc of LEGAL_DOCS) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.markdown.length).toBeGreaterThan(200);
    }
  });

  it('has all placeholders filled with the real owner values', () => {
    for (const doc of LEGAL_DOCS) {
      expect(doc.markdown).toContain('Ethix Innova LLC');
      // No leftover [PLACEHOLDER] tokens (the hosted URL placeholder lives only
      // in the store listing config, not in the legal bodies).
      expect(doc.markdown).not.toMatch(/\[[A-Z][A-Z-]+\]/);
    }
  });

  it('terms include the qualitative mission and Texas governing law', () => {
    const terms = getLegalDoc('terms').markdown;
    expect(terms).toContain('Fort Liberté');
    expect(terms).not.toMatch(/\d+\s?%/);
    expect(terms).toContain('State of Texas, USA');
  });

  it('falls back to a valid doc for safety', () => {
    expect(getLegalDoc('privacy').key).toBe('privacy');
  });
});
