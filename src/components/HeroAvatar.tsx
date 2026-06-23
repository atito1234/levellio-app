import React from 'react';
import { useTranslation } from 'react-i18next';
import Svg, {
  Circle,
  ClipPath,
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
import { getKit, type WorldCupKit } from '@/data/worldCupKits';
import { kitOverlay } from '@/components/kitGraphics';
import type { HeroPresentation, HeroTier } from '@/types';

/**
 * Levellio hero — a faithful in-app RECREATION of the concept art, drawn as flat
 * vector (SVG) in a clean, geometric "Jony Ive" style: filled shapes (no outline
 * strokes), soft rounded forms, same-hue depth shading, and a soft drop shadow.
 * These are intentionally NOT pixel-identical to the canonical PNG/HTML exports
 * (kept in Google Drive); they scale crisply and need no bundled binaries.
 *
 * One shared silhouette (teal hoodie + navy pants) with per-tier gear and
 * per-presentation hair. Falls back to the Novice/neutral look for unknowns.
 */
const PALETTE = {
  teal: colors.teal,
  tealShade: '#11A98F', // same-hue depth shading
  tealDeep: '#0E8F79',
  navy: '#222A4A',
  navyShade: '#1A2038',
  violet: colors.identity,
  violetShade: '#5A3FD6',
  violetDeep: colors.violetDeep,
  gold: colors.gold,
  goldShade: '#F0A02A',
  skin: '#F0C9A8',
  skinShade: '#E3B594',
  hair: '#222A4A',
  white: '#FFFFFF',
  shadow: '#1B1B2A',
} as const;

const TIERS: readonly HeroTier[] = ['novice', 'pathfinder', 'luminary'];
const PRESENTATIONS: readonly HeroPresentation[] = ['female', 'male', 'neutral'];

/** English fallbacks used when i18n is not yet initialized (e.g. in tests). */
const TIER_LABEL: Record<HeroTier, string> = {
  novice: 'Novice',
  pathfinder: 'Pathfinder',
  luminary: 'Luminary',
};

const PRESENTATION_LABEL: Record<HeroPresentation, string> = {
  female: 'Female',
  male: 'Male',
  neutral: 'Neutral',
};

interface HeroAvatarProps {
  presentation: HeroPresentation;
  tier: HeroTier;
  /** Optional World Cup nation kit id; renders on the torso + sleeves. */
  kitId?: string;
  size?: number;
}

export function HeroAvatar({ presentation, tier, kitId, size = 160 }: HeroAvatarProps) {
  const { t } = useTranslation('charts');
  const safeTier: HeroTier = TIERS.includes(tier) ? tier : 'novice';
  const kit = getKit(kitId);
  const safePresentation: HeroPresentation = PRESENTATIONS.includes(presentation)
    ? presentation
    : 'neutral';

  const presentationLabel = t(`hero.presentation.${safePresentation}`, {
    defaultValue: PRESENTATION_LABEL[safePresentation],
  });
  const tierLabel = t(`hero.tierLabel.${safeTier}`, { defaultValue: TIER_LABEL[safeTier] });
  const accessibilityLabel = kit
    ? t('hero.labelWithKit', {
        presentation: presentationLabel,
        tier: tierLabel,
        nation: kit.nationName,
        defaultValue: `${presentationLabel} hero, ${tierLabel} tier, ${kit.nationName} kit`,
      })
    : t('hero.label', {
        presentation: presentationLabel,
        tier: tierLabel,
        defaultValue: `${presentationLabel} hero, ${tierLabel} tier`,
      });

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Defs>
        <RadialGradient id="heroAura" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={PALETTE.gold} stopOpacity={0.35} />
          <Stop offset="55%" stopColor={PALETTE.violet} stopOpacity={0.16} />
          <Stop offset="100%" stopColor={PALETTE.violet} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={PALETTE.shadow} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={PALETTE.shadow} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Soft drop shadow on the ground */}
      <Ellipse cx={50} cy={94} rx={24} ry={6} fill="url(#groundShadow)" />

      {/* Luminary aura */}
      {safeTier === 'luminary' && <Circle cx={50} cy={50} r={50} fill="url(#heroAura)" />}

      {/* Cape (pathfinder + luminary) behind the body */}
      {safeTier !== 'novice' && <Cape tier={safeTier} />}

      {/* Arms (soft rounded limbs) — sleeves match the kit when one is chosen */}
      <Arms tier={safeTier} sleeveColor={kit ? kit.primaryColor : PALETTE.teal} />

      {/* Body: classic hoodie, or the selected nation kit */}
      {kit ? <KitBody kit={kit} /> : <Body />}

      {/* Pants + shoes */}
      <Legs />

      {/* Head + hair + face */}
      <Head presentation={safePresentation} tier={safeTier} />

      {/* Tier gear */}
      {safeTier === 'pathfinder' && <PathfinderGear />}
      {safeTier === 'luminary' && <LuminaryGear />}

      {safeTier !== 'novice' && <Sparkles />}
    </Svg>
  );
}

