/**
 * Plan configuration for the upgrade surface.
 *
 * v1.0 BETA STATUS: monetization is intentionally OFF. There is no billing, no
 * charge path, and no purchase is ever initiated. Every working feature is free
 * for beta members. The premium scaffolding is kept (for a future v1.5) but is
 * presented honestly as "coming soon" and advertises NO feature that isn't live
 * today. We never claim cloud sync, accounts, managed/no-key cloud AI, workouts,
 * health integrations, or social features — none of those ship in v1.0.
 *
 * Honesty is enforced by plans.test.ts (forbidden-phrase + no-charge assertions).
 */
export type PlanId = 'free' | 'premium';

/** Master switch. v1.0 ships with charging disabled. Flip in v1.5 with real IAP. */
export const MONETIZATION_ENABLED = false;

export interface PlanPrice {
  /** null until pricing is finalized. Always null while MONETIZATION_ENABLED is false. */
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
  /** Bullet copy of what's included — must describe ONLY shipping features. */
  features: string[];
  /** CTA label. While monetization is off, premium's CTA is non-actionable. */
  ctaLabel: string;
  /** True only when this plan can be purchased right now. */
  purchasable: boolean;
  highlighted?: boolean;
}

export interface MonetizationConfig {
  plans: PlanConfig[];
  /** Honest, non-dark-pattern disclosure shown on the upgrade surface. */
  disclosure: string;
  /** Beta member message shown in place of any purchase flow. */
  betaNotice: string;
}

export const PLAN_CONFIG: MonetizationConfig = {
  plans: [
    {
      id: 'free',
      name: 'Free',
      tagline: 'Everything in the beta — free.',
      price: { amount: 0, currency: 'USD', period: 'forever', label: 'Free' },
      features: [
        'Create your own quests',
        'Full starter habit library',
        'Streaks & leveling',
        'On-device AI suggestions (private, no key)',
        'Bring-your-own-key cloud AI (your key, never ours)',
      ],
      ctaLabel: 'Your current plan',
      purchasable: false,
    },
    {
      id: 'premium',
      name: 'Levellio Plus',
      tagline: 'Founding members get Plus free during the beta.',
      price: { amount: 4.99, currency: 'USD', period: 'month', label: '$4.99 / mo' },
      // Only list perks that actually ship today (honesty gate). Grows as we ship more.
      features: [
        'Premium themes & accent colors',
        'Founder badge & profile flair',
        'AI Coach for your dragons & blockers',
        'Forecast insights & predictions',
        'Create unlimited community projects',
        'A share of Plus funds the Fort-Liberté projects',
        'More founder perks on the way',
      ],
      ctaLabel: "You're a founding member",
      purchasable: false,
      highlighted: true,
    },
  ],
  disclosure:
    'Levellio is completely free during the beta. There is no payment, and the core habit ' +
    'tracking will always be free. Optional extras may arrive in a future update — and we will ' +
    'never charge you without asking first.',
  betaNotice:
    "You're an early beta member 💜 Premium isn't available yet — there's nothing to buy, and " +
    'no payment will ever start here. Enjoy everything for free while we build.',
};

export function getPlan(id: PlanId): PlanConfig {
  const plan = PLAN_CONFIG.plans.find((p) => p.id === id);
  // Config always contains both plans; fall back to the first defensively.
  return plan ?? PLAN_CONFIG.plans[0]!;
}

/** True only if a real, charging purchase can be initiated. Always false in v1.0. */
export function canInitiatePurchase(): boolean {
  return MONETIZATION_ENABLED && PLAN_CONFIG.plans.some((p) => p.purchasable);
}
