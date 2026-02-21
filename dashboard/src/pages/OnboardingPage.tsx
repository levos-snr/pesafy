import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Globe,
  Rocket,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OnboardingPageProps {
  user?: { name?: string | null; email?: string | null } | null;
}

const STEPS = [
  { id: 1, label: "Business", icon: Building2 },
  { id: 2, label: "Environment", icon: Globe },
  { id: 3, label: "Launch", icon: Rocket },
];

export default function OnboardingPage({ user }: OnboardingPageProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [env, setEnv] = useState<"sandbox" | "production">("sandbox");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createBusiness = useMutation(api.businesses.createBusiness);

  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(
      v
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/--+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;
    setLoading(true);
    setError("");
    try {
      await createBusiness({
        name: name.trim(),
        slug: slug.trim(),
        mpesaEnvironment: env,
      });
      setStep(3);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create business");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-primary/6 blur-[100px]" />
      </div>

      {/* Logo */}
      <div className="relative flex items-center gap-2.5 mb-12 animate-fade-up">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-xl shadow-primary/35">
          <Zap className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-display text-xl font-bold text-foreground">
          Pesafy
        </span>
      </div>

      {/* Step indicators */}
      <div className="relative flex items-center gap-0 mb-10 animate-fade-up delay-75">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                  step > s.id
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : step === s.id
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {step > s.id ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  s.id
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium hidden sm:block",
                  step === s.id ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-14 mx-2 mb-4 transition-all duration-500",
                  step > s.id ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="relative w-full max-w-[420px] rounded-2xl border border-border bg-card shadow-2xl shadow-black/30 overflow-hidden animate-fade-up delay-150">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="p-7">
          {/* ── Step 1: Business name ── */}
          {step === 1 && (
            <div key="step1" className="animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
                Step 1 of 2
              </p>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Name your business
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                This appears in your dashboard and API responses.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Acme Enterprises"
                    autoFocus
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/55 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Slug
                  </label>
                  <div className="flex items-stretch rounded-xl border border-border bg-input overflow-hidden">
                    <div className="flex items-center px-3.5 border-r border-border bg-muted/30">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        api/
                      </span>
                    </div>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "")
                        )
                      }
                      className="flex-1 bg-transparent px-3.5 py-3 text-sm text-foreground focus:outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Unique identifier, auto-generated from name
                  </p>
                </div>
              </div>

              <button
                disabled={!name.trim() || !slug.trim()}
                onClick={() => setStep(2)}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-semibold text-white transition-all hover:bg-primary/88 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Environment ── */}
          {step === 2 && (
            <div key="step2" className="animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
                Step 2 of 2
              </p>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Choose environment
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Start with Sandbox to test. Switch to Production when ready.
              </p>

              <div className="mt-6 space-y-3">
                {(["sandbox", "production"] as const).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEnv(e)}
                    className={cn(
                      "w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200",
                      env === e
                        ? "border-primary/45 bg-primary/6"
                        : "border-border hover:border-border/70 bg-muted/20"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        env === e
                          ? "border-primary"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {env === e && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground capitalize">
                        {e}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e === "sandbox"
                          ? "Test payments — no real money involved"
                          : "Live M-Pesa transactions with real credentials"}
                      </p>
                    </div>
                    {e === "production" && (
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-amber-400 border border-amber-400/30 bg-amber-400/10 rounded-full px-2 py-0.5">
                        Live
                      </span>
                    )}
                    {e === "sandbox" && (
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 rounded-full px-2 py-0.5">
                        Safe
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-semibold text-white transition-all hover:bg-primary/88 active:scale-[0.98] disabled:opacity-55 shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <span className="spinner" />
                  ) : (
                    <>
                      Create Business <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Success ── */}
          {step === 3 && (
            <div key="step3" className="animate-fade-up text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Check className="h-8 w-8 text-emerald-400" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                You're all set!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                <strong className="text-foreground">{name}</strong> has been
                created. Time to integrate M-Pesa.
              </p>

              <div className="mt-7 rounded-xl border border-border bg-muted/20 p-4 text-left space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Next steps
                </p>
                {[
                  "Add M-Pesa API credentials in Settings",
                  "Configure webhook endpoints",
                  "Initiate your first STK Push test",
                ].map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm text-foreground/75"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary text-[10px] font-bold">
                      {i + 1}
                    </div>
                    {s}
                  </div>
                ))}
              </div>

              <button
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-semibold text-white transition-all hover:bg-primary/88 active:scale-[0.98] shadow-lg shadow-primary/20"
              >
                Go to Dashboard <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Greeting */}
      <p className="relative mt-6 text-sm text-muted-foreground animate-fade-up delay-225">
        Welcome,{" "}
        <span className="text-foreground font-medium">
          {user?.name ?? user?.email ?? "there"}
        </span>{" "}
        👋
      </p>
    </div>
  );
}
