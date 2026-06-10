import { COSMETIC_THEMES, DEFAULT_THEME_ID, getTheme } from './cosmetics';

describe('cosmetic themes', () => {
  it('has unique ids', () => {
    const ids = COSMETIC_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('default theme exists and is free', () => {
    const def = getTheme(DEFAULT_THEME_ID);
    expect(def.id).toBe(DEFAULT_THEME_ID);
    expect(def.premium).toBe(false);
  });

  it('offers premium themes', () => {
    expect(COSMETIC_THEMES.some((t) => t.premium)).toBe(true);
  });

  it('uses valid hex accents', () => {
    for (const t of COSMETIC_THEMES) {
      expect(t.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('falls back to the default theme for unknown ids', () => {
    expect(getTheme('does-not-exist').id).toBe(COSMETIC_THEMES[0]?.id);
  });
});
