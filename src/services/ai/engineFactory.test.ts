import { buildEngine } from './engineFactory';
import { OnDeviceAdapter } from './OnDeviceAdapter';
import { GeminiAdapter } from './GeminiAdapter';
import { BYOKeyAdapter } from './BYOKeyAdapter';

const deps = { getApiKey: async () => 'key' };

describe('buildEngine', () => {
  it('builds the private on-device engine', () => {
    const engine = buildEngine({ aiMode: 'on-device', provider: 'gemini' }, deps);
    expect(engine).toBeInstanceOf(OnDeviceAdapter);
    expect(engine.isPrivate).toBe(true);
  });

  it('builds the Gemini engine for cloud + gemini', () => {
    const engine = buildEngine({ aiMode: 'cloud', provider: 'gemini' }, deps);
    expect(engine).toBeInstanceOf(GeminiAdapter);
    expect(engine.id).toBe('gemini');
    expect(engine.label).toContain('your own key');
  });

  it('builds the BYO engine for cloud + openai/anthropic', () => {
    expect(buildEngine({ aiMode: 'cloud', provider: 'openai' }, deps)).toBeInstanceOf(BYOKeyAdapter);
    expect(buildEngine({ aiMode: 'cloud', provider: 'anthropic' }, deps)).toBeInstanceOf(
      BYOKeyAdapter,
    );
  });
});
