/**
 * FinPilot — Auth Store (Zustand)
 *
 * Manages Firebase Authentication state.
 * Updated by the `useAuth` hook which subscribes to `onAuthStateChanged`.
 */

import { create } from 'zustand';
import type { User } from 'firebase/auth';

export interface AuthState {
  /** The currently signed-in Firebase user, or null if signed out */
  user: User | null;
  /** True while the initial auth check is in progress */
  loading: boolean;
  /** Human-readable auth error message, if any */
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true, // start as loading until onAuthStateChanged fires
  error: null,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
