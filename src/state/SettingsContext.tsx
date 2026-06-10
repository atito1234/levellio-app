import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { settingsStore, DEFAULT_SETTINGS, type AppSettings } from '@/services/settings';

/**
 * Reactive app settings (AI prefs, premium entitlement, cosmetic theme). Kept
 * separate from game state so any screen can read/update settings and re-render
 * when the entitlement changes.
 */
interface SettingsContextValue {
  settings: AppSettings;
  ready: boolean;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    let active = true;
    settingsStore.load().then((loaded) => {
      if (active) setSettings(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await settingsStore.update(patch);
    setSettings(next);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings: settings ?? DEFAULT_SETTINGS, ready: settings !== null, update }),
    [settings, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
