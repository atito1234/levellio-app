/**
 * World Cup 2026 nation KITS — original, trademark-safe character customization.
 *
 * IMPORTANT (legal): these are ORIGINAL stylized kits identified by nation +
 * dominant colorway, built from simple geometric color blocks drawn from each
 * nation's flag / sporting colors. They are NOT reproductions of any real,
 * licensed jersey design, crest, sponsor, or manufacturer mark. No FIFA marks,
 * trophy/logo, or federation/club crests are included anywhere.
 *
 * Pure data: each kit is (id, nationName, isoCode, primary/secondary/accent
 * color, pattern, displayOrder) so the set is trivial to edit/extend as the
 * 2026 field is finalized. `isoCode` is the common 3-letter (ISO 3166 / FIFA)
 * country code.
 */

/** Geometric color-block patterns (no logos, no crests). */
export type KitPattern = 'solid' | 'stripes' | 'halves' | 'sash' | 'hoops';

export const KIT_PATTERNS: readonly KitPattern[] = ['solid', 'stripes', 'halves', 'sash', 'hoops'];

export interface WorldCupKit {
  id: string;
  nationName: string;
  isoCode: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pattern: KitPattern;
  displayOrder: number;
}

/** Sentinel for "no kit" (the classic hero hoodie). Not part of the 48. */
export const NO_KIT_ID = 'none';

type RawKit = Omit<WorldCupKit, 'id' | 'displayOrder'>;

