/**
 * Lightweight Jest mock for react-native-svg so SVG components can be rendered
 * with react-test-renderer in the Node test environment. Each export is a host
 * element that passes props straight through (so accessibility props remain
 * assertable in the rendered tree).
 */
import React from 'react';

type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

function host(name: string) {
  const Component = ({ children, ...props }: AnyProps) =>
    React.createElement(name, props, children as React.ReactNode);
  Component.displayName = name;
  return Component;
}

export const Svg = host('Svg');
export default Svg;
export const G = host('G');
export const Path = host('Path');
export const Circle = host('Circle');
export const Ellipse = host('Ellipse');
export const Rect = host('Rect');
export const Polygon = host('Polygon');
export const Line = host('Line');
export const Defs = host('Defs');
export const RadialGradient = host('RadialGradient');
export const LinearGradient = host('LinearGradient');
export const Stop = host('Stop');
