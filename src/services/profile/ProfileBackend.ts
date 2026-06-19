import type { PublicProfile } from '@/lib/profile';

export type Unsubscribe = () => void;

/**
 * Reads/writes the public profile snapshot. Mirrors the community/projects seam:
 * an interface with a Local (on-device) and a Firebase (cross-device) impl.
 */
export interface ProfileBackend {
  /** True when profiles are shared across devices (Firebase). */
  readonly isShared: boolean;
  /** Publish (upsert) the signed-in user's own snapshot. */
  publishProfile(profile: PublicProfile): Promise<void>;
  /** One-shot read of any user's public profile. */
  getProfile(uid: string): Promise<PublicProfile | null>;
  /** Live subscription to a user's public profile. */
  subscribeProfile(uid: string, cb: (profile: PublicProfile | null) => void): Unsubscribe;
  /** Remove the user's published profile (account deletion). */
  deleteMyData(uid: string): Promise<void>;
}