// Alphabetical by nation; colorways derived from flags/sporting colors.
const RAW_KITS: readonly RawKit[] = [
  { nationName: 'Algeria', isoCode: 'DZA', primaryColor: '#007A3D', secondaryColor: '#FFFFFF', accentColor: '#D21034', pattern: 'halves' },
  { nationName: 'Argentina', isoCode: 'ARG', primaryColor: '#6CACE4', secondaryColor: '#FFFFFF', accentColor: '#F6B40E', pattern: 'stripes' },
  { nationName: 'Australia', isoCode: 'AUS', primaryColor: '#00843D', secondaryColor: '#FFCD00', accentColor: '#FFFFFF', pattern: 'solid' },
  { nationName: 'Austria', isoCode: 'AUT', primaryColor: '#ED2939', secondaryColor: '#FFFFFF', accentColor: '#1B1B2A', pattern: 'hoops' },
  { nationName: 'Belgium', isoCode: 'BEL', primaryColor: '#E30613', secondaryColor: '#FDDA24', accentColor: '#1B1B2A', pattern: 'solid' },
  { nationName: 'Brazil', isoCode: 'BRA', primaryColor: '#FFDF00', secondaryColor: '#009C3B', accentColor: '#002776', pattern: 'solid' },
  { nationName: 'Cameroon', isoCode: 'CMR', primaryColor: '#007A5E', secondaryColor: '#CE1126', accentColor: '#FCD116', pattern: 'solid' },
  { nationName: 'Canada', isoCode: 'CAN', primaryColor: '#D52B1E', secondaryColor: '#FFFFFF', accentColor: '#1B1B2A', pattern: 'sash' },
  { nationName: 'Colombia', isoCode: 'COL', primaryColor: '#FCD116', secondaryColor: '#003893', accentColor: '#CE1126', pattern: 'hoops' },
  { nationName: 'Costa Rica', isoCode: 'CRI', primaryColor: '#002B7F', secondaryColor: '#CE1126', accentColor: '#FFFFFF', pattern: 'sash' },
  { nationName: 'Croatia', isoCode: 'HRV', primaryColor: '#FF0000', secondaryColor: '#FFFFFF', accentColor: '#171796', pattern: 'hoops' },
  { nationName: 'Denmark', isoCode: 'DNK', primaryColor: '#C60C30', secondaryColor: '#FFFFFF', accentColor: '#FFFFFF', pattern: 'solid' },
  { nationName: 'Ecuador', isoCode: 'ECU', primaryColor: '#FFDD00', secondaryColor: '#034EA2', accentColor: '#ED1C24', pattern: 'sash' },
  { nationName: 'Egypt', isoCode: 'EGY', primaryColor: '#CE1126', secondaryColor: '#FFFFFF', accentColor: '#1B1B2A', pattern: 'solid' },
  { nationName: 'England', isoCode: 'ENG', primaryColor: '#FFFFFF', secondaryColor: '#1D3A8A', accentColor: '#CF142B', pattern: 'solid' },
  { nationName: 'France', isoCode: 'FRA', primaryColor: '#0055A4', secondaryColor: '#FFFFFF', accentColor: '#EF4135', pattern: 'solid' },
  { nationName: 'Germany', isoCode: 'DEU', primaryColor: '#FFFFFF', secondaryColor: '#1B1B2A', accentColor: '#DD0000', pattern: 'solid' },
  { nationName: 'Ghana', isoCode: 'GHA', primaryColor: '#006B3F', secondaryColor: '#FCD116', accentColor: '#CE1126', pattern: 'sash' },
  { nationName: 'Iran', isoCode: 'IRN', primaryColor: '#FFFFFF', secondaryColor: '#239F40', accentColor: '#DA0000', pattern: 'solid' },
  { nationName: 'Iraq', isoCode: 'IRQ', primaryColor: '#007A3D', secondaryColor: '#FFFFFF', accentColor: '#CE1126', pattern: 'solid' },
  { nationName: 'Italy', isoCode: 'ITA', primaryColor: '#0066B2', secondaryColor: '#FFFFFF', accentColor: '#1B458F', pattern: 'solid' },
  { nationName: 'Ivory Coast', isoCode: 'CIV', primaryColor: '#F77F00', secondaryColor: '#FFFFFF', accentColor: '#009E60', pattern: 'halves' },
  { nationName: 'Jamaica', isoCode: 'JAM', primaryColor: '#009B3A', secondaryColor: '#FED100', accentColor: '#1B1B2A', pattern: 'sash' },
  { nationName: 'Japan', isoCode: 'JPN', primaryColor: '#002D74', secondaryColor: '#FFFFFF', accentColor: '#BC002D', pattern: 'solid' },
  { nationName: 'Mexico', isoCode: 'MEX', primaryColor: '#006847', secondaryColor: '#FFFFFF', accentColor: '#CE1126', pattern: 'solid' },
  { nationName: 'Morocco', isoCode: 'MAR', primaryColor: '#C1272D', secondaryColor: '#006233', accentColor: '#FFFFFF', pattern: 'solid' },
  { nationName: 'Netherlands', isoCode: 'NLD', primaryColor: '#EC6B16', secondaryColor: '#FFFFFF', accentColor: '#21468B', pattern: 'solid' },
  { nationName: 'New Zealand', isoCode: 'NZL', primaryColor: '#FFFFFF', secondaryColor: '#1B1B2A', accentColor: '#00247D', pattern: 'solid' },
  { nationName: 'Nigeria', isoCode: 'NGA', primaryColor: '#008751', secondaryColor: '#FFFFFF', accentColor: '#008751', pattern: 'stripes' },
  { nationName: 'Panama', isoCode: 'PAN', primaryColor: '#005293', secondaryColor: '#DA121A', accentColor: '#FFFFFF', pattern: 'halves' },
  { nationName: 'Paraguay', isoCode: 'PRY', primaryColor: '#D52B1E', secondaryColor: '#FFFFFF', accentColor: '#0038A8', pattern: 'stripes' },
  { nationName: 'Poland', isoCode: 'POL', primaryColor: '#FFFFFF', secondaryColor: '#DC143C', accentColor: '#DC143C', pattern: 'halves' },
  { nationName: 'Portugal', isoCode: 'PRT', primaryColor: '#C8102E', secondaryColor: '#006600', accentColor: '#FFE600', pattern: 'solid' },
  { nationName: 'Qatar', isoCode: 'QAT', primaryColor: '#8A1538', secondaryColor: '#FFFFFF', accentColor: '#8A1538', pattern: 'solid' },
  { nationName: 'Saudi Arabia', isoCode: 'SAU', primaryColor: '#006C35', secondaryColor: '#FFFFFF', accentColor: '#006C35', pattern: 'solid' },
  { nationName: 'Senegal', isoCode: 'SEN', primaryColor: '#00853F', secondaryColor: '#FDEF42', accentColor: '#E31B23', pattern: 'sash' },
  { nationName: 'Serbia', isoCode: 'SRB', primaryColor: '#C6363C', secondaryColor: '#0C4076', accentColor: '#FFFFFF', pattern: 'solid' },
  { nationName: 'South Africa', isoCode: 'ZAF', primaryColor: '#007A4D', secondaryColor: '#FFB915', accentColor: '#DE3831', pattern: 'sash' },
  { nationName: 'South Korea', isoCode: 'KOR', primaryColor: '#CD2E3A', secondaryColor: '#FFFFFF', accentColor: '#0047A0', pattern: 'solid' },
  { nationName: 'Spain', isoCode: 'ESP', primaryColor: '#C60B1E', secondaryColor: '#FFC400', accentColor: '#1A237E', pattern: 'solid' },
  { nationName: 'Switzerland', isoCode: 'CHE', primaryColor: '#D52B1E', secondaryColor: '#FFFFFF', accentColor: '#D52B1E', pattern: 'solid' },
  { nationName: 'Tunisia', isoCode: 'TUN', primaryColor: '#E70013', secondaryColor: '#FFFFFF', accentColor: '#E70013', pattern: 'halves' },
  { nationName: 'Turkey', isoCode: 'TUR', primaryColor: '#E30A17', secondaryColor: '#FFFFFF', accentColor: '#E30A17', pattern: 'solid' },
  { nationName: 'Ukraine', isoCode: 'UKR', primaryColor: '#0057B7', secondaryColor: '#FFD700', accentColor: '#FFFFFF', pattern: 'halves' },
  { nationName: 'United States', isoCode: 'USA', primaryColor: '#1A237E', secondaryColor: '#FFFFFF', accentColor: '#B22234', pattern: 'sash' },
  { nationName: 'Uruguay', isoCode: 'URY', primaryColor: '#5CBFEB', secondaryColor: '#FFFFFF', accentColor: '#001489', pattern: 'solid' },
  { nationName: 'Uzbekistan', isoCode: 'UZB', primaryColor: '#0099B5', secondaryColor: '#FFFFFF', accentColor: '#1EB53A', pattern: 'stripes' },
  { nationName: 'Wales', isoCode: 'WAL', primaryColor: '#C8102E', secondaryColor: '#00AD43', accentColor: '#FFFFFF', pattern: 'solid' },
];

