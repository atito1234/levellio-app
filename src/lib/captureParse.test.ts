import { parseCapture, MAX_CAPTURE_ITEMS } from './captureParse';

describe('parseCapture', () => {
  it('returns nothing for empty input', () => {
    expect(parseCapture('')).toEqual([]);
    expect(parseCapture('   ')).toEqual([]);
  });

  it('splits a multi-habit capture on commas and "and"', () => {
    const out = parseCapture('walk 20 min, drink water and read 10 pages');
    expect(out.map((h) => h.title)).toEqual(['Walk 20 min', 'Drink water', 'Read 10 pages']);
  });

  it('infers categories from keywords', () => {
    const out = parseCapture('go for a run, call my wife, save $20, meditate');
    const byTitle = Object.fromEntries(out.map((h) => [h.title, h.category]));
    expect(byTitle['Go for a run']).toBe('fitness');
    expect(byTitle['Call my wife']).toBe('relationships');
    expect(byTitle['Save $20']).toBe('finance');
    expect(byTitle['Meditate']).toBe('mind');
  });

  it('extracts a 12-hour clock time and strips it from the title', () => {
    const [h] = parseCapture('drink water at 7pm');
    expect(h!.title).toBe('Drink water');
    expect(h!.scheduledTime).toBe(19 * 60);
  });

  it('handles minutes past the hour', () => {
    expect(parseCapture('stretch at 6:30 am')[0]!.scheduledTime).toBe(6 * 60 + 30);
  });

  it('maps day-part phrases to a time', () => {
    expect(parseCapture('walk after lunch')[0]!.scheduledTime).toBe(13 * 60);
    expect(parseCapture('journal before bed')[0]!.scheduledTime).toBe(22 * 60);
  });

  it('does not mistake a duration for a clock time', () => {
    const [h] = parseCapture('workout 20 min');
    expect(h!.scheduledTime).toBeUndefined();
    expect(h!.difficulty).toBe('medium'); // 20 min → medium
  });

  it('scales difficulty by duration and intensity keywords', () => {
    expect(parseCapture('run 5k')[0]!.difficulty).toBe('hard');
    expect(parseCapture('read 5 min')[0]!.difficulty).toBe('easy');
    expect(parseCapture('deep work 1 hour')[0]!.difficulty).toBe('hard');
  });

  it('keeps negation habits as titles', () => {
    const [h] = parseCapture('no soda');
    expect(h!.title).toBe('No soda');
    expect(h!.category).toBe('health');
  });

  it('dedupes repeated habits within one capture', () => {
    expect(parseCapture('drink water, Drink   Water')).toHaveLength(1);
  });

  it('caps the number of parsed habits', () => {
    const many = Array.from({ length: MAX_CAPTURE_ITEMS + 5 }, (_, i) => `habit ${i}`).join(', ');
    expect(parseCapture(many)).toHaveLength(MAX_CAPTURE_ITEMS);
  });
});
