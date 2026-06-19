import { getSubscriptionService, NO_ENTITLEMENT } from './index';
import { LocalSubscriptionService } from './LocalSubscriptionService';

describe('subscription service (alpha = free, no billing)', () => {
  it('the default service is the local no-op', () => {
    expect(getSubscriptionService().isReal).toBe(false);
  });

  it('reports the free entitlement', async () => {
    expect(await getSubscriptionService().getEntitlement()).toEqual(NO_ENTITLEMENT);
  });

  it('refuses purchases honestly without throwing', async () => {
    const r = await new LocalSubscriptionService().purchase('premium');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unavailable');
    expect(r.entitlements).toEqual(NO_ENTITLEMENT);
  });

  it('treats restore as a no-op too', async () => {
    const r = await new LocalSubscriptionService().restore();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unavailable');
  });
});