function Body() {
  return (
    <G>
      {/* Hoodie torso (rounded shoulders) */}
      <Path
        d="M33 47 Q33 42 39 42 L61 42 Q67 42 67 47 L67 72 Q67 75 63 75 L37 75 Q34 75 34 72 Z"
        fill={PALETTE.teal}
      />
      {/* Same-hue depth shade down the right side */}
      <Path d="M55 43 L67 47 L67 72 Q67 75 63 75 L55 75 Z" fill={PALETTE.tealShade} />
      {/* Hood collar */}
      <Path d="M44 42 L56 42 L50 49 Z" fill={PALETTE.tealDeep} />
      {/* Front pocket */}
      <Rect x={41} y={59} width={18} height={11} rx={4} fill={PALETTE.tealDeep} />
      {/* Drawstrings as soft filled shapes */}
      <Rect x={45.4} y={47} width={1.8} height={8} rx={0.9} fill={PALETTE.white} />
      <Rect x={52.8} y={47} width={1.8} height={8} rx={0.9} fill={PALETTE.white} />
      <Circle cx={46.3} cy={55.5} r={1.2} fill={PALETTE.white} />
      <Circle cx={53.7} cy={55.5} r={1.2} fill={PALETTE.white} />
    </G>
  );
}

/** Nation kit on the torso: primary base + geometric pattern + accent collar. */
function KitBody({ kit }: { kit: WorldCupKit }) {
  const torso = 'M33 47 Q33 42 39 42 L61 42 Q67 42 67 47 L67 72 Q67 75 63 75 L37 75 Q34 75 34 72 Z';
  return (
    <G>
      <Defs>
        <ClipPath id="kitClip">
          <Path d={torso} />
        </ClipPath>
      </Defs>
      <Path d={torso} fill={kit.primaryColor} />
      <G clipPath="url(#kitClip)">
        {kitOverlay(kit.pattern, kit.secondaryColor, { x: 33, y: 42, w: 34, h: 33 }, 'kb')}
      </G>
      <Path d="M44 42 L56 42 L50 49 Z" fill={kit.accentColor} />
    </G>
  );
}

function Legs() {
  return (
    <G>
      <Rect x={39} y={74} width={9} height={15} rx={4} fill={PALETTE.navy} />
      <Rect x={52} y={74} width={9} height={15} rx={4} fill={PALETTE.navy} />
      {/* same-hue shade */}
      <Rect x={57} y={74} width={4} height={15} rx={2} fill={PALETTE.navyShade} />
      <Ellipse cx={43.5} cy={90} rx={6} ry={3} fill={PALETTE.teal} />
      <Ellipse cx={56.5} cy={90} rx={6} ry={3} fill={PALETTE.teal} />
    </G>
  );
}

function Head({ presentation, tier }: { presentation: HeroPresentation; tier: HeroTier }) {
  return (
    <G>
      {/* Female bob behind head */}
      {presentation === 'female' && (
        <Path d="M34 28 Q34 16 50 16 Q66 16 66 28 L66 42 Q60 38 60 32 L40 32 Q40 38 34 42 Z" fill={PALETTE.hair} />
      )}
      {/* Head + soft chin shade */}
      <Circle cx={50} cy={28} r={13} fill={PALETTE.skin} />
      <Path d="M40 33 Q50 41 60 33 Q57 39 50 39 Q43 39 40 33 Z" fill={PALETTE.skinShade} />
      {/* Hair crown — fuller for neutral, shorter for male */}
      <Path
        d={
          presentation === 'male'
            ? 'M37 27 Q39 16 50 16 Q61 16 63 27 Q57 22 50 22 Q43 22 37 27 Z'
            : 'M36 28 Q37 14 50 14 Q63 14 64 28 Q56 21 50 21 Q44 21 36 28 Z'
        }
        fill={PALETTE.hair}
      />
      {/* Dot eyes + gentle smile */}
      <Circle cx={45.5} cy={29} r={1.8} fill={PALETTE.navyShade} />
      <Circle cx={54.5} cy={29} r={1.8} fill={PALETTE.navyShade} />
      <Path d="M45 33 Q50 37 55 33 Q52 35 50 35 Q48 35 45 33 Z" fill={PALETTE.navyShade} />
      {/* Pathfinder headband */}
      {tier === 'pathfinder' && (
        <Path d="M37 22 Q50 18 63 22 L63 25 Q50 21 37 25 Z" fill={PALETTE.violet} />
      )}
    </G>
  );
}

