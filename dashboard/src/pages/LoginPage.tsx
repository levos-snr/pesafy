import { ArrowRight, Eye, EyeOff, Lock, Mail, User, Zap } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({ email, password, name });
        if (res.error) setError(res.error.message ?? "Sign up failed");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) setError(res.error.message ?? "Invalid credentials");
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inp = cn(
    "w-full rounded-xl border border-border bg-input py-2.5 text-sm text-foreground",
    "placeholder:text-muted-foreground transition-all duration-200",
    "focus:outline-none focus:border-primary/60 focus:ring-3 focus:ring-primary/10"
  );

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ───────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col items-center justify-center overflow-hidden bg-[#0a0a12]">
        <div className="absolute inset-0 grid-bg opacity-100" />
        <div className="absolute top-1/3 left-1/4 h-80 w-80 rounded-full bg-primary/7 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-56 w-56 rounded-full bg-orange-400/5 blur-[60px] pointer-events-none" />

        <div className="relative z-10 flex max-w-xs flex-col items-center gap-10 text-center">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-2xl shadow-primary/40">
              <Zap className="h-5.5 w-5.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-2xl font-bold text-white">
              Pesafy
            </span>
          </div>

          {/* Headline */}
          <div>
            <h1 className="font-display text-4xl font-extrabold text-white leading-[1.15] tracking-tight">
              M-Pesa Payments
              <br />
              <span className="text-primary">for Developers</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-white/45">
              Integrate, monitor and manage M-Pesa transactions with a single
              powerful API.
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex gap-6">
            {[
              { v: "99.9%", l: "Uptime" },
              { v: "< 100ms", l: "Latency" },
              { v: "24/7", l: "Support" },
            ].map(({ v, l }) => (
              <div key={l} className="text-center">
                <p className="font-display text-xl font-bold text-primary">
                  {v}
                </p>
                <p className="text-xs text-white/35 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 bg-background">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold">Pesafy</span>
          </div>

          <div className="animate-fade-up">
            <h2 className="font-display text-[1.6rem] font-bold tracking-tight text-foreground">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to your Pesafy dashboard"
                : "Get started in seconds — free forever"}
            </p>
          </div>

          {/* Toggle */}
          <div className="mt-7 flex rounded-xl border border-border bg-muted/50 p-1 animate-fade-up delay-75">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200",
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-5 space-y-3.5 animate-fade-up delay-150"
          >
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className={cn(inp, "pl-10 pr-4")}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className={cn(inp, "pl-10 pr-4")}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground pointer-events-none" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "signup" ? "Min. 8 characters" : "••••••••"
                  }
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  className={cn(inp, "pl-10 pr-10")}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm text-red-400 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-primary/88 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground/60 animate-fade-up delay-300">
            By continuing you agree to our{" "}
            <span className="text-primary/80 cursor-pointer hover:text-primary">
              Terms
            </span>{" "}
            &{" "}
            <span className="text-primary/80 cursor-pointer hover:text-primary">
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
