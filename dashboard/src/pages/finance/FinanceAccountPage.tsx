/**
 * FinanceAccountPage.tsx — /finance/account
 *
 * 4-step M-Pesa payout account setup wizard matching Polar UI:
 *  Step 1 — Review       : Organisation Details (logo, name, email, website)
 *  Step 2 — Validation   : Compliance check (can show failed / denied state)
 *  Step 3 — Account      : Payout Account setup (M-Pesa credentials)
 *  Step 4 — Identity     : Identity verification + "All payout accounts" table
 */
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Info,
  KeyRound,
  Shield,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { fadeUp, tapSpring } from "@/lib/variants";

// ── Shared styles ─────────────────────────────────────────────────────────────

const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Review", icon: Shield },
  { id: 2, label: "Validation", icon: CheckCircle2 },
  { id: 3, label: "Account", icon: UserCheck },
  { id: 4, label: "Identity", icon: CheckCircle2 },
] as const;

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  validationFailed,
}: {
  currentStep: number;
  validationFailed: boolean;
}) {
  return (
    <div className="flex items-start justify-center gap-0">
      {STEPS.map((step, i) => {
        const done = step.id < currentStep;
        const active = step.id === currentStep;
        const failed = validationFailed && step.id === 2;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-start">
            <div className="flex flex-col items-center gap-2">
              {/* Circle */}
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all",
                  done && !failed
                    ? "border-zinc-500 bg-zinc-700 text-white"
                    : active && !failed
                      ? "border-primary bg-primary text-white shadow-lg shadow-primary/30"
                      : failed
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-zinc-700 bg-zinc-800/60 text-zinc-500"
                )}
              >
                {done && !failed ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : failed ? (
                  <X className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              {/* Label */}
              <span
                className={cn(
                  "text-[11px] font-semibold whitespace-nowrap",
                  active && !failed ? "text-primary" : "",
                  done ? "text-muted-foreground" : "",
                  failed ? "text-red-500" : "",
                  !done && !active ? "text-muted-foreground/40" : ""
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-16 sm:w-24 md:w-32 mt-[22px] mx-1 transition-colors",
                  step.id < currentStep ? "bg-zinc-600" : "bg-zinc-700/50"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Avatar / Logo preview ─────────────────────────────────────────────────────

function LogoAvatar({ name }: { name: string }) {
  const initials = (name?.[0] ?? "?").toUpperCase();
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xl font-bold font-display text-white">
      {initials}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FinanceAccountPage() {
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

  const reduce = useReducedMotion();

  // Derive initial step from real data
  const hasOrg = !!business?.name;
  const hasCredentials = !!credentials;

  const initStep = !hasOrg ? 1 : !hasCredentials ? 3 : 4;
  const [step, setStep] = useState<number>(initStep);
  const [validationFailed, setValidationFailed] = useState(false);

  // Step 1 state
  const [orgName, setOrgName] = useState(business?.name ?? "");
  const [supportEmail, setSupportEmail] = useState(
    business?.supportEmail ?? ""
  );
  const [website, setWebsite] = useState(business?.website ?? "");
  const [step1Saving, setStep1Saving] = useState(false);
  const [step1Err, setStep1Err] = useState("");

  // Step 2 — simulate validation states for demo (real: poll backend)
  // validationFailed = true → shows Compliance Check / Payment Access Denied

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setStep1Saving(true);
    setStep1Err("");
    try {
      await updateBusiness({
        businessId,
        name: orgName,
        supportEmail,
        website,
      });
      setStep(2);
    } catch (ex: any) {
      setStep1Err(ex?.message ?? "Failed to save. Please try again.");
    } finally {
      setStep1Saving(false);
    }
  };

  const orgDisplayName = business?.name ?? orgName ?? "?";

  return (
    <div className="space-y-6">
      {/* Page title */}
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
          Account
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set up your M-Pesa payout account to start accepting payments
        </p>
      </motion.div>

      {/* ── Wizard card ─────────────────────────────────────── */}
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        {/* Wizard header — always visible */}
        <div className="px-6 pt-8 pb-6 text-center border-b border-border/50">
          <h2 className="font-display text-xl font-bold text-foreground mb-1">
            Set up your payout account
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            Complete these steps to start accepting payments
          </p>
          <StepIndicator
            currentStep={step}
            validationFailed={validationFailed}
          />
        </div>

        {/* ── Step content ──────────────────────────────────── */}
        <div className="px-6 py-8 max-w-2xl mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            {/* ── STEP 1: Organisation Details ──────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <h3 className="font-display text-2xl font-bold text-foreground text-center mb-1">
                  Organization Details
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-8">
                  Tell us about your organization so we can set up your M-Pesa
                  integration.
                </p>

                <form onSubmit={handleStep1}>
                  {/* Logo + fields side-by-side */}
                  <div className="rounded-2xl border border-border bg-muted/10 p-6">
                    <div className="flex gap-6">
                      {/* Logo column */}
                      <div className="shrink-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Logo
                        </p>
                        <LogoAvatar name={orgDisplayName} />
                      </div>

                      {/* Fields column */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            Organization Name{" "}
                            <span className="text-primary">*</span>
                          </label>
                          <input
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            placeholder={business?.name ?? "Your Business Ltd"}
                            required
                            className={inp}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            Support Email{" "}
                            <span className="text-primary">*</span>
                          </label>
                          <input
                            type="email"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            placeholder="support@yourcompany.com"
                            required
                            className={inp}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            Website
                          </label>
                          <input
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://yourcompany.com"
                            className={inp}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {step1Err && (
                    <p className="mt-3 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-2.5">
                      {step1Err}
                    </p>
                  )}

                  <div className="mt-6 flex justify-center">
                    <motion.button
                      type="submit"
                      disabled={step1Saving}
                      {...tapSpring}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 disabled:opacity-40 shadow-md shadow-primary/15"
                    >
                      {step1Saving ? (
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
                          Continue <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── STEP 2: Validation ────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {!validationFailed ? (
                  /* ── Validation pending / in review ─────── */
                  <>
                    <h3 className="font-display text-2xl font-bold text-foreground text-center mb-1">
                      Compliance Review
                    </h3>
                    <p className="text-sm text-muted-foreground text-center mb-8">
                      We'll review your organization details to confirm it's a
                      valid use case for Pesafy.
                    </p>

                    <div className="rounded-2xl border border-border bg-muted/10 p-6 text-center mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 mx-auto mb-4">
                        <Shield className="h-5 w-5 text-amber-500" />
                      </div>
                      <p className="text-sm font-semibold text-foreground mb-1">
                        Under Review
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        Your application is being reviewed. This typically takes
                        1–2 business days. We'll notify you via email once
                        approved.
                      </p>
                    </div>

                    {/* Demo toggle for failed state */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <motion.button
                        type="button"
                        onClick={() => setStep(3)}
                        {...tapSpring}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15"
                      >
                        Approved — Continue{" "}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => setValidationFailed(true)}
                        {...tapSpring}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/8 px-5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/15 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Simulate Denied
                      </motion.button>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-4">
                      Step 2 of 4: Validation
                    </p>
                  </>
                ) : (
                  /* ── Validation FAILED state ─────────────── */
                  <>
                    <h3 className="font-display text-2xl font-bold text-foreground text-center mb-1">
                      Compliance Check
                    </h3>
                    <p className="text-sm text-muted-foreground text-center mb-8">
                      Review your validation results and appeal status below.
                    </p>

                    <div className="rounded-2xl border border-border bg-muted/10 p-6 space-y-4">
                      {/* Denied banner */}
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            Payment Access Denied
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Technical error during validation. Manual review
                            will be conducted.
                          </p>
                        </div>
                      </div>

                      {/* What happens next */}
                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-sm font-semibold text-foreground">
                            What happens next?
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Payments are currently blocked for your organization
                          due to our compliance review. You can submit an appeal
                          below if you believe this decision is incorrect.
                        </p>
                      </div>

                      {/* Appeal form */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Appeal Message
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Explain why you believe this decision should be reconsidered…"
                          className={cn(inp, "resize-none")}
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <motion.button
                          type="button"
                          {...tapSpring}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15"
                        >
                          Submit Appeal <ArrowRight className="h-3.5 w-3.5" />
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => setValidationFailed(false)}
                          {...tapSpring}
                          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          Back
                        </motion.button>
                      </div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-4">
                      Step 2 of 4: Validation
                    </p>
                  </>
                )}
              </motion.div>
            )}

            {/* ── STEP 3: Payout Account setup ──────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <h3 className="font-display text-2xl font-bold text-foreground mb-1">
                  Payout Account
                </h3>
                <p className="text-sm text-muted-foreground mb-8">
                  Set up your M-Pesa Daraja credentials to receive payments.
                </p>

                <div className="rounded-2xl border border-border bg-muted/10 p-8 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-4">
                    <KeyRound className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-base font-bold text-foreground mb-1">
                    Create Payout Account
                  </p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                    Connect your Safaricom Daraja API credentials to receive
                    payments from your customers.
                  </p>
                  <Link to="/settings">
                    <motion.button
                      type="button"
                      {...tapSpring}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15"
                    >
                      Continue with Account Setup{" "}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </motion.button>
                  </Link>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  Step 3 of 4: Payout setup
                </p>

                {hasCredentials && (
                  <motion.button
                    type="button"
                    onClick={() => setStep(4)}
                    {...tapSpring}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Already configured — skip to Identity{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* ── STEP 4: Identity Verification ─────────────── */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Identity card */}
                <div className="rounded-2xl border border-border bg-muted/10 p-8 text-center mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/30 mx-auto mb-4">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-base font-bold text-foreground mb-1">
                    Verify Your Identity
                  </p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    To comply with financial regulations and secure your
                    account, we need to verify your identity using a
                    government-issued ID.
                  </p>
                  <motion.button
                    type="button"
                    {...tapSpring}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15"
                  >
                    Start Identity Verification{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </motion.button>
                </div>

                <p className="text-xs text-center text-muted-foreground mb-8">
                  Step 4 of 4: Verification
                </p>

                {/* All payout accounts table */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <p className="text-base font-bold text-foreground">
                      All payout accounts
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Payout accounts you manage
                    </p>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/10">
                        {["Type", "Status", "Used by", "Actions"].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {credentials ? (
                        <tr>
                          <td className="px-5 py-4 font-medium text-foreground">
                            M-Pesa
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {business?.name ?? "Active"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground">
                            {business?.slug ?? "—"}
                          </td>
                          <td className="px-5 py-4">
                            <Link to="/settings">
                              <motion.button
                                type="button"
                                {...tapSpring}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-primary/15"
                              >
                                Open dashboard
                              </motion.button>
                            </Link>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-10 text-center text-sm text-muted-foreground"
                          >
                            No payout accounts yet.{" "}
                            <Link
                              to="/settings"
                              className="text-primary hover:underline"
                            >
                              Set up now →
                            </Link>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
