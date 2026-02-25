/**
 * App.tsx — root router + auth guards
 *
 * All page-level components are loaded with React.lazy() so Vite/Rollup
 * can code-split them into separate chunks that are only downloaded when
 * the user navigates to that route.
 *
 * IMPORTANT — Suspense boundary placement:
 * The <Suspense> is intentionally placed INSIDE AuthenticatedLayout (wrapping
 * only the <Outlet>) rather than around the entire <Routes> tree. This means
 * when a lazy chunk is loading, only the main content area shows a loader —
 * the sidebar, header and layout shell stay mounted and visible. Placing
 * Suspense too high causes the entire shell to unmount on every navigation,
 * which looks like a full page reload.
 */
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

// ── Always-needed (not lazy — used as Suspense fallbacks) ─────────────────────
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

// Products
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

// ── A lightweight inline content loader ───────────────────────────────────────
// Used inside the layout so only the content area shows a spinner — not the
// whole shell. Avoids the "page reload" flicker on chunk download.
function ContentLoader() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="spinner spinner-dark" />
    </div>
  );
}

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
  return (
    // LandingPage is lazy — wrap with Suspense here since there's no layout shell
    <Suspense fallback={<LoaderPage />}>
      <LandingPage />
    </Suspense>
  );
}

function AuthenticatedLayout() {
  const user = useQuery(api.auth.getCurrentUser);
  return (
    <Layout user={user}>
      {/*
       * Suspense is scoped to just the page content area.
       * The Layout (sidebar + header) stays mounted during chunk downloads
       * so the user sees a small spinner in the content area instead of
       * the entire shell disappearing — no more "page reload" effect.
       */}
      <Suspense fallback={<ContentLoader />}>
        <Outlet />
      </Suspense>
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
            {/*
             * Outer Suspense: only catches non-layout routes (login, onboarding,
             * error pages). The authenticated routes have their own inner Suspense
             * inside AuthenticatedLayout so the shell never unmounts.
             */}
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

                  {/* With sidebar layout — Suspense lives inside AuthenticatedLayout */}
                  <Route element={<AuthenticatedLayout />}>
                    {/* Core */}
                    <Route path="/dashboard" element={<HomePage />} />
                    <Route path="/payments" element={<PaymentsPage />} />

                    {/* Products */}
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

                    {/* Settings */}
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
