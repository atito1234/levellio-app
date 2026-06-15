import { RING_SCIENCE } from './ringScience';
import { findForbiddenPhrases } from '@/content/uiCopy';

describe('ring science copy', () => {
  it('has unique ids and non-empty bodies', () => {
    expect(new Set(RING_SCIENCE.map((c) => c.id)).size).toBe(RING_SCIENCE.length);
    for (const c of RING_SCIENCE) expect(c.body.length).toBeGreaterThan(0);
  });

  it('contains no forbidden user-facing phrases', () => {
    const strings = RING_SCIENCE.flatMap((c) => [c.tag, c.title, c.body]);
    expect(findForbiddenPhrases(strings)).toEqual([]);
  });
});
