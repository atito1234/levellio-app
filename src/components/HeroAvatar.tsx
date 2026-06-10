import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { colors } from '@/theme';
import type { HeroPresentation, HeroTier } from '@/types';

/**
 * Levellio hero, drawn as flat vector art (SVG) so it scales crisply at any
 * size and needs no bundled binaries. One shared silhouette (teal hoodie + navy
 * pants) with per-tier gear and per-presentation hair. Falls back to the
 * Novice/neutral look for unknown inputs.
 */
const PALETTE = {
  teal: colors.teal,
  tealDark: '#0E9A80',
  navy: '#222A4A',
  navyDark: '#1A2038',
  violet: colors.identity,
  violetDeep: colors.violetDeep,
  gold: colors.gold,
  goldDeep: colors.goldDeep,
  skin: '#E9C6A8',
  hair: '#222A4A',
  white: '#FFFFFF',
} as const;

const TIERS: readonly HeroTier[] = ['novice', 'pathfinder', 'luminary'];
const PRESENTATIONS: readonly HeroPresentation[] = ['female', 'male', 'neutral'];

const TIER_LABEL: Record<HeroTier, string> = {
  novice: 'Novice',
  pathfinder: 'Pathfinder',
  luminary: 'Luminary',
};

interface HeroAvatarProps {
  presentation: HeroPresentation;
  tier: HeroTier;
  size?: number;
}

export function HeroAvatar({ presentation, tier, size = 160 }: HeroAvatarProps) {
  const safeTier: HeroTier = TIERS.includes(tier) ? tier : 'novice';
  const safePresentation: HeroPresentation = PRESENTATIONS.includes(presentation)
    ? presentation
    : 'neutral';

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole="image"
      accessibilityLabel={`${cap(safePresentation)} hero, ${TIER_LABEL[safeTier]} tier`}
    >
      <Defs>
        <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={PALETTE.gold} stopOpacity={0.35} />
          <Stop offset="55%" stopColor={PALETTE.violet} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={PALETTE.violet} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Luminary aura behind everything */}
      {safeTier === 'luminary' && <Circle cx={50} cy={52} r={50} fill="url(#aura)" />}

      {/* Cape (pathfinder + luminary) sits behind the body */}
      {safeTier !== 'novice' && <Cape tier={safeTier} />}

      {/* Arms render behind/around the torso depending on pose */}
      <Arms tier={safeTier} />

      {/* Body: hoodie + pocket + drawstrings */}
      <Body />

      {/* Pants + shoes */}
      <Legs />

      {/* Head + hair + face */}
      <Head presentation={safePresentation} tier={safeTier} />

      {/* Tier gear on top of the torso */}
      {safeTier === 'pathfinder' && <PathfinderGear />}
      {safeTier === 'luminary' && <LuminaryGear />}

      {/* Sparkles for the upper tiers */}
      {safeTier !== 'novice' && <Sparkles />}
    </Svg>
  );
}

function Body() {
  return (
    <G>
      {/* Hoodie torso with raised shoulders */}
      <Path
        d="M33 47 Q33 42 39 42 L61 42 Q67 42 67 47 L67 72 Q67 75 63 75 L37 75 Q33 75 33 72 Z"
        fill={PALETTE.teal}
      />
      {/* Hood collar */}
      <Path d="M44 42 L56 42 L50 49 Z" fill={PALETTE.tealDark} />
      {/* Front pocket */}
      <Rect x={41} y={59} width={18} height={11} rx={3} fill={PALETTE.tealDark} />
      {/* Drawstrings */}
      <Path d="M47 47 L46 55" stroke={PALETTE.white} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M53 47 L54 55" stroke={PALETTE.white} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={46} cy={55.5} r={1.1} fill={PALETTE.white} />
      <Circle cx={54} cy={55.5} r={1.1} fill={PALETTE.white} />
    </G>
  );
}

function Legs() {
  return (
    <G>
      <Rect x={39} y={74} width={9} height={15} rx={3} fill={PALETTE.navy} />
      <Rect x={52} y={74} width={9} height={15} rx={3} fill={PALETTE.navy} />
      <Ellipse cx={43.5} cy={90} rx={6} ry={3} fill={PALETTE.teal} />
      <Ellipse cx={56.5} cy={90} rx={6} ry={3} fill={PALETTE.teal} />
    </G>
  );
}

