import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { colors } from '@/theme';
import type { CompanionStage } from '@/types';

/**
 * The Wisp companion — a friendly teardrop flame with big eyes (zero judgement),
 * drawn as scalable SVG. Gains a crest/collar/wing-nubs at Ember and full wings,
 * a crown, a belly gem, and an aura at Phoenixling. Falls back to Spark.
 */
const C = {
  teal: colors.teal,
  tealDark: '#0E9A80',
  violet: colors.identity,
  gold: colors.gold,
  goldDeep: colors.goldDeep,
  navy: '#222A4A',
  white: '#FFFFFF',
} as const;

const STAGES: readonly CompanionStage[] = ['spark', 'ember', 'phoenixling'];
const LABEL: Record<CompanionStage, string> = {
  spark: 'Spark',
  ember: 'Ember',
  phoenixling: 'Phoenixling',
};

interface WispProps {
  stage: CompanionStage;
  size?: number;
}

export function Wisp({ stage, size = 96 }: WispProps) {
  const safe: CompanionStage = STAGES.includes(stage) ? stage : 'spark';

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole="image"
      accessibilityLabel={`Wisp companion: ${LABEL[safe]}`}
    >
      <Defs>
        <RadialGradient id="wispAura" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={C.gold} stopOpacity={0.4} />
          <Stop offset="60%" stopColor={C.violet} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={C.violet} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {safe === 'phoenixling' && <Circle cx={50} cy={52} r={48} fill="url(#wispAura)" />}

      {/* Phoenixling violet wings behind body */}
      {safe === 'phoenixling' && (
        <G>
          <Path d="M38 52 Q12 40 14 66 Q26 64 38 62 Z" fill={C.violet} />
          <Path d="M62 52 Q88 40 86 66 Q74 64 62 62 Z" fill={C.violet} />
        </G>
      )}

      {/* Ember small wing nubs */}
      {safe === 'ember' && (
        <G>
          <Ellipse cx={32} cy={58} rx={7} ry={4} fill={C.tealDark} />
          <Ellipse cx={68} cy={58} rx={7} ry={4} fill={C.tealDark} />
        </G>
      )}

      {/* Teardrop flame body */}
      <Path d="M50 20 C40 36 30 50 50 80 C70 50 60 36 50 20 Z" fill={C.teal} />

      {/* Ember collar */}
      {safe === 'ember' && (
        <Path d="M38 64 Q50 70 62 64" stroke={C.gold} strokeWidth={3} fill="none" strokeLinecap="round" />
      )}

      {/* Ember gold crest on the tip */}
      {safe === 'ember' && <Star cx={50} cy={16} r={4} fill={C.gold} />}

      {/* Phoenixling gold crown */}
      {safe === 'phoenixling' && (
        <Polygon points="40,22 44,14 50,20 56,14 60,22" fill={C.gold} />
      )}

      {/* Phoenixling belly gem */}
      {safe === 'phoenixling' && (
        <G>
          <Circle cx={50} cy={62} r={4.5} fill={C.gold} />
          <Circle cx={50} cy={62} r={2.5} fill={C.violet} />
        </G>
      )}

      {/* Big friendly eyes */}
      <Ellipse cx={43} cy={48} rx={5} ry={6} fill={C.white} />
      <Ellipse cx={57} cy={48} rx={5} ry={6} fill={C.white} />
      <Circle cx={43.5} cy={49} r={2.4} fill={C.navy} />
      <Circle cx={56.5} cy={49} r={2.4} fill={C.navy} />
      <Circle cx={44.4} cy={48} r={0.8} fill={C.white} />
      <Circle cx={57.4} cy={48} r={0.8} fill={C.white} />

      {/* Tiny sparkle (all stages) */}
      <Star cx={72} cy={34} r={2.6} fill={C.gold} />
    </Svg>
  );
}

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const p = `${cx},${cy - r} ${cx + r * 0.32},${cy - r * 0.32} ${cx + r},${cy} ${cx + r * 0.32},${cy + r * 0.32} ${cx},${cy + r} ${cx - r * 0.32},${cy + r * 0.32} ${cx - r},${cy} ${cx - r * 0.32},${cy - r * 0.32}`;
  return <Polygon points={p} fill={fill} />;
}
