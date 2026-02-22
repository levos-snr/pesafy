/**
 * App.tsx — root router + auth guards
 *
 * Route strategy:
 *  / (root)     → unauthenticated → LandingPage
 *               → authenticated   → redirect to /dashboard
 *  /dashboard   → authenticated   → HomePage (inside Layout)
 *               → unauthenticated → redirect to /
 *  /login       → always accessible (redirect to /dashboard if already authed)
 *  /onboarding  → authenticated, no business → OnboardingPage
 *  /payments, /webhooks, /settings, /account → authenticated + Layout
 *  *            → NotFoundPage
 *
 * Error handling:
 *  - Top-level ErrorBoundary for render errors
 *  - useNetworkStatus() for offline detection
 *  - LoaderPage while auth is resolving
 *  - Route-level errorElement for React Router errors
 */

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import ErrorBoundary from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/components/theme-provider";
import AccountPage from "@/pages/AccountPage";
import ErrorPage from "@/pages/error/ErrorPage";
import NoInternetPage from "@/pages/error/NoInternetPage";
import NotFoundPage from "@/pages/error/NotFoundPage";
import HomePage from "@/pages/HomePage";
import LandingPage from "@/pages/LandingPage";
import LoaderPage from "@/pages/LoaderPage";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import PaymentsPage from "@/pages/PaymentsPage";
import SettingsPage from "@/pages/SettingsPage";
import WebhooksPage from "@/pages/WebhooksPage";

// ── Network status hook ──────────────────────────────────────
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return isOnline;
}

// ── Auth guard wrappers ──────────────────────────────────────

/**
 * Requires authentication. Redirects to "/" (landing) if not authed.
 * Shows LoaderPage while auth is resolving.
 */
function RequireAuth() {
  const user = useQuery(api.auth.getCurrentUser);
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const location = useLocation();

  // Still loading — show spinner
  if (user === undefined) return <LoaderPage message="Verifying session" />;

  // Not authenticated → landing
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;

  // Authenticated but no business yet → onboarding
  if (
    businesses !== undefined &&
    businesses.length === 0 &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

/**
 * Public-only route. Redirects authenticated users to dashboard.
 * Shows LoaderPage while auth is resolving.
 */
function PublicOnly() {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) return <LoaderPage message="Loading" />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

/**
 * Root route — landing for guests, dashboard redirect for authed users.
 */
function RootRedirect() {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) return <LoaderPage message="Loading Pesafy" />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <LandingPage />;
}

// ── Layout wrapper for authed pages ─────────────────────────
function AuthenticatedLayout() {
  const user = useQuery(api.auth.getCurrentUser);
  return (
    <Layout user={user}>
      <Outlet />
    </Layout>
  );
}

// ── App ─────────────────────────────────────────────────────
export default function App() {
  const isOnline = useNetworkStatus();

  return (
    <ThemeProvider defaultTheme="system" storageKey="pesafy-theme">
      <ErrorBoundary>
        {/* Offline overlay — shown on top of everything */}
        <AnimatePresence>
          {!isOnline && <NoInternetPage key="offline" />}
        </AnimatePresence>

        {isOnline && (
          <BrowserRouter>
            <Suspense fallback={<LoaderPage />}>
              <Routes>
                {/* ── Public root ─────────────────────── */}
                <Route path="/" element={<RootRedirect />} />

                {/* ── Public-only (redirect if authed) ── */}
                <Route element={<PublicOnly />}>
                  <Route path="/login" element={<LoginPage />} />
                </Route>

                {/* ── Authenticated ───────────────────── */}
                <Route element={<RequireAuth />}>
                  {/* Onboarding (no Layout) */}
                  <Route path="/onboarding" element={<OnboardingPage />} />

                  {/* Dashboard pages (with Layout) */}
                  <Route element={<AuthenticatedLayout />}>
                    <Route path="/dashboard" element={<HomePage />} />
                    <Route path="/payments" element={<PaymentsPage />} />
                    <Route path="/webhooks" element={<WebhooksPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/account" element={<AccountPage />} />
                  </Route>
                </Route>

                {/* ── Error routes ─────────────────────── */}
                <Route path="/error" element={<ErrorPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        )}
      </ErrorBoundary>
    </ThemeProvider>
  );
}
