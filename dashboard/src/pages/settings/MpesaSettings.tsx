/**
 * pages/settings/MpesaSettings.tsx — /settings/mpesa
 */
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { KeyRound, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/variants";
import { inp, SaveBtn, SectionCard } from "./shared";

export default function MpesaSettings() {
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
  const updateBusiness = useMutation(api.businesses.updateBusiness);
  const setCredentialsMutation = useMutation(api.credentials.setCredentials);
  const reduce = useReducedMotion();

  const [bizEnv, setBizEnv] = useState<"sandbox" | "production" | null>(null);
  const [bizSaving, setBizSaving] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [passKey, setPassKey] = useState("");
  const [initiatorName, setInitiatorName] = useState("");
  const [credsSaving, setCredsSaving] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);
  const [credsErr, setCredsErr] = useState("");

  // Sync bizEnv once business data arrives — without this it stays null on
  // client-side navigation and the environment buttons show nothing selected.
  useEffect(() => {
    if (!business) return;
    setBizEnv(business.mpesaEnvironment ?? null);
  }, [business?._id]);

  const handleSaveBusiness = async () => {
    if (!businessId || !bizEnv) return;
    setBizSaving(true);
    try {
      await updateBusiness({ businessId, mpesaEnvironment: bizEnv });
      setBizSaved(true);
      setTimeout(() => setBizSaved(false), 2500);
    } catch {
    } finally {
      setBizSaving(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setCredsSaving(true);
    setCredsErr("");
    try {
      await setCredentialsMutation({
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
      setTimeout(() => setCredsSaved(false), 2500);
    } catch (e: any) {
      setCredsErr(e?.message ?? "Failed");
    } finally {
      setCredsSaving(false);
    }
  };

  // Show skeleton while loading
  if (businesses === undefined) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-32 rounded-xl skeleton" />
        <div className="h-40 rounded-2xl skeleton" />
        <div className="h-64 rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h2 className="font-display text-xl font-bold text-foreground">
          M-Pesa
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure your Safaricom Daraja API credentials
        </p>
      </motion.div>

      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
      >
        <SectionCard
          title="Business Environment"
          icon={Shield}
          desc="Your M-Pesa API environment"
        >
          <div className="flex flex-wrap gap-2 items-center">
            {(["sandbox", "production"] as const).map((env) => {
              const active = bizEnv === env;
              return (
                <motion.button
                  key={env}
                  type="button"
                  onClick={() => setBizEnv(env)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-medium capitalize transition-colors",
                    active && env === "production"
                      ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400"
                      : active
                        ? "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-400"
                        : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {env}
                </motion.button>
              );
            })}
            {/* Show save when selection differs from stored value */}
            {bizEnv && bizEnv !== business?.mpesaEnvironment && (
              <SaveBtn
                saving={bizSaving}
                saved={bizSaved}
                onClick={handleSaveBusiness}
              />
            )}
          </div>
        </SectionCard>
      </motion.div>

      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        <SectionCard
          title="M-Pesa Credentials"
          icon={KeyRound}
          desc="Safaricom Daraja API keys — encrypted at rest"
        >
          {credentials && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/6 px-4 py-3">
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"
              />
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                Credentials configured and encrypted
              </p>
            </div>
          )}
          <form onSubmit={handleSaveCredentials} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  id: "ck",
                  label: "Consumer Key",
                  val: consumerKey,
                  set: setConsumerKey,
                  ph: credentials ? "••••••••••••" : "Enter key",
                  req: true,
                },
                {
                  id: "cs",
                  label: "Consumer Secret",
                  val: consumerSecret,
                  set: setConsumerSecret,
                  ph: credentials ? "••••••••••••" : "Enter secret",
                  req: true,
                },
                {
                  id: "pk",
                  label: "Lipa Na M-Pesa Pass Key",
                  val: passKey,
                  set: setPassKey,
                  ph: credentials?.lipaNaMpesaPassKey ? "••••" : "Optional",
                  req: false,
                },
                {
                  id: "in",
                  label: "Initiator Name",
                  val: initiatorName,
                  set: setInitiatorName,
                  ph: credentials?.initiatorName ?? "Optional",
                  req: false,
                },
              ].map(({ id, label, val, set, ph, req }) => (
                <div key={id}>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {label}
                  </label>
                  <input
                    type={id === "ck" || id === "in" ? "text" : "password"}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={ph}
                    required={req}
                    autoComplete="new-password"
                    className={inp}
                  />
                </div>
              ))}
            </div>
            <AnimatePresence>
              {credsErr && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-destructive"
                >
                  {credsErr}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-3">
              <SaveBtn saving={credsSaving} saved={credsSaved} type="submit" />
              <p className="text-xs text-muted-foreground">
                AES-256 encrypted · never shared
              </p>
            </div>
          </form>
        </SectionCard>
      </motion.div>
    </div>
  );
}