function Head({ presentation, tier }: { presentation: HeroPresentation; tier: HeroTier }) {
  return (
    <G>
      {/* Female bob side panels (behind head) */}
      {presentation === 'female' && (
        <Path d="M34 28 Q34 16 50 16 Q66 16 66 28 L66 42 Q60 38 60 32 L40 32 Q40 38 34 42 Z" fill={PALETTE.hair} />
      )}
      {/* Head */}
      <Circle cx={50} cy={28} r={13} fill={PALETTE.skin} />
      {/* Hair crown — fuller for neutral, shorter for male */}
      <Path
        d={
          presentation === 'male'
            ? 'M37 27 Q39 16 50 16 Q61 16 63 27 Q57 22 50 22 Q43 22 37 27 Z'
            : 'M36 28 Q37 14 50 14 Q63 14 64 28 Q56 21 50 21 Q44 21 36 28 Z'
        }
        fill={PALETTE.hair}
      />
      {/* Eyes */}
      <Circle cx={45.5} cy={29} r={1.7} fill={PALETTE.navyDark} />
      <Circle cx={54.5} cy={29} r={1.7} fill={PALETTE.navyDark} />
      {/* Gentle smile */}
      <Path d="M45 33 Q50 37 55 33" stroke={PALETTE.navyDark} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      {/* Pathfinder violet headband */}
      {tier === 'pathfinder' && (
        <Path d="M37 22 Q50 18 63 22 L63 25 Q50 21 37 25 Z" fill={PALETTE.violet} />
      )}
    </G>
  );
}

function Arms({ tier }: { tier: HeroTier }) {
  const sleeve = { stroke: PALETTE.teal, strokeWidth: 7, strokeLinecap: 'round' as const, fill: 'none' };
  if (tier === 'pathfinder') {
    // Hands on hips: elbows out, hands to waist.
    return (
      <G>
        <Path d="M35 48 Q26 54 38 66" {...sleeve} />
        <Path d="M65 48 Q74 54 62 66" {...sleeve} />
        <Circle cx={38} cy={66} r={3} fill={PALETTE.skin} />
        <Circle cx={62} cy={66} r={3} fill={PALETTE.skin} />
      </G>
    );
  }
  if (tier === 'luminary') {
    // Triumphant: both arms raised.
    return (
      <G>
        <Path d="M35 49 Q26 40 22 28" {...sleeve} />
        <Path d="M65 49 Q74 40 78 28" {...sleeve} />
        <Circle cx={22} cy={26} r={3.2} fill={PALETTE.skin} />
        <Circle cx={78} cy={26} r={3.2} fill={PALETTE.skin} />
      </G>
    );
  }
  // Novice: one arm down, one waving up.
  return (
    <G>
      <Path d="M35 49 Q30 60 33 70" {...sleeve} />
      <Path d="M65 48 Q75 40 78 30" {...sleeve} />
      <Circle cx={33} cy={71} r={3} fill={PALETTE.skin} />
      <Circle cx={78.5} cy={28} r={3.2} fill={PALETTE.skin} />
    </G>
  );
}

function Cape({ tier }: { tier: HeroTier }) {
  const luminary = tier === 'luminary';
  return (
    <G>
      <Path
        d={luminary ? 'M34 44 Q16 70 28 90 L72 90 Q84 70 66 44 Z' : 'M36 45 Q24 68 33 84 L67 84 Q76 68 64 45 Z'}
        fill={PALETTE.violet}
        opacity={0.95}
      />
      {luminary && (
        <Path
          d="M34 44 Q16 70 28 90 L72 90 Q84 70 66 44"
          stroke={PALETTE.gold}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
      )}
    </G>
  );
}

function PathfinderGear() {
  return (
    <G>
      {/* Gold crossbody satchel strap + bag */}
      <Path d="M40 44 L62 70" stroke={PALETTE.gold} strokeWidth={2.6} strokeLinecap="round" />
      <Rect x={59} y={66} width={9} height={7} rx={2} fill={PALETTE.gold} />
      {/* Gold star badge on chest */}
      <Star cx={50} cy={52} r={3.4} fill={PALETTE.gold} />
    </G>
  );
}

function LuminaryGear() {
  return (
    <G>
      {/* Gold belt */}
      <Rect x={36} y={70} width={28} height={4} rx={2} fill={PALETTE.gold} />
      {/* Gem medallion */}
      <Circle cx={50} cy={54} r={4.6} fill={PALETTE.gold} />
      <Circle cx={50} cy={54} r={2.6} fill={PALETTE.violet} />
      {/* Floating gold laurel / halo above head */}
      <Ellipse cx={50} cy={9} rx={11} ry={3.4} fill="none" stroke={PALETTE.gold} strokeWidth={2} />
      <Path d="M40 11 Q44 6 48 9" stroke={PALETTE.goldDeep} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M60 11 Q56 6 52 9" stroke={PALETTE.goldDeep} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Sparkles() {
  return (
    <G>
      <Star cx={20} cy={40} r={2.4} fill={PALETTE.gold} />
      <Star cx={82} cy={52} r={3} fill={PALETTE.gold} />
      <Star cx={76} cy={70} r={2} fill={PALETTE.gold} />
    </G>
  );
}

/** Four-point sparkle/star. */
function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const p = `${cx},${cy - r} ${cx + r * 0.32},${cy - r * 0.32} ${cx + r},${cy} ${cx + r * 0.32},${cy + r * 0.32} ${cx},${cy + r} ${cx - r * 0.32},${cy + r * 0.32} ${cx - r},${cy} ${cx - r * 0.32},${cy - r * 0.32}`;
  return <Polygon points={p} fill={fill} />;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
