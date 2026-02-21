import { api } from "@convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { Zap } from "lucide-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import AccountPage from "@/pages/AccountPage";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import PaymentsPage from "@/pages/PaymentsPage";
import SettingsPage from "@/pages/SettingsPage";
import WebhooksPage from "@/pages/WebhooksPage";

function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-2xl shadow-primary/40">
          <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    </div>
  );
}

/**
 * AuthenticatedApp is only rendered after Convex has validated the token,
 * so all queries here are safe to require authentication.
 */
function AuthenticatedApp() {
  const user = useQuery(api.auth.getCurrentUser);
  const businesses = useQuery(
    api.businesses.getUserBusinesses,
    user !== undefined ? {} : "skip"
  );

  // Still resolving user/businesses
  if (user === undefined || businesses === undefined) return <LoadingScreen />;

  // Onboarding — user has no business yet
  if (businesses.length === 0) return <OnboardingPage user={user} />;

  return (
    <BrowserRouter>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function App() {
  return (
    <>
      {/* Show loading spinner while Convex validates the auth token */}
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>

      {/* Show login page when not authenticated */}
      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>

      {/*
        Only mount the authenticated shell AFTER Convex has validated the token.
        This prevents the "Unauthenticated" ConvexError from ever being thrown
        because no protected query runs before isAuthenticated === true.
      */}
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
    </>
  );
}

export default App;
