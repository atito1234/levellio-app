/**
 * Plan configuration for the free-vs-premium surface.
 *
 * IMPORTANT: prices and conversion are a separate v2 pass. Final prices are NOT
 * hardcoded — `amount` is null until launch and all copy lives here so v2 can
 * tune wording/pricing without code changes. The free plan is generous forever;
 * premium only adds optional "delight multipliers".
 */
export type PlanId = 'free' | 'premium';

export interface PlanPrice {
  /** null until pricing is finalized in v2. */
  amount: number | null;
  currency: string;
  period: 'forever' | 'month' | 'year';
  /** Display copy; tunable without code changes. */
  label: string;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  tagline: string;
  price: PlanPrice;
  /** Bullet copy of what's included. */
  features: string[];
  ctaLabel: string;
  highlighted?: boolean;
}

export interface MonetizationConfig {
  plans: PlanConfig[];
  /** Honest, non-dark-pattern disclosure shown on the paywall. */
  disclosure: string;
}

export const PLAN_CONFIG: MonetizationConfig = {
  plans: [
    {
      id: 'free',
      name: 'Free',
      tagline: 'Everything you need to build real habits.',
      price: { amount: 0, currency: 'USD', period: 'forever', label: 'Free forever' },
      features: [
        'Create your own quests',
        'Full starter habit library',
        'Streaks & leveling',
        'On-device AI suggestions (private)',
      ],
      ctaLabel: 'Your current plan',
    },
    {
      id: 'premium',
      name: 'Premium',
      tagline: 'Optional delight — never required to succeed.',
      price: { amount: null, currency: 'USD', period: 'month', label: 'Pricing announced at launch' },
      features: [
        'Managed cloud AI (no API key to set up)',
        'Cosmetic themes & avatars',
        'Cloud sync & backup across devices',
      ],
      ctaLabel: 'Unlock Premium',
      highlighted: true,
    },
  ],
  disclosure:
    'The free plan stays fully featured, forever — no ads and no paywalled core features. ' +
    'Premium only adds optional extras.',
};

export function getPlan(id: PlanId): PlanConfig {
  const plan = PLAN_CONFIG.plans.find((p) => p.id === id);
  // Config always contains both plans; fall back to the first defensively.
  return plan ?? PLAN_CONFIG.plans[0]!;
}
