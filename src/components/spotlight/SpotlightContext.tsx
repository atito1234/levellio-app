/**
 * Spotlight tour engine — a once-only, controlled coach-mark system.
 *
 * Design rules (from product):
 *  - The tour advances ONLY via the card's "Next" control. The dimmed backdrop
 *    absorbs every other touch and does nothing, so a stray tap can never advance,
 *    finish, or trigger the app underneath ("no distraction").
 *  - It runs once at first start and is never auto-shown again; callers decide when
 *    to `start()` (e.g. first launch after onboarding, or an explicit "replay").
 *
 * Screens register highlightable targets with `useSpotlightTarget(id)` and spread
 * the returned props onto a View; the overlay reads the measured rect to draw the
 * highlight ring + place the coaching card. Steps with no target render centered.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

export interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TourStep {
  /** Target id to highlight; omit for a centered, target-less step. */
  targetId?: string;
  /** i18n keys (resolved by the overlay against the `tour` namespace). */
  titleKey: string;
  bodyKey: string;
}

interface SpotlightContextValue {
  /** The running tour's steps, or null when idle. */
  steps: TourStep[] | null;
  index: number;
  /** Begin a tour. No-op if one is already running. */
  start: (steps: TourStep[]) => void;
  next: () => void;
  /** End early. Both finish + skip call `onDone` so callers can persist a flag. */
  skip: () => void;
  /** Register/measure a highlight target; spread onto a View. */
  registerTarget: (id: string, rect: SpotlightRect | null) => void;
  rectFor: (id: string | undefined) => SpotlightRect | null;
}

const SpotlightContext = createContext<SpotlightContextValue | null>(null);

export function SpotlightProvider({
  children,
  onDone,
}: {
  children: React.ReactNode;
  /** Called once whenever a tour finishes or is skipped (persist completion here). */
  onDone?: () => void;
}) {
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const targets = useRef<Map<string, SpotlightRect>>(new Map());
  const [, force] = useState(0);

  const start = useCallback((next: TourStep[]) => {
    setSteps((cur) => (cur ? cur : next.length ? next : null));
    setIndex(0);
  }, []);

  const end = useCallback(() => {
    setSteps(null);
    setIndex(0);
    onDone?.();
  }, [onDone]);

  const next = useCallback(() => {
    setSteps((cur) => {
      if (!cur) return cur;
      setIndex((i) => {
        if (i + 1 >= cur.length) {
          // Last step → finish on the next tick.
          queueMicrotask(end);
          return i;
        }
        return i + 1;
      });
      return cur;
    });
  }, [end]);

  const registerTarget = useCallback((id: string, rect: SpotlightRect | null) => {
    if (rect) targets.current.set(id, rect);
    else targets.current.delete(id);
    force((n) => n + 1); // re-render the overlay with the new measurement
  }, []);

  const rectFor = useCallback((id: string | undefined) => (id ? targets.current.get(id) ?? null : null), []);

  const value = useMemo<SpotlightContextValue>(
    () => ({ steps, index, start, next, skip: end, registerTarget, rectFor }),
    [steps, index, start, next, end, registerTarget, rectFor],
  );

  return <SpotlightContext.Provider value={value}>{children}</SpotlightContext.Provider>;
}

export function useSpotlight(): SpotlightContextValue {
  const ctx = useContext(SpotlightContext);
  if (!ctx) throw new Error('useSpotlight must be used within a SpotlightProvider');
  return ctx;
}

/**
 * Register a View as a highlight target. Spread the returned props onto the View
 * you want spotlighted; it measures itself in the window on layout.
 */
export function useSpotlightTarget(id: string) {
  const { registerTarget } = useSpotlight();
  const ref = useRef<View>(null);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) registerTarget(id, { x, y, width, height });
    });
  }, [id, registerTarget]);

  const onLayout = useCallback((_e: LayoutChangeEvent) => {
    // measureInWindow is reliable after layout settles.
    requestAnimationFrame(measure);
  }, [measure]);

  return { ref, onLayout, collapsable: false as const };
}
