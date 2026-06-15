import { FOCUS_QUOTES, pickFocusQuote } from './focusQuotes';

describe('pickFocusQuote', () => {
  it('returns a quote for any seed (deterministic, in range)', () => {
    for (const seed of [0, 1, 7, 42, 999]) {
      expect(FOCUS_QUOTES).toContain(pickFocusQuote(seed));
    }
  });

  it('is stable for the same seed', () => {
    expect(pickFocusQuote(13)).toBe(pickFocusQuote(13));
  });

  it('handles negative / fractional seeds without crashing', () => {
    expect(FOCUS_QUOTES).toContain(pickFocusQuote(-5));
    expect(FOCUS_QUOTES).toContain(pickFocusQuote(3.7));
  });
});
