/**
 * AchievementCelebrationHost — auto-pops the dark "Achievement Unlocked" certificate
 * the moment a milestone is newly earned, reusing AchievementUnlockedModal.
 *
 * Detection rides the existing focus-refresh path: useActivityLog reloads on focus →
 * useAchievementStats re-evaluates → evaluateAchievements surfaces newly-earned ids.
 * This host is mounted inside DashboardScreen (a real focused screen and the natural
 * landing point — battles already auto-return Home).
 *
 * First-run baseline: on the FIRST evaluation after the context is ready we silently
 * record everything currently earned (no pop) — so existing users with a backlog
 * aren't flooded; only achievements earned *after* the app opened celebrate. Multiple
 * fresh unlocks queue and pop one at a time.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AchievementUnlockedModal } from '@/components/AchievementUnlockedModal';
import { useGame } from '@/state/GameContext';
import { useAuth } from '@/state/AuthContext';
import { useAchievements } from '@/state/AchievementsContext';
import { useAchievementStats } from '@/state/useAchievementStats';
import { evaluateAchievements, type AchievementState } from '@/lib/achievements';
import { ACHIEVEMENTS } from '@/data/achievements';

export function AchievementCelebrationHost() {
  const { t } = useTranslation('achievements');
  const { character } = useGame();
  const { account } = useAuth();
  const { ready, seen, markSeen } = useAchievements();
  const ctx = useAchievementStats();

  const states = useMemo(() => evaluateAchievements(ACHIEVEMENTS, ctx.stats), [ctx.stats]);
  const name = account?.displayName?.trim() || character?.name?.trim() || t('cert.you');

  // Ids we've already accounted for this session (baseline + anything queued/shown),
  // so dedup never depends on async `seen` state settling.
  const handled = useRef<Set<string>>(new Set());
  const baselined = useRef(false);
  const [queue, setQueue] = useState<AchievementState[]>([]);
  const [current, setCurrent] = useState<AchievementState | null>(null);

  // Detect newly-earned achievements.
  useEffect(() => {
    if (!ready) return;
    const earned = states.filter((s) => s.earned);

    if (!baselined.current) {
      // First settle: establish the baseline silently, never pop.
      baselined.current = true;
      earned.forEach((s) => handled.current.add(s.def.id));
      const unseen = earned.map((s) => s.def.id).filter((id) => !seen.has(id));
      if (unseen.length) markSeen(unseen);
      return;
    }

    const fresh = earned.filter((s) => !handled.current.has(s.def.id));
    if (fresh.length) {
      fresh.forEach((s) => handled.current.add(s.def.id));
      setQueue((prev) => [...prev, ...fresh]);
    }
  }, [ready, states, seen, markSeen]);

  // Pull the next queued unlock into view once nothing is showing.
  useEffect(() => {
    const next = queue[0];
    if (!current && next) {
      setCurrent(next);
      setQueue((prev) => prev.slice(1));
      markSeen([next.def.id]);
    }
  }, [current, queue, markSeen]);

  return <AchievementUnlockedModal state={current} ctx={ctx} name={name} onClose={() => setCurrent(null)} />;
}
