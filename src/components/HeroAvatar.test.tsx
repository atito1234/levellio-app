import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { HeroAvatar } from './HeroAvatar';
import type { HeroPresentation, HeroTier } from '@/types';

const TIERS: HeroTier[] = ['novice', 'pathfinder', 'luminary'];
const PRESENTATIONS: HeroPresentation[] = ['female', 'male', 'neutral'];

function render(node: React.ReactElement): TestRenderer.ReactTestRenderer {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(node);
  });
  return tree;
}

describe('HeroAvatar (SVG)', () => {
  it('renders every tier × presentation with an image accessibility label', () => {
    for (const tier of TIERS) {
      for (const presentation of PRESENTATIONS) {
        const tree = render(<HeroAvatar presentation={presentation} tier={tier} size={120} />);
        const svg = tree.root.findByProps({ accessibilityRole: 'image' });
        expect(String(svg.props.accessibilityLabel)).toMatch(/hero/i);
        tree.unmount();
      }
    }
  });

  it('produces a distinct, valid tree per tier (more gear at higher tiers)', () => {
    const novice = render(<HeroAvatar presentation="neutral" tier="novice" size={120} />);
    const luminary = render(<HeroAvatar presentation="neutral" tier="luminary" size={120} />);
    // Luminary adds aura, cape, belt, medallion, laurel -> strictly more nodes.
    const count = (t: TestRenderer.ReactTestRenderer) =>
      t.root.findAll((n) => String(n.type) === 'Path').length;
    expect(count(luminary)).toBeGreaterThan(count(novice));
    novice.unmount();
    luminary.unmount();
  });

  it('renders a selected nation kit (colorway on the torso + nation in the label)', () => {
    const tree = render(<HeroAvatar presentation="male" tier="novice" kitId="kit-bra" size={120} />);
    const svg = tree.root.findByProps({ accessibilityRole: 'image' });
    expect(String(svg.props.accessibilityLabel)).toMatch(/Brazil kit/);
    // Brazil primary (yellow #FFDF00) is painted somewhere on the torso.
    const yellow = tree.root.findAll(
      (n) => typeof n.props?.fill === 'string' && n.props.fill.toUpperCase() === '#FFDF00',
    );
    expect(yellow.length).toBeGreaterThan(0);
    tree.unmount();
  });

  it('ignores an unknown kit id and shows no kit in the label', () => {
    const tree = render(<HeroAvatar presentation="male" tier="novice" kitId="kit-zzz" size={120} />);
    const svg = tree.root.findByProps({ accessibilityRole: 'image' });
    expect(String(svg.props.accessibilityLabel)).not.toMatch(/kit/);
    tree.unmount();
  });

  it('falls back gracefully for unknown tier/presentation', () => {
    const tree = render(
      <HeroAvatar
        presentation={'alien' as unknown as HeroPresentation}
        tier={'mythic' as unknown as HeroTier}
        size={80}
      />,
    );
    const svg = tree.root.findByProps({ accessibilityRole: 'image' });
    expect(String(svg.props.accessibilityLabel)).toMatch(/Novice/);
    tree.unmount();
  });
});
