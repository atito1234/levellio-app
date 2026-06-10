/**
 * Backend entry point. Returns the local mock today; swap to Firebase later
 * without touching callers.
 * TODO(day5+): select implementation via runtime config (mock vs firebase).
 */
import type { BackendService } from './BackendService';
import { LocalMockBackend } from './LocalMockBackend';

export const backend: BackendService = new LocalMockBackend();

export * from './BackendService';
export { LocalMockBackend } from './LocalMockBackend';
