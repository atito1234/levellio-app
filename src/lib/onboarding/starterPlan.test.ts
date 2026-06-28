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

  // --- personalization (follow-ups) ----------------------------------------

  it('leaves the legacy output unchanged when no follow-up detail is given', () => {
    const plan = buildStarterPlan({ focus: ['eat'], habitCount: 3 });
    expect(plan.recommendedRecipeIds).toEqual([]);
    expect(plan.dietaryTag).toBeUndefined();
  });

  it('tailors fit activities by setup (gym vs beginner differ)', () => {
    const gym = buildStarterPlan({ focus: ['fit'], focusDetail: { fit: ['gym'] }, habitCount: 5 });
    const beginner = buildStarterPlan({ focus: ['fit'], focusDetail: { fit: ['beginner'] }, habitCount: 5 });
    expect(gym.habitIds).toContain('fit-gym');
    expect(beginner.habitIds).not.toContain('fit-gym');
    expect(beginner.habitIds).toContain('fit-bodyweight');
  });

  it('seeds plant-protein + vegan recipes for an eat/vegan profile', () => {
    const plan = buildStarterPlan({ focus: ['eat'], focusDetail: { eat: ['vegan'] }, habitCount: 5 });
    expect(plan.habitIds).toContain('health-plant-protein');
    expect(plan.dietaryTag).toBe('vegan');
    expect(plan.recommendedRecipeIds.length).toBeGreaterThan(0);
  });

  it('only recommends recipes when the eat focus is chosen', () => {
    const noEat = buildStarterPlan({ focus: ['fit'], focusDetail: { fit: ['gym'] } });
    expect(noEat.recommendedRecipeIds).toEqual([]);
  });
});
