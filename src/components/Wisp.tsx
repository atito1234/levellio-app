import React from 'react';
import { useTranslation } from 'react-i18next';
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
 * The Wisp companion — a faithful in-app RECREATION of the concept art, drawn as
 * flat vector (SVG) in a clean geometric style: filled shapes (no outlines),
 * soft rounded forms, same-hue depth shading, and a soft drop shadow. A friendly
 * teardrop flame with big eyes (zero judgement). Not pixel-identical to the
 * canonical exports (kept in Google Drive). Falls back to Spark.
 */
const C = {
  teal: colors.teal,
  tealShade: '#11A98F',
  tealDeep: '#0E8F79',
  violet: colors.identity,
  violetShade: '#5A3FD6',
  gold: colors.gold,
  goldShade: '#F0A02A',
  navy: '#222A4A',
  white: '#FFFFFF',
  shadow: '#1B1B2A',
} as const;

const STAGES: readonly CompanionStage[] = ['spark', 'ember', 'phoenixling'];
/** English fallbacks used when i18n is not yet initialized (e.g. in tests). */
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
  const { t } = useTranslation('charts');
  const safe: CompanionStage = STAGES.includes(stage) ? stage : 'spark';
  const stageLabel = t(`wisp.stage.${safe}`, { defaultValue: LABEL[safe] });

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole="image"
      accessibilityLabel={t('wisp.label', { label: stageLabel, defaultValue: `Wisp companion: ${stageLabel}` })}
    >
      <Defs>
        <RadialGradient id="wispAura" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={C.gold} stopOpacity={0.4} />
          <Stop offset="60%" stopColor={C.violet} stopOpacity={0.16} />
          <Stop offset="100%" stopColor={C.violet} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="wispShadow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={C.shadow} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={C.shadow} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Soft drop shadow */}
      <Ellipse cx={50} cy={88} rx={18} ry={4.5} fill="url(#wispShadow)" />

      {safe === 'phoenixling' && <Circle cx={50} cy={50} r={48} fill="url(#wispAura)" />}

      {/* Phoenixling violet wings behind body */}
      {safe === 'phoenixling' && (
        <G>
          <Path d="M38 52 Q12 40 14 66 Q26 64 38 62 Z" fill={C.violet} />
          <Path d="M62 52 Q88 40 86 66 Q74 64 62 62 Z" fill={C.violet} />
          <Path d="M38 56 Q22 50 18 63 Q28 61 38 60 Z" fill={C.violetShade} opacity={0.6} />
        </G>
      )}

      {/* Ember soft wing nubs */}
      {safe === 'ember' && (
        <G>
          <Ellipse cx={32} cy={58} rx={7} ry={4} fill={C.tealDeep} />
          <Ellipse cx={68} cy={58} rx={7} ry={4} fill={C.tealDeep} />
        </G>
      )}

      {/* Teardrop flame body + same-hue depth shade */}
      <Path d="M50 20 C40 36 30 50 50 80 C70 50 60 36 50 20 Z" fill={C.teal} />
      <Path d="M50 20 C52 38 56 56 50 80 C70 50 60 36 50 20 Z" fill={C.tealShade} />

      {/* Ember collar (filled crescent) + crest */}
      {safe === 'ember' && (
        <>
          <Path d="M38 63 Q50 71 62 63 Q50 67 38 63 Z" fill={C.gold} />
          <Star cx={50} cy={16} r={4} fill={C.gold} />
        </>
      )}

      {/* Phoenixling gold crown + belly gem */}
      {safe === 'phoenixling' && (
        <G>
          <Polygon points="40,22 44,14 50,20 56,14 60,22" fill={C.gold} />
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

      {/* Tiny sparkle */}
      <Star cx={72} cy={34} r={2.6} fill={C.gold} />
    </Svg>
  );
}

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const p = `${cx},${cy - r} ${cx + r * 0.32},${cy - r * 0.32} ${cx + r},${cy} ${cx + r * 0.32},${cy + r * 0.32} ${cx},${cy + r} ${cx - r * 0.32},${cy + r * 0.32} ${cx - r},${cy} ${cx - r * 0.32},${cy - r * 0.32}`;
  return <Polygon points={p} fill={fill} />;
}
