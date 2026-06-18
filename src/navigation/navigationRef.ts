import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Container-level navigation ref so components rendered as siblings of the
 * navigator (e.g. the MilestoneCelebration overlay) can navigate safely.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
