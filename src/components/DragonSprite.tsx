import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Line } from 'react-native-svg';

interface DragonSpriteProps {
  colorId: 'violet' | 'teal';
  /** 0-100; lower health dims the dragon slightly. */
  healthPct?: number;
  /** When true, the dragon is defeated (toppled + faded + X eyes). */
  slain?: boolean;
  size?: number;
}

const HUES = {
  violet: { body: '#6C4CF1', shade: '#5A3FD6', belly: '#C9BCFF', wing: '#4A32B0' },
  teal: { body: '#16C8A8', shade: '#11A98F', belly: '#BFF3E8', wing: '#0E8F79' },
};

/**
 * A stylized vector "internal dragon" — the Battle adversary. Flat geometric SVG
 * (same house style as HeroAvatar), no bundled assets. Static by design; the
 * Battle screen wraps it for idle sway / hit-flash. Lower health dims it; the
 * `slain` state topples and fades it with crossed-out eyes.
 */
export function DragonSprite({ colorId, healthPct = 100, slain = false, size = 140 }: DragonSpriteProps) {
  const c = HUES[colorId];
  // Vigor: full at 100% health, dimming toward 0.55 as it weakens.
  const opacity = slain ? 0.4 : 0.55 + (Math.max(0, Math.min(100, healthPct)) / 100) * 0.45;

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <G opacity={opacity} transform={slain ? 'rotate(14 60 70)' : undefined}>
        {/* Wings */}
        <Polygon points="34,46 8,30 18,60" fill={c.wing} />
        <Polygon points="86,46 112,30 102,60" fill={c.wing} />
        {/* Tail */}
        <Path d="M60 92 Q92 96 104 76 L100 88 Q88 104 60 100 Z" fill={c.shade} />
        {/* Body */}
        <Ellipse cx="60" cy="74" rx="30" ry="26" fill={c.body} />
        <Ellipse cx="60" cy="80" rx="18" ry="15" fill={c.belly} />
        {/* Neck + head */}
        <Path d="M48 56 Q60 30 72 56 Z" fill={c.shade} />
        <Ellipse cx="60" cy="40" rx="22" ry="19" fill={c.body} />
        {/* Snout */}
        <Ellipse cx="60" cy="50" rx="12" ry="8" fill={c.shade} />
        <Circle cx="55" cy="50" r="1.6" fill="#1F2937" />
        <Circle cx="65" cy="50" r="1.6" fill="#1F2937" />
        {/* Horns */}
        <Polygon points="46,26 40,10 52,22" fill={c.wing} />
        <Polygon points="74,26 80,10 68,22" fill={c.wing} />
        {/* Eyes */}
        {slain ? (
          <G stroke="#1F2937" strokeWidth={2.4} strokeLinecap="round">
            <Line x1="48" y1="36" x2="55" y2="43" />
            <Line x1="55" y1="36" x2="48" y2="43" />
            <Line x1="65" y1="36" x2="72" y2="43" />
            <Line x1="72" y1="36" x2="65" y2="43" />
          </G>
        ) : (
          <G>
            <Ellipse cx="51" cy="39" rx="5" ry="6" fill="#FFFFFF" />
            <Ellipse cx="69" cy="39" rx="5" ry="6" fill="#FFFFFF" />
            <Circle cx="52" cy="40" r="2.4" fill="#1F2937" />
            <Circle cx="68" cy="40" r="2.4" fill="#1F2937" />
          </G>
        )}
      </G>
    </Svg>
  );
}
