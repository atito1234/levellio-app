/**
 * Owns the user's explicit activity links (their "chains"). Mirrors GoalProvider:
 * loads per-uid from the LinkStore, commits on every change. Pure graph ops live
 * in src/lib/links.ts.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { linkStore } from '@/services/links';
import { addLink as addLinkPure, areLinked, cluster, neighbors, removeLink as removeLinkPure, type LinkMap } from '@/lib/links';

interface LinksContextValue {
  ready: boolean;
  links: LinkMap;
  neighborsOf: (id: string) => string[];
  chainOf: (id: string) => string[];
  isLinked: (a: string, b: string) => boolean;
  addLink: (a: string, b: string) => Promise<void>;
  removeLink: (a: string, b: string) => Promise<void>;
}

const LinksContext = createContext<LinksContextValue | null>(null);

export function LinksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;
  const [links, setLinks] = useState<LinkMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setLinks({});
      setReady(false);
      return;
    }
    linkStore.load(uid).then((loaded) => {
      if (active) {
        setLinks(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const commit = useCallback(
    async (next: LinkMap) => {
      setLinks(next);
      if (uid) await linkStore.save(uid, next);
    },
    [uid],
  );

  const addLink = useCallback((a: string, b: string) => commit(addLinkPure(links, a, b)), [links, commit]);
  const removeLink = useCallback((a: string, b: string) => commit(removeLinkPure(links, a, b)), [links, commit]);

  const value = useMemo<LinksContextValue>(
    () => ({
      ready,
      links,
      neighborsOf: (id) => neighbors(links, id),
      chainOf: (id) => cluster(links, id),
      isLinked: (a, b) => areLinked(links, a, b),
      addLink,
      removeLink,
    }),
    [ready, links, addLink, removeLink],
  );

  return <LinksContext.Provider value={value}>{children}</LinksContext.Provider>;
}

export function useLinks(): LinksContextValue {
  const ctx = useContext(LinksContext);
  if (!ctx) throw new Error('useLinks must be used within a LinksProvider');
  return ctx;
}
