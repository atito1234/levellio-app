import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useGame } from '@/state/GameContext';
import { metadataStore } from '@/services/metadata';
import type { MetadataEvent } from '@/lib/metadata';

/**
 * Loads the on-device metadata event log for the current user, refreshing each
 * time the consuming screen gains focus (so insights reflect new completions).
 */
export function useActivityLog(): { events: MetadataEvent[]; ready: boolean } {
  const { user } = useGame();
  const uid = user?.uid ?? null;
  const [events, setEvents] = useState<MetadataEvent[]>([]);
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!uid) {
        setEvents([]);
        setReady(false);
        return;
      }
      metadataStore.load(uid).then((e) => {
        if (active) {
          setEvents(e);
          setReady(true);
        }
      });
      return () => {
        active = false;
      };
    }, [uid]),
  );

  return { events, ready };
}
