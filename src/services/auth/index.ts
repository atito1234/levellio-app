import { AsyncStorageStore } from '@/services/storage';
import { MockAuthService } from './MockAuthService';
import type { AuthService } from './AuthService';

/** Active auth service. Local mock today; Firebase later behind this interface. */
export const authService: AuthService = new MockAuthService(new AsyncStorageStore());

export type { AuthService, AuthUser } from './AuthService';
export { MockAuthService } from './MockAuthService';