function Arms({ tier, sleeveColor = PALETTE.teal }: { tier: HeroTier; sleeveColor?: string }) {
  const sleeve = { stroke: sleeveColor, strokeWidth: 7, strokeLinecap: 'round' as const, fill: 'none' };
  if (tier === 'pathfinder') {
    return (
      <G>
        <Path d="M35 48 Q26 54 38 66" {...sleeve} />
        <Path d="M65 48 Q74 54 62 66" {...sleeve} />
        <Circle cx={38} cy={66} r={3.2} fill={PALETTE.skin} />
        <Circle cx={62} cy={66} r={3.2} fill={PALETTE.skin} />
      </G>
    );
  }
  if (tier === 'luminary') {
    return (
      <G>
        <Path d="M35 49 Q26 40 22 28" {...sleeve} />
        <Path d="M65 49 Q74 40 78 28" {...sleeve} />
        <Circle cx={22} cy={26} r={3.4} fill={PALETTE.skin} />
        <Circle cx={78} cy={26} r={3.4} fill={PALETTE.skin} />
      </G>
    );
  }
  return (
    <G>
      <Path d="M35 49 Q30 60 33 70" {...sleeve} />
      <Path d="M65 48 Q75 40 78 30" {...sleeve} />
      <Circle cx={33} cy={71} r={3.2} fill={PALETTE.skin} />
      <Circle cx={78.5} cy={28} r={3.4} fill={PALETTE.skin} />
    </G>
  );
}

function Cape({ tier }: { tier: HeroTier }) {
  const luminary = tier === 'luminary';
  return (
    <G>
      {/* Luminary: gold trim as a same-hue layer behind the violet cape (no outline) */}
      {luminary && <Path d="M31 43 Q13 71 26 92 L74 92 Q87 71 69 43 Z" fill={PALETTE.gold} />}
      <Path
        d={luminary ? 'M34 44 Q16 70 28 89 L72 89 Q84 70 66 44 Z' : 'M36 45 Q24 68 33 84 L67 84 Q76 68 64 45 Z'}
        fill={PALETTE.violet}
      />
      {/* Same-hue cape shade */}
      <Path
        d={luminary ? 'M50 45 Q60 70 60 88 L72 89 Q84 70 66 44 Z' : 'M50 45 Q58 67 58 83 L67 84 Q76 68 64 45 Z'}
        fill={PALETTE.violetShade}
        opacity={0.55}
      />
    </G>
  );
}

function PathfinderGear() {
  return (
    <G>
      {/* Gold crossbody satchel strap (filled) + bag */}
      <Polygon points="39,44 42,44 63,70 60,70" fill={PALETTE.gold} />
      <Rect x={59} y={66} width={9} height={7} rx={2.5} fill={PALETTE.gold} />
      <Rect x={59} y={66} width={3} height={7} rx={1.5} fill={PALETTE.goldShade} />
      {/* Gold star badge */}
      <Star cx={50} cy={52} r={3.6} fill={PALETTE.gold} />
    </G>
  );
}

function LuminaryGear() {
  return (
    <G>
      {/* Gold belt */}
      <Rect x={36} y={70} width={28} height={4} rx={2} fill={PALETTE.gold} />
      {/* Gem medallion */}
      <Circle cx={50} cy={54} r={4.8} fill={PALETTE.gold} />
      <Circle cx={50} cy={54} r={2.6} fill={PALETTE.violet} />
      {/* Floating gold laurel (filled leaves, no outline) */}
      <Ellipse cx={43} cy={9} rx={5} ry={2.4} fill={PALETTE.gold} transform="rotate(-28 43 9)" />
      <Ellipse cx={57} cy={9} rx={5} ry={2.4} fill={PALETTE.gold} transform="rotate(28 57 9)" />
      <Circle cx={50} cy={8} r={1.8} fill={PALETTE.goldShade} />
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

/** Four-point sparkle/star (filled). */
function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const p = `${cx},${cy - r} ${cx + r * 0.32},${cy - r * 0.32} ${cx + r},${cy} ${cx + r * 0.32},${cy + r * 0.32} ${cx},${cy + r} ${cx - r * 0.32},${cy + r * 0.32} ${cx - r},${cy} ${cx - r * 0.32},${cy - r * 0.32}`;
  return <Polygon points={p} fill={fill} />;
}
