import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Building2, Check, KeyRound, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:border-primary/55 focus:ring-2 focus:ring-primary/10";

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <h3 className="font-display font-semibold text-[15px] text-foreground">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;
  const business = useQuery(
    api.businesses.getBusiness,
    businessId ? { businessId } : "skip"
  );
  const credentials = useQuery(
    api.credentials.getCredentials,
    businessId ? { businessId } : "skip"
  );
  const setCredentials = useMutation(api.credentials.setCredentials);
  const updateBusiness = useMutation(api.businesses.updateBusiness);

  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [passKey, setPassKey] = useState("");
  const [initiatorName, setInitiatorName] = useState("");
  const [credsLoading, setCredsLoading] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);
  const [credsErr, setCredsErr] = useState("");

  const [bizEnv, setBizEnv] = useState<"sandbox" | "production" | null>(null);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setCredsLoading(true);
    setCredsErr("");
    try {
      await setCredentials({
        businessId,
        consumerKey,
        consumerSecret,
        lipaNaMpesaPassKey: passKey || undefined,
        initiatorName: initiatorName || undefined,
      });
      setCredsSaved(true);
      setConsumerKey("");
      setConsumerSecret("");
      setPassKey("");
      setInitiatorName("");
      setTimeout(() => setCredsSaved(false), 3000);
    } catch (e: any) {
      setCredsErr(e?.message ?? "Failed to save credentials");
    } finally {
      setCredsLoading(false);
    }
  };

  const handleUpdateBusiness = async () => {
    if (!businessId || !bizEnv) return;
    setBizLoading(true);
    try {
      await updateBusiness({ businessId, mpesaEnvironment: bizEnv });
      setBizSaved(true);
      setTimeout(() => setBizSaved(false), 3000);
    } catch {
    } finally {
      setBizLoading(false);
    }
  };

  if (!businessId && businesses !== undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
        <Building2 className="h-10 w-10 text-muted-foreground/25 mb-3" />
        <h2 className="font-display text-xl font-bold">
          No business configured
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
          Complete onboarding to set up your business settings.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="animate-fade-up">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your business and M-Pesa configuration
        </p>
      </div>

      {/* Business info */}
      <div className="animate-fade-up delay-75">
        <Section
          icon={<Building2 className="h-4 w-4" />}
          title="Business Information"
        >
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            {[
              { label: "Name", value: business?.name },
              { label: "Slug", value: business?.slug },
              {
                label: "Short Code",
                value: business?.lipaNaMpesaShortCode ?? "—",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl bg-muted/30 border border-border px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {value ?? "—"}
                </p>
              </div>
            ))}
          </div>

          {/* Environment toggle */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Environment
            </p>
            <div className="flex gap-2">
              {(["sandbox", "production"] as const).map((e) => {
                const current = bizEnv ?? business?.mpesaEnvironment;
                return (
                  <button
                    key={e}
                    onClick={() => setBizEnv(e)}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-sm font-medium transition-all capitalize",
                      current === e
                        ? e === "production"
                          ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/8 text-amber-400"
                        : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {e}
                  </button>
                );
              })}
              {bizEnv && bizEnv !== business?.mpesaEnvironment && (
                <button
                  onClick={handleUpdateBusiness}
                  disabled={bizLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15 transition-all"
                >
                  {bizLoading ? (
                    <span
                      className="spinner"
                      style={{ width: 14, height: 14 }}
                    />
                  ) : bizSaved ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {bizSaved ? "Saved!" : "Save"}
                </button>
              )}
            </div>
          </div>
        </Section>
      </div>

      {/* M-Pesa credentials */}
      <div className="animate-fade-up delay-150">
        <Section
          icon={<KeyRound className="h-4 w-4" />}
          title="M-Pesa Credentials"
        >
          {credentials && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-400">
                Credentials are configured and encrypted
              </p>
            </div>
          )}

          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Consumer Key
                </label>
                <input
                  type="text"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder={
                    credentials?.consumerKey
                      ? "••••••••••••"
                      : "Enter consumer key"
                  }
                  required
                  className={inp}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Consumer Secret
                </label>
                <input
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder={
                    credentials?.consumerSecret
                      ? "••••••••••••"
                      : "Enter consumer secret"
                  }
                  required
                  className={inp}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Lipa Na M-Pesa Pass Key
                </label>
                <input
                  type="password"
                  value={passKey}
                  onChange={(e) => setPassKey(e.target.value)}
                  placeholder={
                    credentials?.lipaNaMpesaPassKey
                      ? "••••••••••••"
                      : "Optional"
                  }
                  className={inp}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Initiator Name
                </label>
                <input
                  type="text"
                  value={initiatorName}
                  onChange={(e) => setInitiatorName(e.target.value)}
                  placeholder={credentials?.initiatorName ?? "Optional"}
                  className={inp}
                />
              </div>
            </div>

            {credsErr && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-red-400">
                {credsErr}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={credsLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/88 active:scale-[0.97] disabled:opacity-45 shadow-md shadow-primary/15"
              >
                {credsLoading ? (
                  <span className="spinner" />
                ) : credsSaved ? (
                  <>
                    <Check className="h-4 w-4" /> Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Credentials
                  </>
                )}
              </button>
              <p className="text-xs text-muted-foreground">
                Encrypted at rest. Never shared.
              </p>
            </div>
          </form>
        </Section>
      </div>
    </div>
  );
}
