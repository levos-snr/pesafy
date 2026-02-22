import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";
import {
  fadeUp,
  scalePop,
  stagger,
  staggerItem,
  tapSpring,
} from "@/lib/variants";

const STEPS = [
  { id: 1, label: "Business", icon: Building2 },
  { id: 2, label: "Environment", icon: Globe },
  { id: 3, label: "Launch", icon: Rocket },
];

interface OnboardingPageProps {
  user?: { name?: string | null; email?: string | null } | null;
}

export default function OnboardingPage({ user }: OnboardingPageProps) {
  const [step, setStep] = useState(1);
  const [prevStep, setPrevStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [env, setEnv] = useState<"sandbox" | "production">("sandbox");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const shouldReduceMotion = useReducedMotion();

  const createBusiness = useMutation(api.businesses.createBusiness);

  const goTo = (next: number) => {
    setPrevStep(step);
    setStep(next);
  };

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
      goTo(3);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create business");
    } finally {
      setLoading(false);
    }
  };

  const direction = step > prevStep ? 1 : -1;
  const stepVariants = {
    enter: { opacity: 0, x: shouldReduceMotion ? 0 : 32 * direction },
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: {
      opacity: 0,
      x: shouldReduceMotion ? 0 : -24 * direction,
      transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
    },
  };

  const inp =
    "w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 transition-colors duration-300">
      <div className="fixed top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Ambient */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.08, 0.05] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-primary blur-[100px]"
      />

      {/* Logo */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="relative flex items-center gap-2.5 mb-12"
      >
        <motion.div
          whileHover={{ rotate: [0, -12, 8, 0], scale: 1.1 }}
          transition={{ duration: 0.45 }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-xl shadow-primary/35"
        >
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </motion.div>
        <span className="font-display text-xl font-bold text-foreground">
          Pesafy
        </span>
      </motion.div>

      {/* Step indicators */}
      <motion.div
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
        className="relative flex items-center gap-0 mb-10"
      >
        {STEPS.map((s, i) => (
          <motion.div
            key={s.id}
            variants={staggerItem}
            className="flex items-center"
          >
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={
                  step > s.id ? "done" : step === s.id ? "active" : "inactive"
                }
                variants={{
                  inactive: {
                    scale: 1,
                    backgroundColor: "var(--muted)",
                    color: "var(--muted-foreground)",
                  },
                  active: {
                    scale: 1.12,
                    backgroundColor: "rgba(var(--primary),0.15)",
                    color: "var(--primary)",
                  },
                  done: {
                    scale: 1,
                    backgroundColor: "var(--primary)",
                    color: "#fff",
                  },
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold border border-border"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {step > s.id ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 26,
                      }}
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="num"
                      initial={{ scale: 0.7 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 28,
                      }}
                    >
                      {s.id}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
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
              <motion.div
                animate={{ scaleX: step > s.id ? 1 : 0 }}
                initial={{ scaleX: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="h-px w-14 mx-2 mb-4 bg-primary origin-left"
                style={{ transformOrigin: "left" }}
              />
            )}
            {/* Background bar */}
            {i < STEPS.length - 1 && (
              <div
                className="absolute h-px w-14 mx-2 mb-4 bg-border -z-10"
                style={{ left: `calc(${i * 3.5}rem + 2.25rem)` }}
              />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Card */}
      <motion.div
        variants={shouldReduceMotion ? undefined : scalePop}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-[420px] rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* Step content — animated between steps */}
        <div className="p-6 sm:p-7 overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            {step === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
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
                      className={inp}
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
                      Auto-generated from name
                    </p>
                  </div>
                </div>

                <motion.button
                  disabled={!name.trim() || !slug.trim()}
                  onClick={() => goTo(2)}
                  whileHover={
                    !name.trim() || !slug.trim() ? undefined : { scale: 1.02 }
                  }
                  whileTap={
                    !name.trim() || !slug.trim() ? undefined : { scale: 0.97 }
                  }
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-semibold text-white hover:bg-primary/85 disabled:opacity-45 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
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
                    <motion.button
                      key={e}
                      type="button"
                      onClick={() => setEnv(e)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200",
                        env === e
                          ? "border-primary/45 bg-primary/6"
                          : "border-border hover:border-primary/20 bg-muted/20"
                      )}
                    >
                      <motion.div
                        animate={env === e ? { scale: 1.1 } : { scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 28,
                        }}
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                          env === e
                            ? "border-primary"
                            : "border-muted-foreground/40"
                        )}
                      >
                        <AnimatePresence>
                          {env === e && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{
                                type: "spring",
                                stiffness: 600,
                                damping: 22,
                              }}
                              className="h-2.5 w-2.5 rounded-full bg-primary"
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground capitalize">
                          {e}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {e === "sandbox"
                            ? "Test payments — no real money involved"
                            : "Live M-Pesa transactions with real credentials"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 border",
                          e === "production"
                            ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
                            : "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        )}
                      >
                        {e === "production" ? "Live" : "Safe"}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 flex gap-3">
                  <motion.button
                    onClick={() => goTo(1)}
                    {...tapSpring}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </motion.button>
                  <motion.button
                    onClick={handleCreate}
                    disabled={loading}
                    whileHover={loading ? undefined : { scale: 1.02 }}
                    whileTap={loading ? undefined : { scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-semibold text-white hover:bg-primary/85 disabled:opacity-55 shadow-lg shadow-primary/20"
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
                        Create Business <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="text-center"
              >
                {/* Animated SVG checkmark */}
                <div className="mx-auto mb-5 flex items-center justify-center">
                  <motion.svg
                    width="72"
                    height="72"
                    viewBox="0 0 72 72"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  >
                    <motion.circle
                      cx="36"
                      cy="36"
                      r="32"
                      fill="none"
                      stroke="rgb(16 185 129)"
                      strokeWidth="3"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <motion.path
                      d="M20 36 L30 46 L52 24"
                      fill="none"
                      stroke="rgb(16 185 129)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{
                        duration: 0.35,
                        delay: 0.35,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </motion.svg>
                </div>

                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.4,
                    duration: 0.35,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="font-display text-2xl font-bold text-foreground"
                >
                  You're all set!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-2 text-sm text-muted-foreground"
                >
                  <strong className="text-foreground">{name}</strong> has been
                  created. Time to integrate M-Pesa.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-7 rounded-xl border border-border bg-muted/20 p-4 text-left space-y-3"
                >
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Next steps
                  </p>
                  {[
                    "Add M-Pesa API credentials in Settings",
                    "Configure webhook endpoints",
                    "Initiate your first STK Push test",
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.65 + i * 0.05,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="flex items-center gap-3 text-sm text-foreground/75"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary text-[10px] font-bold">
                        {i + 1}
                      </div>
                      {s}
                    </motion.div>
                  ))}
                </motion.div>

                <motion.button
                  onClick={() => window.location.reload()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ transitionDelay: "0.75s" }}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-semibold text-white hover:bg-primary/85 shadow-lg shadow-primary/20"
                >
                  Go to Dashboard <ChevronRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative mt-6 text-sm text-muted-foreground"
      >
        Welcome,{" "}
        <span className="text-foreground font-medium">
          {user?.name ?? user?.email ?? "there"}
        </span>{" "}
        👋
      </motion.p>
    </div>
  );
}
