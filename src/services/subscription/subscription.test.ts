import { getSubscriptionService, FREE_STATE, isPremiumState, entitlementsFromState } from './index';
import { LocalSubscriptionService } from './LocalSubscriptionService';

describe('subscription service (no billing configured = free)', () => {
  it('the default service is the local no-op', () => {
    expect(getSubscriptionService().isReal).toBe(false);
  });

  it('reports the free state', async () => {
    expect(await getSubscriptionService().getState()).toEqual(FREE_STATE);
  });

  it('refuses purchases honestly without throwing', async () => {
    const r = await new LocalSubscriptionService().purchase('plus_annual');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unavailable');
    expect(r.state).toEqual(FREE_STATE);
  });

  it('treats restore as a no-op too', async () => {
    const r = await new LocalSubscriptionService().restore();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unavailable');
  });
});

describe('subscription state helpers', () => {
  it('only trialing/active count as premium', () => {
    expect(isPremiumState({ status: 'free' })).toBe(false);
    expect(isPremiumState({ status: 'expired' })).toBe(false);
    expect(isPremiumState({ status: 'trialing' })).toBe(true);
    expect(isPremiumState({ status: 'active' })).toBe(true);
  });

  it('derives the gate entitlement from state', () => {
    expect(entitlementsFromState({ status: 'free' })).toEqual({ isPremium: false });
    expect(entitlementsFromState({ status: 'active' })).toEqual({ isPremium: true });
  });
});
