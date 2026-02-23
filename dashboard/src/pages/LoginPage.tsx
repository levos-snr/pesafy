import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, Zap } from "lucide-react";
import { useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { fadeUp, heroEntrance, stagger, staggerItem } from "@/lib/variants";

// Shake animation for error state — micro-interaction
const shakeVariants = {
  initial: { x: 0 },
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.45, ease: "easeInOut" },
  },
};

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Always redirect back to the current origin so localhost stays on localhost
    // and production (pesafy.vercel.app) stays on production — automatically.
    const callbackURL = `${window.location.origin}/dashboard`;

    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email,
          password,
          name,
          callbackURL,
        });
        if (res.error) {
          setError(res.error.message ?? "Sign up failed");
          setShakeKey((k) => k + 1);
        }
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
          callbackURL,
        });
        if (res.error) {
          setError(res.error.message ?? "Invalid credentials");
          setShakeKey((k) => k + 1);
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const inp = cn(
    "w-full rounded-xl border border-border bg-input py-2.5 text-sm text-foreground",
    "placeholder:text-muted-foreground focus:outline-none",
    "transition-[border-color,box-shadow] duration-200" // timing-under-300ms ✓
  );

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      {/* Mode toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* ── Left panel ─────────────────────────────────────── */}
      <motion.div
        variants={shouldReduceMotion ? undefined : heroEntrance}
        initial="hidden"
        animate="visible"
        className="relative hidden lg:flex lg:w-1/2 flex-col items-center justify-center overflow-hidden bg-[#0d0d0d]"
      >
        <div className="absolute inset-0 grid-bg opacity-100" />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.07, 0.11, 0.07] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/4 h-80 w-80 rounded-full bg-primary blur-[80px]"
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.05, 0.09, 0.05] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-1/4 right-1/4 h-56 w-56 rounded-full bg-orange-400 blur-[60px]"
        />

        <motion.div
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex max-w-xs flex-col items-center gap-10 text-center px-6"
        >
          <motion.div
            variants={staggerItem}
            className="flex items-center gap-3"
          >
            <motion.div
              whileHover={{ rotate: [0, -15, 10, -5, 0], scale: 1.12 }}
              transition={{ duration: 0.5 }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-2xl shadow-primary/40"
            >
              <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
            </motion.div>
            <span className="font-display text-2xl font-bold text-white">
              Pesafy
            </span>
          </motion.div>

          <motion.div variants={staggerItem}>
            <h1 className="font-display text-fluid-3xl font-extrabold text-white leading-[1.15] tracking-tight">
              M-Pesa Payments
              <br />
              <span className="text-primary">for Developers</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-white/45">
              Integrate, monitor and manage M-Pesa transactions with a single
              powerful API.
            </p>
          </motion.div>

          <motion.div variants={staggerItem} className="flex gap-8">
            {[
              { v: "99.9%", l: "Uptime" },
              { v: "< 100ms", l: "Latency" },
              { v: "24/7", l: "Support" },
            ].map(({ v, l }, i) => (
              <motion.div
                key={l}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.6 + i * 0.05,
                  duration: 0.36,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="text-center"
              >
                <p className="font-display text-xl font-bold text-primary">
                  {v}
                </p>
                <p className="text-xs text-white/35 mt-0.5">{l}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 bg-background">
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[360px]"
        >
          {/* Mobile logo */}
          <motion.div
            variants={staggerItem}
            className="flex items-center gap-2 mb-10 lg:hidden"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              Pesafy
            </span>
          </motion.div>

          <div>
            <h2 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to your Pesafy dashboard"
                : "Get started in seconds — free forever"}
            </p>
          </div>

          {/* Mode toggle tab */}
          <div className="mt-7 flex rounded-xl border border-border bg-muted/50 p-1">
            {(["signin", "signup"] as const).map((m) => (
              <motion.button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                whileTap={{ scale: 0.97 }} // physics-active-state ✓
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "relative flex-1 rounded-lg py-2 text-sm font-medium",
                  "transition-colors duration-200",
                  mode === m
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode === m && (
                  <motion.span
                    layoutId="login-tab"
                    className="absolute inset-0 rounded-lg bg-card shadow-sm border border-border"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative">
                  {m === "signin" ? "Sign In" : "Sign Up"}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Form with AnimatePresence for signup field */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-0.5 pb-0.5">
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
                </motion.div>
              )}
            </AnimatePresence>

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
                <motion.button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={showPw ? "hide" : "show"}
                      initial={{ opacity: 0, rotate: -20, scale: 0.7 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: 20, scale: 0.7 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {showPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>

            {/* Error — with shake micro-interaction */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key={`error-${shakeKey}`}
                  variants={shouldReduceMotion ? undefined : shakeVariants}
                  initial="initial"
                  animate="shake"
                  exit={{
                    opacity: 0,
                    height: 0,
                    transition: { duration: 0.2 },
                  }}
                  className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={loading ? undefined : { scale: 1.02 }}
              whileTap={loading ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-semibold text-white hover:bg-primary/85 active:bg-primary/90 disabled:opacity-55 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.7,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                  <motion.span
                    animate={{ x: [0, 3, 0] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.span>
                </>
              )}
            </motion.button>
          </form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="mt-6 text-center text-xs text-muted-foreground/60"
          >
            By continuing you agree to our{" "}
            <span className="text-primary/80 cursor-pointer hover:text-primary transition-colors">
              Terms
            </span>{" "}
            &{" "}
            <span className="text-primary/80 cursor-pointer hover:text-primary transition-colors">
              Privacy Policy
            </span>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
