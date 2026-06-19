import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { profileBackend } from '@/services/profile';
import { buildProfileSnapshot, profileSignature, type PublicProfile } from '@/lib/profile';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import { useMilestones } from '@/state/MilestonesContext';
import { useProjects } from '@/state/ProjectsContext';
import { useSettings } from '@/state/SettingsContext';

/**
 * Publishes the signed-in user's public-safe profile snapshot whenever it
 * meaningfully changes (level up, streak, milestone, headline…), and exposes a
 * `useProfile(uid)` reader. The viewer's own profile resolves from local state
 * (instant); other users' profiles come from the ProfileBackend.
 */
interface ProfileContextValue {
  myUid: string | null;
  myProfile: PublicProfile | null;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const { character } = useGame();
  const { earned } = useMilestones();
  const { myProjects } = useProjects();
  const { settings } = useSettings();
  const uid = account?.uid ?? null;

  const myProfile = useMemo<PublicProfile | null>(() => {
    if (!uid || !character) return null;
    return buildProfileSnapshot({
      uid,
      displayName: account?.displayName?.trim() || character.name?.trim() || 'Hero',
      character,
      milestones: earned,
      projectsJoined: myProjects.length,
      headline: settings.profileHeadline,
      country: settings.profileCountry,
    });
  }, [
    uid,
    account?.displayName,
    character,
    earned,
    myProjects.length,
    settings.profileHeadline,
    settings.profileCountry,
  ]);

  // Publish only when the public signature actually changes.
  const lastSig = useRef<string | null>(null);
  useEffect(() => {
    if (!myProfile) return;
    const sig = profileSignature(myProfile);
    if (sig === lastSig.current) return;
    lastSig.current = sig;
    void profileBackend.publishProfile(myProfile).catch(() => undefined);
  }, [myProfile]);

  const value = useMemo<ProfileContextValue>(() => ({ myUid: uid, myProfile }), [uid, myProfile]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}

/** Read any user's public profile. Own profile is served from local state. */
export function useProfile(uid: string): { profile: PublicProfile | null; loading: boolean } {
  const { myUid, myProfile } = useProfileContext();
  const isMe = myUid === uid;
  const [profile, setProfile] = useState<PublicProfile | null>(isMe ? myProfile : null);
  const [loading, setLoading] = useState(!isMe);

  useEffect(() => {
    if (isMe) {
      setProfile(myProfile);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = profileBackend.subscribeProfile(uid, (p) => {
      setProfile(p);
      setLoading(false);
    });
    return unsub;
  }, [uid, isMe, myProfile]);

  return { profile, loading };
}

export function useMyUid(): string | null {
  return useProfileContext().myUid;
}
