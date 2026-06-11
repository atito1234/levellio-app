import {
  describeColor,
  getKit,
  isValidKitId,
  KIT_PATTERNS,
  kitColorway,
  NO_KIT_ID,
  WORLD_CUP_KITS,
  type KitPattern,
} from './worldCupKits';

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe('World Cup 2026 kit set', () => {
  it('has exactly 48 kits (one per nation)', () => {
    expect(WORLD_CUP_KITS).toHaveLength(48);
  });

  it('has unique ids', () => {
    const ids = WORLD_CUP_KITS.map((k) => k.id);
    expect(new Set(ids).size).toBe(48);
  });

  it('has unique ISO codes and nation names', () => {
    expect(new Set(WORLD_CUP_KITS.map((k) => k.isoCode)).size).toBe(48);
    expect(new Set(WORLD_CUP_KITS.map((k) => k.nationName)).size).toBe(48);
  });

  it('uses a stable kit-<iso> id scheme', () => {
    for (const k of WORLD_CUP_KITS) {
      expect(k.id).toBe(`kit-${k.isoCode.toLowerCase()}`);
      expect(k.isoCode).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('has a contiguous, unique 1..48 display order', () => {
    const orders = WORLD_CUP_KITS.map((k) => k.displayOrder).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 48 }, (_, i) => i + 1));
  });

  it('uses valid 6-digit hex colors for every slot', () => {
    for (const k of WORLD_CUP_KITS) {
      expect(k.primaryColor).toMatch(HEX);
      expect(k.secondaryColor).toMatch(HEX);
      expect(k.accentColor).toMatch(HEX);
    }
  });

  it('uses only known geometric patterns (every pattern represented)', () => {
    const used = new Set<KitPattern>();
    for (const k of WORLD_CUP_KITS) {
      expect(KIT_PATTERNS).toContain(k.pattern);
      used.add(k.pattern);
    }
    for (const p of KIT_PATTERNS) expect(used.has(p)).toBe(true);
  });

  it('includes the three 2026 hosts', () => {
    for (const iso of ['USA', 'CAN', 'MEX']) {
      expect(WORLD_CUP_KITS.some((k) => k.isoCode === iso)).toBe(true);
    }
  });
});

describe('kit lookup', () => {
  it('resolves a real kit by id', () => {
    const bra = getKit('kit-bra');
    expect(bra?.nationName).toBe('Brazil');
  });

  it('treats the no-kit sentinel / unknown ids as null', () => {
    expect(getKit(NO_KIT_ID)).toBeNull();
    expect(getKit(undefined)).toBeNull();
    expect(getKit('kit-zzz')).toBeNull();
  });

  it('validates kit ids including the sentinel', () => {
    expect(isValidKitId(NO_KIT_ID)).toBe(true);
    expect(isValidKitId('kit-arg')).toBe(true);
    expect(isValidKitId('nope')).toBe(false);
  });
});

describe('accessible color naming', () => {
  it('maps hex to nearest basic color name', () => {
    expect(describeColor('#FFFFFF')).toBe('white');
    expect(describeColor('#000000')).toBe('black');
    expect(describeColor('#FFDF00')).toBe('yellow');
    expect(describeColor('#009C3B')).toBe('green');
    expect(describeColor('#6CACE4')).toBe('sky blue');
  });

  it('builds a screen-reader colorway label', () => {
    const bra = getKit('kit-bra')!;
    expect(kitColorway(bra)).toBe('Brazil — yellow and green');
  });
});