/** The 48 World Cup 2026 nation kits, with stable ids + display order. */
export const WORLD_CUP_KITS: readonly WorldCupKit[] = RAW_KITS.map((k, i) => ({
  ...k,
  id: `kit-${k.isoCode.toLowerCase()}`,
  displayOrder: i + 1,
}));

/** Look up a kit by id. Returns null for the "no kit" sentinel / unknown ids. */
export function getKit(id: string | undefined): WorldCupKit | null {
  if (!id || id === NO_KIT_ID) return null;
  return WORLD_CUP_KITS.find((k) => k.id === id) ?? null;
}

/** Whether an id refers to a real kit or the valid "no kit" sentinel. */
export function isValidKitId(id: string): boolean {
  return id === NO_KIT_ID || WORLD_CUP_KITS.some((k) => k.id === id);
}

// --- Accessible color naming (for screen-reader kit descriptions) ----------

const NAMED_COLORS: ReadonlyArray<{ name: string; rgb: [number, number, number] }> = [
  { name: 'white', rgb: [255, 255, 255] },
  { name: 'black', rgb: [20, 20, 30] },
  { name: 'gray', rgb: [128, 128, 128] },
  { name: 'red', rgb: [210, 30, 40] },
  { name: 'maroon', rgb: [128, 20, 50] },
  { name: 'orange', rgb: [240, 130, 20] },
  { name: 'gold', rgb: [250, 205, 20] },
  { name: 'yellow', rgb: [250, 230, 0] },
  { name: 'green', rgb: [0, 130, 70] },
  { name: 'teal', rgb: [0, 150, 160] },
  { name: 'sky blue', rgb: [110, 175, 225] },
  { name: 'blue', rgb: [0, 80, 175] },
  { name: 'navy', rgb: [26, 35, 90] },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Nearest basic color name for a hex value (for accessible labels). */
export function describeColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  let best = NAMED_COLORS[0]!;
  let bestDist = Infinity;
  for (const c of NAMED_COLORS) {
    const d = (r - c.rgb[0]) ** 2 + (g - c.rgb[1]) ** 2 + (b - c.rgb[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best.name;
}

/** Human, screen-reader-friendly colorway, e.g. "Brazil — yellow and green". */
export function kitColorway(kit: WorldCupKit): string {
  return `${kit.nationName} — ${describeColor(kit.primaryColor)} and ${describeColor(kit.secondaryColor)}`;
}
