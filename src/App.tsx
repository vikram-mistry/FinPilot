import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/appStore';
import { useDocument } from '@/hooks/useFirestore';
import { PageShell } from '@/components/layout/PageShell';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import type { Profile, AppSettings } from '@/types';

// Lazy loading feature pages for performance
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const OnboardingWizard = lazy(() => import('@/features/onboarding/OnboardingWizard'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const MonthlyPlannerPage = lazy(() => import('@/features/planner/MonthlyPlannerPage'));
const LoanPage = lazy(() => import('@/features/loan/LoanPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const EmergencyFundPage = lazy(() => import('@/features/emergency/EmergencyFundPage'));
const InvestmentPage = lazy(() => import('@/features/investments/InvestmentPage'));
const NetWorthPage = lazy(() => import('@/features/networth/NetWorthPage'));
const ScenarioSimulator = lazy(() => import('@/features/simulator/ScenarioSimulator'));
const PlaceholderPage = lazy(() => import('@/features/PlaceholderPage'));

// ── Auth Guard ──────────────────────────────────────────────────────────────
function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white space-y-4">
        <div className="w-10 h-10 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
        <p className="text-xs text-muted-foreground font-semibold">Authenticating session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// ── Onboarding Guard ────────────────────────────────────────────────────────
function OnboardingGuard() {
  const { profile, setProfile, setSettings } = useAppStore();
  const { data: dbProfile, loading: profileLoading } = useDocument<Profile>('profile');
  const { data: dbSettings } = useDocument<AppSettings>('settings');

  useEffect(() => {
    if (dbProfile) {
      setProfile(dbProfile);
    }
    if (dbSettings) {
      setSettings(dbSettings);
    }
  }, [dbProfile, dbSettings, setProfile, setSettings]);

  if (profileLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white space-y-4">
        <div className="w-10 h-10 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
        <p className="text-xs text-muted-foreground font-semibold">Loading profile parameters...</p>
      </div>
    );
  }

  const onboardingComplete = dbProfile?.onboardingComplete || profile?.onboardingComplete;

  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export function App() {
  const theme = useAppStore((state) => state.theme);

  // Apply Light/Dark Mode to HTML root element
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(systemDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <HashRouter>
        <Suspense
          fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
              <div className="w-10 h-10 rounded-full border-4 border-teal-500/20 border-t-primary animate-spin" />
            </div>
          }
        >
          <Routes>
            {/* Public Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Private Routes with Auth Guard */}
            <Route element={<AuthGuard />}>
              {/* Onboarding Wizard setup */}
              <Route path="/onboarding" element={<OnboardingWizard />} />

              {/* Verified Profile routes */}
              <Route element={<OnboardingGuard />}>
                <Route
                  path="/"
                  element={
                    <PageShell>
                      <DashboardPage />
                    </PageShell>
                  }
                />
                <Route
                  path="/planner"
                  element={
                    <PageShell>
                      <MonthlyPlannerPage />
                    </PageShell>
                  }
                />
                <Route
                  path="/loan"
                  element={
                    <PageShell>
                      <LoanPage />
                    </PageShell>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <PageShell>
                      <SettingsPage />
                    </PageShell>
                  }
                />

                {/* Phase 2 Modules */}
                <Route
                  path="/investments"
                  element={
                    <PageShell>
                      <InvestmentPage />
                    </PageShell>
                  }
                />
                <Route
                  path="/emergency"
                  element={
                    <PageShell>
                      <EmergencyFundPage />
                    </PageShell>
                  }
                />
                <Route
                  path="/networth"
                  element={
                    <PageShell>
                      <NetWorthPage />
                    </PageShell>
                  }
                />
                <Route
                  path="/simulator"
                  element={
                    <PageShell>
                      <ScenarioSimulator />
                    </PageShell>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <PageShell>
                      <PlaceholderPage title="Financial Reporting" phase={3} />
                    </PageShell>
                  }
                />
              </Route>
            </Route>

            {/* Fallback Catch */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  );
}
export default App;
