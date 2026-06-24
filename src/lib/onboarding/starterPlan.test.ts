import { buildStarterPlan } from './starterPlan';
import { GOAL_TEMPLATES } from '@/data/goalTemplates';
import { DRAGONS } from '@/data/dragons';

describe('buildStarterPlan', () => {
  it('creates goals from the chosen focus areas', () => {
    const plan = buildStarterPlan({ focus: ['fit', 'calm'] });
    expect(plan.goalKeys).toEqual(['fit', 'calm']);
  });

  it('falls back to a default focus when none/invalid are chosen', () => {
    expect(buildStarterPlan({ focus: [] }).goalKeys).toEqual(['fit']);
    expect(buildStarterPlan({ focus: ['nonsense'] }).goalKeys).toEqual(['fit']);
  });

  it('seeds exactly the requested number of habits (deduped)', () => {
    const three = buildStarterPlan({ focus: ['fit', 'eat'], habitCount: 3 });
    expect(three.habitIds).toHaveLength(3);
    expect(new Set(three.habitIds).size).toBe(3); // no dupes
    const seven = buildStarterPlan({ focus: ['fit', 'eat', 'grow'], habitCount: 7 });
    expect(seven.habitIds.length).toBeLessThanOrEqual(7);
  });

  it('only seeds habits that belong to the chosen templates', () => {
    const plan = buildStarterPlan({ focus: ['grow'], habitCount: 7 });
    const allowed = new Set(GOAL_TEMPLATES.find((t) => t.key === 'grow')!.suggestedHabitIds);
    for (const id of plan.habitIds) expect(allowed.has(id)).toBe(true);
  });

  it('recommends learning projects for a learning focus', () => {
    const plan = buildStarterPlan({ focus: ['grow'] });
    expect(plan.recommendedProjectIds).toContain('proj-school');
  });

  it('recommends health projects for a health/fitness focus', () => {
    const plan = buildStarterPlan({ focus: ['fit'] });
    expect(plan.recommendedProjectIds.length).toBeGreaterThan(0);
    expect(plan.recommendedProjectIds).toContain('proj-water');
  });

  it('always recommends at least one project (fallback)', () => {
    const plan = buildStarterPlan({ focus: ['money'] }); // finance/productivity → no category match
    expect(plan.recommendedProjectIds.length).toBeGreaterThan(0);
    expect(plan.recommendedProjectIds.length).toBeLessThanOrEqual(3);
  });

  it('uses the chosen blocker as the dragon, else a sensible default', () => {
    const valid = DRAGONS[0]!.id;
    expect(buildStarterPlan({ focus: ['fit'], blocker: valid }).dragonId).toBe(valid);
    expect(buildStarterPlan({ focus: ['fit'], blocker: 'bogus' }).dragonId).toBe('procrastination');
  });
});
