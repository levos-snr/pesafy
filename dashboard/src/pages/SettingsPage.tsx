import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Building2, Check, KeyRound, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  fadeUp,
  stagger,
  staggerItem,
  tapSpring,
  viewport,
} from "@/lib/variants";

const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:outline-none";

function Section({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      transition={{ delay }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <motion.div
          whileHover={{ scale: 1.15, rotate: 8 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        >
          {icon}
        </motion.div>
        <h3 className="font-display font-semibold text-[15px] text-foreground">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
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
  const shouldReduceMotion = useReducedMotion();

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
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Building2 className="h-10 w-10 text-muted-foreground/25 mb-3" />
        </motion.div>
        <h2 className="font-display text-xl font-bold text-foreground">
          No business configured
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
          Complete onboarding to set up your business settings.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your business and M-Pesa configuration
        </p>
      </motion.div>

      {/* Business info */}
      <Section
        icon={<Building2 className="h-4 w-4" />}
        title="Business Information"
        delay={0.05}
      >
        <motion.div
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
          className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-4"
        >
          {[
            { label: "Name", value: business?.name },
            { label: "Slug", value: business?.slug },
            {
              label: "Short Code",
              value: business?.lipaNaMpesaShortCode ?? "—",
            },
          ].map(({ label, value }) => (
            <motion.div
              key={label}
              variants={shouldReduceMotion ? undefined : staggerItem}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="rounded-xl bg-muted/30 border border-border px-4 py-3 cursor-default"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {value ?? "—"}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Environment toggle */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Environment
          </p>
          <div className="flex flex-wrap gap-2">
            {(["sandbox", "production"] as const).map((e) => {
              const current = bizEnv ?? business?.mpesaEnvironment;
              const isActive = current === e;
              return (
                <motion.button
                  key={e}
                  onClick={() => setBizEnv(e)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-medium transition-colors capitalize",
                    isActive
                      ? e === "production"
                        ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-400"
                      : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {e}
                </motion.button>
              );
            })}
            {bizEnv && bizEnv !== business?.mpesaEnvironment && (
              <motion.button
                onClick={handleUpdateBusiness}
                disabled={bizLoading}
                initial={{ opacity: 0, scale: 0.85, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={bizSaved ? "saved" : "save"}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                  >
                    {bizLoading ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="block h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary"
                      />
                    ) : bizSaved ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </motion.span>
                </AnimatePresence>
                {bizSaved ? "Saved!" : "Save"}
              </motion.button>
            )}
          </div>
        </div>
      </Section>

      {/* M-Pesa credentials */}
      <Section
        icon={<KeyRound className="h-4 w-4" />}
        title="M-Pesa Credentials"
        delay={0.1}
      >
        <AnimatePresence>
          {credentials && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </motion.div>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Credentials are configured and encrypted
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSaveCredentials} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {[
              {
                id: "ck",
                label: "Consumer Key",
                val: consumerKey,
                set: setConsumerKey,
                type: "text",
                ph: credentials?.consumerKey
                  ? "••••••••••••"
                  : "Enter consumer key",
                required: true,
              },
              {
                id: "cs",
                label: "Consumer Secret",
                val: consumerSecret,
                set: setConsumerSecret,
                type: "password",
                ph: credentials?.consumerSecret
                  ? "••••••••••••"
                  : "Enter consumer secret",
                required: true,
              },
              {
                id: "pk",
                label: "Lipa Na M-Pesa Pass Key",
                val: passKey,
                set: setPassKey,
                type: "password",
                ph: credentials?.lipaNaMpesaPassKey
                  ? "••••••••••••"
                  : "Optional",
                required: false,
              },
              {
                id: "in",
                label: "Initiator Name",
                val: initiatorName,
                set: setInitiatorName,
                type: "text",
                ph: credentials?.initiatorName ?? "Optional",
                required: false,
              },
            ].map(({ id, label, val, set, type, ph, required }) => (
              <div key={id}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {label}
                </label>
                <input
                  type={type}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder={ph}
                  required={required}
                  className={inp}
                  autoComplete="new-password"
                />
              </div>
            ))}
          </div>

          <AnimatePresence>
            {credsErr && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
              >
                {credsErr}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              type="submit"
              disabled={credsLoading}
              {...tapSpring}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 disabled:opacity-45 shadow-md shadow-primary/15"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={credsSaved ? "saved" : credsLoading ? "loading" : "save"}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                >
                  {credsLoading ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.7,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    />
                  ) : credsSaved ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </motion.span>
              </AnimatePresence>
              {credsSaved ? "Saved!" : "Save Credentials"}
            </motion.button>
            <p className="text-xs text-muted-foreground">
              Encrypted at rest. Never shared.
            </p>
          </div>
        </form>
      </Section>
    </div>
  );
}
