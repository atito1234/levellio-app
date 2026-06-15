import { DRAGONS, getDragon, pickDragon, CUSTOM_DRAGON_ID } from './dragons';

describe('dragons', () => {
  it('has a well-formed roster with unique ids', () => {
    expect(DRAGONS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(DRAGONS.map((d) => d.id)).size).toBe(DRAGONS.length);
    for (const d of DRAGONS) {
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.taunt.length).toBeGreaterThan(0);
      expect(['violet', 'teal']).toContain(d.colorId);
    }
  });

  it('resolves a known dragon by id', () => {
    expect(getDragon('fear').name).toContain('Fear');
  });

  it('weaves the user name into the custom dragon', () => {
    expect(getDragon(CUSTOM_DRAGON_ID, 'Sugar').name).toBe('the Dragon of Sugar');
    expect(getDragon(CUSTOM_DRAGON_ID, '  Sugar ').victory).toContain('Sugar slain');
  });

  it('falls back to a generic custom dragon when no name given', () => {
    expect(getDragon(CUSTOM_DRAGON_ID).name).toBe('your Dragon');
  });

  it('pickDragon is in range and stable', () => {
    expect(DRAGONS).toContain(pickDragon(0));
    expect(pickDragon(3)).toBe(pickDragon(3));
    expect(DRAGONS).toContain(pickDragon(-7));
  });
});
