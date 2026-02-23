/**
 * App.tsx — root router + auth guards
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

// ── Pages ─────────────────────────────────────────────────────────────────────
import AccountPage from "@/pages/AccountPage";
import EventsPage from "@/pages/analytics/EventsPage";
// Analytics
import MetricsPage from "@/pages/analytics/MetricsPage";
import CustomersPage from "@/pages/CustomersPage";
import ErrorPage from "@/pages/error/ErrorPage";
import NoInternetPage from "@/pages/error/NoInternetPage";
import NotFoundPage from "@/pages/error/NotFoundPage";
import FinanceAccountPage from "@/pages/finance/FinanceAccountPage";
// Finance
import IncomePage from "@/pages/finance/IncomePage";
import PayoutsPage from "@/pages/finance/PayoutsPage";
import HomePage from "@/pages/HomePage";
import LandingPage from "@/pages/LandingPage";
import LoaderPage from "@/pages/LoaderPage";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import PaymentsPage from "@/pages/PaymentsPage";
import ProductsPage from "@/pages/ProductsPage";
import SettingsPage from "@/pages/SettingsPage";
import CheckoutsPage from "@/pages/sales/CheckoutsPage";
// Sales
import OrdersPage from "@/pages/sales/OrdersPage";
import SubscriptionsPage from "@/pages/sales/SubscriptionsPage";
import WebhooksPage from "@/pages/WebhooksPage";

// ── Network hook ──────────────────────────────────────────────────────────────

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

// ── Auth guards ───────────────────────────────────────────────────────────────

function RequireAuth() {
  const user = useQuery(api.auth.getCurrentUser);
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const location = useLocation();

  if (user === undefined) return <LoaderPage message="Verifying session" />;
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;

  if (
    businesses !== undefined &&
    businesses.length === 0 &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

function PublicOnly() {
  const user = useQuery(api.auth.getCurrentUser);
  if (user === undefined) return <LoaderPage message="Loading" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function RootRedirect() {
  const user = useQuery(api.auth.getCurrentUser);
  if (user === undefined) return <LoaderPage message="Loading Pesafy" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

function AuthenticatedLayout() {
  const user = useQuery(api.auth.getCurrentUser);
  return (
    <Layout user={user}>
      <Outlet />
    </Layout>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const isOnline = useNetworkStatus();

  return (
    <ThemeProvider defaultTheme="system" storageKey="pesafy-theme">
      <ErrorBoundary>
        <AnimatePresence>
          {!isOnline && <NoInternetPage key="offline" />}
        </AnimatePresence>

        {isOnline && (
          <BrowserRouter>
            <Suspense fallback={<LoaderPage />}>
              <Routes>
                {/* Public root */}
                <Route path="/" element={<RootRedirect />} />

                {/* Public-only */}
                <Route element={<PublicOnly />}>
                  <Route path="/login" element={<LoginPage />} />
                </Route>

                {/* Authenticated */}
                <Route element={<RequireAuth />}>
                  {/* No layout */}
                  <Route path="/onboarding" element={<OnboardingPage />} />

                  {/* With sidebar layout */}
                  <Route element={<AuthenticatedLayout />}>
                    {/* Core */}
                    <Route path="/dashboard" element={<HomePage />} />
                    <Route path="/payments" element={<PaymentsPage />} />

                    {/* Products */}
                    <Route
                      path="/products"
                      element={<Navigate to="/products/catalogue" replace />}
                    />
                    <Route path="/products/:tab" element={<ProductsPage />} />

                    {/* Customers */}
                    <Route path="/customers" element={<CustomersPage />} />

                    {/* Analytics */}
                    <Route
                      path="/analytics"
                      element={<Navigate to="/analytics/metrics" replace />}
                    />
                    <Route
                      path="/analytics/metrics"
                      element={<MetricsPage />}
                    />
                    <Route path="/analytics/events" element={<EventsPage />} />

                    {/* Sales */}
                    <Route
                      path="/sales"
                      element={<Navigate to="/sales/orders" replace />}
                    />
                    <Route path="/sales/orders" element={<OrdersPage />} />
                    <Route
                      path="/sales/subscriptions"
                      element={<SubscriptionsPage />}
                    />
                    <Route
                      path="/sales/checkouts"
                      element={<CheckoutsPage />}
                    />

                    {/* Finance */}
                    <Route
                      path="/finance"
                      element={<Navigate to="/finance/income" replace />}
                    />
                    <Route path="/finance/income" element={<IncomePage />} />
                    <Route path="/finance/payouts" element={<PayoutsPage />} />
                    <Route
                      path="/finance/account"
                      element={<FinanceAccountPage />}
                    />

                    {/* System */}
                    <Route path="/webhooks" element={<WebhooksPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/account" element={<AccountPage />} />
                  </Route>
                </Route>

                {/* Errors */}
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
