/**
 * Lazy Firebase singletons. Nothing here runs (or imports a live connection)
 * unless Firebase is configured AND a caller asks for it, so the app boots fine
 * with no keys. Auth uses AsyncStorage persistence so sessions survive restarts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
// Auth's RN persistence helper isn't in the public typings on every version;
// import defensively so typecheck/bundling stay green.
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './config';

let appSingleton: FirebaseApp | null = null;
let dbSingleton: Firestore | null = null;
let authSingleton: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) throw new Error('Firebase is not configured');
  if (appSingleton) return appSingleton;
  appSingleton = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appSingleton;
}

export function getDb(): Firestore {
  if (dbSingleton) return dbSingleton;
  dbSingleton = getFirestore(getFirebaseApp());
  return dbSingleton;
}

export function getFirebaseAuth(): Auth {
  if (authSingleton) return authSingleton;
  const app = getFirebaseApp();
  const getReactNativePersistence = (
    firebaseAuth as unknown as {
      getReactNativePersistence?: (storage: unknown) => unknown;
    }
  ).getReactNativePersistence;
  try {
    authSingleton = getReactNativePersistence
      ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) as never })
      : getAuth(app);
  } catch {
    // initializeAuth throws if already initialized (e.g. fast refresh).
    authSingleton = getAuth(app);
  }
  return authSingleton;
}
