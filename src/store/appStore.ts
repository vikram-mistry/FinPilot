/**
 * FinPilot — App Store (Zustand)
 *
 * Central application state: user profile, settings, UI preferences.
 */

import { create } from 'zustand';
import type { Profile, AppSettings } from '@/types';

// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  emergencyTargetMonths: 9,
  riskProfile: 'balanced',
  investmentPreference: 'balanced',
  advisorPriorities: ['expenses', 'emergency', 'investments', 'prepayment', 'buffer'],
  theme: 'system',
  salaryDate: 1,
  currency: 'INR',
};

// ─── Store Interface ────────────────────────────────────────────────────────

export interface AppState {
  /** User profile loaded from Firestore */
  profile: Profile | null;
  /** Application settings with safe defaults */
  settings: AppSettings;
  /** Whether the sidebar / mobile drawer is open */
  sidebarOpen: boolean;
  /** Resolved theme preference */
  theme: 'light' | 'dark' | 'system';

  // ── Actions ─────────────────────────────────────────────────────────
  setProfile: (profile: Profile | null) => void;
  updateProfile: (partial: Partial<Profile>) => void;
  setSettings: (settings: AppSettings) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  /** Reset to defaults (e.g. on sign-out) */
  reset: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  settings: { ...DEFAULT_SETTINGS },
  sidebarOpen: false,
  theme: 'system',

  setProfile: (profile) => set({ profile }),

  updateProfile: (partial) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...partial } : null,
    })),

  setSettings: (settings) =>
    set({ settings, theme: settings.theme }),

  updateSettings: (partial) =>
    set((state) => {
      const updated = { ...state.settings, ...partial };
      return {
        settings: updated,
        theme: partial.theme ?? state.theme,
      };
    }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setTheme: (theme) =>
    set((state) => ({
      theme,
      settings: { ...state.settings, theme },
    })),

  reset: () =>
    set({
      profile: null,
      settings: { ...DEFAULT_SETTINGS },
      sidebarOpen: false,
      theme: 'system',
    }),
}));
