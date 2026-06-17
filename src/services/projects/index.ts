import { AsyncStorageStore } from '@/services/storage';
import { isFirebaseConfigured } from '@/services/firebase/config';
import { LocalProjectsBackend } from './LocalProjectsBackend';
import type { ProjectsBackend } from './ProjectsBackend';

/**
 * Active projects backend. Firestore (cross-device realtime) when Firebase is
 * configured; the local on-device backend otherwise — so the feature works and
 * is testable today and lights up collaboration the moment keys are added. The
 * Firestore backend is required lazily so its `firebase/firestore` graph never
 * loads when it isn't used.
 */
function build(): ProjectsBackend {
  if (isFirebaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FirebaseProjectsBackend } = require('./FirebaseProjectsBackend') as typeof import('./FirebaseProjectsBackend');
    return new FirebaseProjectsBackend();
  }
  return new LocalProjectsBackend(new AsyncStorageStore());
}

export const projectsBackend: ProjectsBackend = build();

export type {
  ContributionInput,
  ProjectDraft,
  ProjectIdentity,
  ProjectSnapshot,
  ProjectsBackend,
  Unsubscribe,
} from './ProjectsBackend';
export { FEATURED_PROJECTS } from './featuredProjects';
