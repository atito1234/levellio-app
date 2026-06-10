import { OnDeviceAdapter } from './OnDeviceAdapter';

describe('OnDeviceAdapter privacy contract', () => {
  it('is marked private', () => {
    expect(new OnDeviceAdapter().isPrivate).toBe(true);
  });

  it('produces suggestions without any network call', async () => {
    const fetchSpy = jest.fn();
    const original = (globalThis as { fetch?: unknown }).fetch;
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;
    try {
      const adapter = new OnDeviceAdapter();
      const suggestions = await adapter.suggestQuests({ goal: 'sleep better' });
      expect(suggestions.length).toBeGreaterThan(0);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      (globalThis as { fetch?: unknown }).fetch = original;
    }
  });

  it('works fully offline for motivational copy', async () => {
    const adapter = new OnDeviceAdapter();
    const line = await adapter.motivate({ streakDays: 3, level: 2 });
    expect(typeof line).toBe('string');
    expect(line.length).toBeGreaterThan(0);
  });
});
