/**
 * Firestore ProfileBackend — the public, signed-in-readable profile snapshot.
 *   profiles/{uid}   public-safe { displayName, presentation?, headline?, level,
 *                    tier, lifetimeXp, streakDays, milestonesCount, projectsJoined,
 *                    recentMilestones[], updatedAt }
 */
import { deleteDoc, doc, getDoc, onSnapshot, setDoc, type DocumentData, type Firestore } from 'firebase/firestore';
import { getDb } from '@/services/firebase/app';
import type { PublicProfile, ProfileMilestone } from '@/lib/profile';
import type { ProfileBackend, Unsubscribe } from './ProfileBackend';

function toProfile(uid: string, d: DocumentData): PublicProfile {
  const recent = Array.isArray(d.recentMilestones) ? (d.recentMilestones as ProfileMilestone[]) : [];
  return {
    uid,
    displayName: d.displayName ?? 'Hero',
    ...(d.presentation ? { presentation: d.presentation } : {}),
    ...(d.headline ? { headline: d.headline } : {}),
    ...(d.country ? { country: d.country } : {}),
    level: typeof d.level === 'number' ? d.level : 1,
    tier: d.tier === 'luminary' || d.tier === 'pathfinder' ? d.tier : 'novice',
    lifetimeXp: typeof d.lifetimeXp === 'number' ? d.lifetimeXp : 0,
    streakDays: typeof d.streakDays === 'number' ? d.streakDays : 0,
    milestonesCount: typeof d.milestonesCount === 'number' ? d.milestonesCount : 0,
    projectsJoined: typeof d.projectsJoined === 'number' ? d.projectsJoined : 0,
    recentMilestones: recent,
    updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : 0,
  };
}

export class FirebaseProfileBackend implements ProfileBackend {
  readonly isShared = true;
  private get db(): Firestore {
    return getDb();
  }

  async publishProfile(profile: PublicProfile): Promise<void> {
    await setDoc(doc(this.db, 'profiles', profile.uid), profile, { merge: true });
  }

  async getProfile(uid: string): Promise<PublicProfile | null> {
    const snap = await getDoc(doc(this.db, 'profiles', uid));
    return snap.exists() ? toProfile(uid, snap.data()) : null;
  }

  subscribeProfile(uid: string, cb: (p: PublicProfile | null) => void): Unsubscribe {
    return onSnapshot(doc(this.db, 'profiles', uid), (s) => cb(s.exists() ? toProfile(uid, s.data()) : null));
  }

  async deleteMyData(uid: string): Promise<void> {
    await deleteDoc(doc(this.db, 'profiles', uid));
  }
}
