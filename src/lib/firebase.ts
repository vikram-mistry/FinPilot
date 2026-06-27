/**
 * FinPilot — Firebase Initialization
 *
 * Uses Firebase v11 modular SDK.
 * Firestore is initialized with persistent local cache and
 * multi-tab synchronization via `persistentMultipleTabManager`.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

// ─── Config from Vite environment variables ─────────────────────────────────

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// ─── Initialize Firebase ────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);

/**
 * Firestore instance with IndexedDB-backed offline persistence
 * and automatic multi-tab coordination.
 *
 * This replaces the deprecated `enableIndexedDbPersistence()` API.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

/** Firebase Auth instance */
export const auth = getAuth(app);

/** Pre-configured Google sign-in provider */
export const googleProvider = new GoogleAuthProvider();

export default app;
