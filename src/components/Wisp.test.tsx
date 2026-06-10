import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Wisp } from './Wisp';
import type { CompanionStage } from '@/types';

const STAGES: CompanionStage[] = ['spark', 'ember', 'phoenixling'];

function render(node: React.ReactElement): TestRenderer.ReactTestRenderer {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(node);
  });
  return tree;
}

describe('Wisp (SVG)', () => {
  it('renders every stage with a companion accessibility label', () => {
    for (const stage of STAGES) {
      const tree = render(<Wisp stage={stage} size={80} />);
      const svg = tree.root.findByProps({ accessibilityRole: 'image' });
      expect(String(svg.props.accessibilityLabel)).toMatch(/Wisp companion/i);
      tree.unmount();
    }
  });

  it('gains visual elements as it evolves (phoenixling has the most)', () => {
    const spark = render(<Wisp stage="spark" size={80} />);
    const phoenix = render(<Wisp stage="phoenixling" size={80} />);
    const paths = (t: TestRenderer.ReactTestRenderer) =>
      t.root.findAll((n) => String(n.type) === 'Path').length;
    expect(paths(phoenix)).toBeGreaterThan(paths(spark));
    spark.unmount();
    phoenix.unmount();
  });

  it('falls back to Spark for an unknown stage', () => {
    const tree = render(<Wisp stage={'mythic' as unknown as CompanionStage} size={64} />);
    const svg = tree.root.findByProps({ accessibilityRole: 'image' });
    expect(String(svg.props.accessibilityLabel)).toMatch(/Spark/);
    tree.unmount();
  });
});
