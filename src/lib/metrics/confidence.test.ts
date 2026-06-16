import { confidenceFor, confidenceLabel } from './confidence';

describe('confidenceFor', () => {
  it('maps day counts to low/medium/high (replacing the old time locks)', () => {
    expect(confidenceFor(0)).toBe('low');
    expect(confidenceFor(6)).toBe('low');
    expect(confidenceFor(7)).toBe('medium');
    expect(confidenceFor(20)).toBe('medium');
    expect(confidenceFor(21)).toBe('high');
    expect(confidenceFor(99)).toBe('high');
  });

  it('floors and clamps negative input', () => {
    expect(confidenceFor(-5)).toBe('low');
    expect(confidenceFor(7.9)).toBe('medium');
  });
});

describe('confidenceLabel', () => {
  it('renders an honest chip per level', () => {
    expect(confidenceLabel(1)).toBe('Early · 1 day');
    expect(confidenceLabel(4)).toBe('Early · 4 days');
    expect(confidenceLabel(10)).toBe('Building · 10 days');
    expect(confidenceLabel(30)).toBe('Confident');
  });
});
