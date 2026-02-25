import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense, useEffect, useState } from "react";
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

// ── Always-needed (no lazy — loaded on every route) ───────────────────────────
import LoaderPage from "@/pages/LoaderPage";

// ── Pages (lazy — each becomes its own chunk) ─────────────────────────────────
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const CustomersPage = lazy(() => import("@/pages/CustomersPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const PaymentsPage = lazy(() => import("@/pages/PaymentsPage"));
const WebhooksPage = lazy(() => import("@/pages/WebhooksPage"));

// Error pages
const ErrorPage = lazy(() => import("@/pages/error/ErrorPage"));
const NoInternetPage = lazy(() => import("@/pages/error/NoInternetPage"));
const NotFoundPage = lazy(() => import("@/pages/error/NotFoundPage"));

// Analytics
const EventsPage = lazy(() => import("@/pages/analytics/EventsPage"));
const MetricsPage = lazy(() => import("@/pages/analytics/MetricsPage"));

// Finance
const FinanceAccountPage = lazy(
  () => import("@/pages/finance/FinanceAccountPage")
);
const IncomePage = lazy(() => import("@/pages/finance/IncomePage"));
const PayoutsPage = lazy(() => import("@/pages/finance/PayoutsPage"));

// Products — shell + sub-pages
const ProductsShell = lazy(() => import("@/pages/products"));
const BenefitsPage = lazy(() => import("@/pages/products/BenefitsPage"));
const CataloguePage = lazy(() => import("@/pages/products/CataloguePage"));
const CheckoutLinksPage = lazy(
  () => import("@/pages/products/CheckoutLinksPage")
);
const DiscountsPage = lazy(() => import("@/pages/products/DiscountsPage"));
const MetersPage = lazy(() => import("@/pages/products/MetersPage"));

// Sales
const CheckoutsPage = lazy(() => import("@/pages/sales/CheckoutsPage"));
const OrdersPage = lazy(() => import("@/pages/sales/OrdersPage"));
const SubscriptionsPage = lazy(() => import("@/pages/sales/SubscriptionsPage"));

// Settings
const AppearanceSettings = lazy(
  () => import("@/pages/settings/AppearanceSettings")
);
const BillingSettings = lazy(() => import("@/pages/settings/BillingSettings"));
const CustomFieldsSettings = lazy(
  () => import("@/pages/settings/CustomFieldsSettings")
);
const GeneralSettings = lazy(() => import("@/pages/settings/GeneralSettings"));
const MembersSettings = lazy(() => import("@/pages/settings/MembersSettings"));
const MpesaSettings = lazy(() => import("@/pages/settings/MpesaSettings"));
const NotificationsSettings = lazy(
  () => import("@/pages/settings/NotificationsSettings")
);
const WebhooksSettings = lazy(
  () => import("@/pages/settings/WebhooksSettings")
);

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
          {!isOnline && (
            <Suspense fallback={null}>
              <NoInternetPage key="offline" />
            </Suspense>
          )}
        </AnimatePresence>

        {isOnline && (
          <BrowserRouter>
            {/* Single Suspense boundary: shows LoaderPage while any lazy
                chunk is being downloaded. Nested Suspense boundaries can
                be added inside individual pages for finer granularity. */}
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

                    {/* Products — shell wraps sub-pages via Outlet */}
                    <Route
                      path="/products"
                      element={<Navigate to="/products/catalogue" replace />}
                    />
                    <Route path="/products" element={<ProductsShell />}>
                      <Route path="catalogue" element={<CataloguePage />} />
                      <Route
                        path="checkout-links"
                        element={<CheckoutLinksPage />}
                      />
                      <Route path="discounts" element={<DiscountsPage />} />
                      <Route path="benefits" element={<BenefitsPage />} />
                      <Route path="meters" element={<MetersPage />} />
                    </Route>

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

                    {/* Settings — each tab is its own route */}
                    <Route
                      path="/settings"
                      element={<Navigate to="/settings/general" replace />}
                    />
                    <Route
                      path="/settings/general"
                      element={<GeneralSettings />}
                    />
                    <Route
                      path="/settings/billing"
                      element={<BillingSettings />}
                    />
                    <Route
                      path="/settings/members"
                      element={<MembersSettings />}
                    />
                    <Route
                      path="/settings/webhooks"
                      element={<WebhooksSettings />}
                    />
                    <Route
                      path="/settings/custom-fields"
                      element={<CustomFieldsSettings />}
                    />
                    <Route path="/settings/mpesa" element={<MpesaSettings />} />
                    <Route
                      path="/settings/appearance"
                      element={<AppearanceSettings />}
                    />
                    <Route
                      path="/settings/notifications"
                      element={<NotificationsSettings />}
                    />

                    {/* System */}
                    <Route path="/webhooks" element={<WebhooksPage />} />
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
