/**
 * Socratic, thought-provoking questions — the "critical thinking" half of
 * coaching. They only ASK (never assert an outcome), nudging the user to argue
 * themselves toward action. Each ties to a Framework for honest grounding and is
 * reused across blockers via `Blocker.questionIds`.
 */
import type { FrameworkId } from './frameworks';

export interface SocraticQuestion {
  id: string;
  /** The one-at-a-time prompt. */
  text: string;
  frameworkId: FrameworkId;
  /** Optional gentle nudge after they reflect. */
  followUp?: string;
}

export const QUESTIONS: readonly SocraticQuestion[] = [
  { id: 'q-smallest', text: 'What’s the smallest version of this you couldn’t say no to?', frameworkId: 'two-minute-rule' },
  { id: 'q-one-step', text: 'What’s the very first physical step — just step one?', frameworkId: 'two-minute-rule' },
  { id: 'q-tiny-promise', text: 'Could you promise just two minutes, and stop after if you still want to?', frameworkId: 'two-minute-rule' },
  { id: 'q-5min-change', text: 'What will actually be different in five minutes that isn’t true right now?', frameworkId: 'cbt-distortions' },
  { id: 'q-when-where', text: 'Exactly when and where will you do this today?', frameworkId: 'implementation-intentions', followUp: 'Picture the moment — it makes it far more likely to happen.' },
  { id: 'q-after-what', text: 'Which thing you already do every day could this come right after?', frameworkId: 'habit-stacking' },
  { id: 'q-evidence', text: 'What’s the real evidence for that thought — and what’s the evidence against it?', frameworkId: 'cbt-distortions' },
  { id: 'q-worst-case', text: 'If the worst happened, how would you actually handle it?', frameworkId: 'fear-setting' },
  { id: 'q-name-fear', text: 'If you name the fear out loud, what is it really about?', frameworkId: 'fear-setting' },
  { id: 'q-future-self', text: 'What would the person you’re becoming do right now?', frameworkId: 'sdt' },
  { id: 'q-why-matters', text: 'Why did this matter enough to start in the first place?', frameworkId: 'sdt' },
  { id: 'q-advice-friend', text: 'What would you say to a friend who felt exactly this way?', frameworkId: 'self-compassion' },
  { id: 'q-deserve', text: 'If you did deserve this, what would you do next?', frameworkId: 'self-compassion' },
  { id: 'q-cost-of-skip', text: 'What does skipping today quietly cost you?', frameworkId: 'loss-aversion' },
  { id: 'q-treat-pair', text: 'What could you pair this with so it’s something to look forward to?', frameworkId: 'temptation-bundling' },
  { id: 'q-remove-friction', text: 'What one thing could you remove or set up to make this easier?', frameworkId: 'environment-design' },
  { id: 'q-whose-voice', text: 'Whose voice is that “you can’t” — and is it telling the truth?', frameworkId: 'cbt-distortions' },
  { id: 'q-too-late', text: 'If not now, when does “too late” actually begin?', frameworkId: 'cbt-distortions' },
  { id: 'q-proof', text: 'What small experiment would show whether this really works for you?', frameworkId: 'cbt-distortions' },
  { id: 'q-feel-after', text: 'How will you feel about yourself ten minutes after you’ve started?', frameworkId: 'zeigarnik' },
  { id: 'q-perfection', text: 'Does this need to be perfect, or does it just need to be done?', frameworkId: 'cbt-distortions' },
  { id: 'q-energy-now', text: 'What version of this fits the energy you actually have right now?', frameworkId: 'fogg-bmap' },
  { id: 'q-past-win', text: 'When have you pushed through something like this before?', frameworkId: 'motivational-interviewing' },
  { id: 'q-reasons', text: 'Give yourself three honest reasons this is worth doing today.', frameworkId: 'motivational-interviewing' },
  { id: 'q-resist-what', text: 'What are you actually resisting — the task, or a feeling about it?', frameworkId: 'cbt-distortions' },
];

/** Resolve a question by id. Pure. */
export function getQuestion(id: string): SocraticQuestion | undefined {
  return QUESTIONS.find((q) => q.id === id);
}
