import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { KitJersey } from './kitGraphics';
import { getKit } from '@/data/worldCupKits';

function render(node: React.ReactElement): TestRenderer.ReactTestRenderer {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(node);
  });
  return tree;
}

describe('KitJersey swatch', () => {
  it('paints the kit primary color and is hidden from screen readers (parent labels it)', () => {
    const kit = getKit('kit-arg')!; // Argentina — sky blue / white
    const tree = render(<KitJersey kit={kit} size={48} />);
    const svg = tree.root.findByType('Svg' as never);
    expect(svg.props.accessibilityElementsHidden).toBe(true);
    const primary = tree.root.findAll(
      (n) => typeof n.props?.fill === 'string' && n.props.fill.toUpperCase() === kit.primaryColor.toUpperCase(),
    );
    expect(primary.length).toBeGreaterThan(0);
    tree.unmount();
  });

  it('renders pattern overlay shapes for a striped kit', () => {
    const kit = getKit('kit-arg')!; // stripes
    const tree = render(<KitJersey kit={kit} size={48} />);
    const rects = tree.root.findAll((n) => String(n.type) === 'Rect');
    expect(rects.length).toBeGreaterThan(0);
    tree.unmount();
  });
});
