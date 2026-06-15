/**
 * Resilient, premium-gated blocker coaching. Always builds the curated plan first
 * (the guaranteed fallback), then — only when the user is entitled and the engine
 * supports it — tries the AI within a time budget and merges its question/tactic
 * TEXT onto the curated plan. Crucially it KEEPS the curated evidence (honest
 * principle + source), never surfacing an AI-fabricated citation. On timeout,
 * error, empty, opt-out, or free tier it returns curated. Mirrors questGenerator.
 */
import { AITimeoutError } from './errors';
import { buildCoaching, type CoachingContext, type CoachingPlan } from '@/lib/coaching';
import type { AIEngine, CoachSuggestionInput } from './AIEngine';
import type { SocraticQuestion } from '@/data/coaching/questions';

export interface CoachResult {
  plan: CoachingPlan;
  source: 'ai' | 'curated';
}

export interface CoachOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;

export async function generateCoaching(
  engine: AIEngine,
  ctx: CoachingContext,
  entitled: boolean,
  options: CoachOptions = {},
): Promise<CoachResult> {
  const curated = buildCoaching(ctx);
  if (!entitled || !engine.coach) return { plan: curated, source: 'curated' };

  try {
    const input: CoachSuggestionInput = {
      dragonLabel: ctx.dragonId,
      blockerLabel: curated.blocker.label,
      ...(ctx.quest?.title ? { habitTitle: ctx.quest.title } : {}),
      ...(curated.context?.goalTitle ? { goalTitle: curated.context.goalTitle } : {}),
      ...(ctx.recentMood ? { recentMood: ctx.recentMood } : {}),
      ...(ctx.minutesAvailable != null ? { minutesAvailable: ctx.minutesAvailable } : {}),
    };
    const ai = await withTimeout(engine.coach(input), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    if (!ai || !Array.isArray(ai.questions) || ai.questions.length === 0 || !ai.tactic?.name) {
      return { plan: curated, source: 'curated' };
    }
    // Anchor AI questions to the curated tactic's framework so evidence stays real.
    const questions: SocraticQuestion[] = ai.questions
      .slice(0, 5)
      .map((text, i) => ({ id: `ai-${i}`, text, frameworkId: curated.tactic.frameworkId }));
    const plan: CoachingPlan = {
      ...curated,
      questions,
      tactic: { ...curated.tactic, name: ai.tactic.name, how: ai.tactic.how },
      // evidence intentionally left as the curated principle + source (honest).
      source: 'ai',
    };
    return { plan, source: 'ai' };
  } catch {
    return { plan: curated, source: 'curated' };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AITimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
