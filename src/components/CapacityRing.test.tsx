import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { CapacityRing } from './CapacityRing';
import { ACHIEVEMENT_GOLD, CAPACITY_HEX } from '@/lib/compounding';

function render(node: React.ReactElement): TestRenderer.ReactTestRenderer {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(node);
  });
  return tree;
}

const strokes = (tree: TestRenderer.ReactTestRenderer): string[] =>
  tree.root.findAll((n) => String(n.type) === 'Circle').map((n) => String(n.props.stroke));

describe('CapacityRing', () => {
  it('draws a partial ring in the capacity hue (never gold)', () => {
    const tree = render(<CapacityRing level={40} colorId="teal" />);
    expect(strokes(tree)).toContain(CAPACITY_HEX.teal);
    expect(strokes(tree)).not.toContain(ACHIEVEMENT_GOLD);
    tree.unmount();
  });

  it('uses gold only when the ring is full (100%)', () => {
    const tree = render(<CapacityRing level={100} colorId="violet" />);
    expect(strokes(tree)).toContain(ACHIEVEMENT_GOLD);
    tree.unmount();
  });

  it('renders only the track at level 0', () => {
    const tree = render(<CapacityRing level={0} colorId="violet" />);
    // Track only — no progress arc in the capacity hue.
    expect(strokes(tree)).not.toContain(CAPACITY_HEX.violet);
    tree.unmount();
  });
});
