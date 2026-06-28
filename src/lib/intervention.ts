/**
 * "Think twice" policy — decides whether an attempt to quit/skip should pause for
 * a coaching nudge. Pure + deterministic so it's testable and never annoying: we
 * only interrupt when there's genuinely something to lose (a running battle,
 * selected missions, or a real streak). Per-session anti-nag suppression lives in
 * the provider, not here.
 */
export type AbandonKind = 'battle-retreat' | 'ripple-back' | 'setup-close' | 'unplan' | 'quest-delete' | 'activity-locked-exit';

export interface AbandonContext {
  kind: AbandonKind;
  /** Relevant streak (global or activity), for un-plan / delete. */
  streakDays?: number;
  /** Missions selected in the War Room. */
  selectedCount?: number;
  /** Whether a battle timer is actively running. */
  battleRunning?: boolean;
  /** Whether a Focus Lock is active on a running activity. */
  focusLockedRunning?: boolean;
}

/** True when quitting is worth a moment's pause. Pure. */
export function shouldIntervene(ctx: AbandonContext): boolean {
  switch (ctx.kind) {
    case 'battle-retreat':
      return !!ctx.battleRunning;
    case 'activity-locked-exit':
      return !!ctx.focusLockedRunning;
    case 'setup-close':
      return (ctx.selectedCount ?? 0) > 0;
    case 'unplan':
    case 'quest-delete':
      return (ctx.streakDays ?? 0) >= 2;
    case 'ripple-back':
      return false; // low-stakes; never nag here
    default:
      return false;
  }
}
