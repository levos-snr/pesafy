/**
 * OnboardingPage — Pesafy M-Pesa Integration Setup
 * Steps:
 *  0 — Welcome + Business Info + Policy acceptance
 *  1 — M-Pesa Environment (sandbox / production)
 *  2 — Contact (phone)
 *  3 — Done
 */
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  Globe,
  Phone,
  Shield,
  Smartphone,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// ── Country list ──────────────────────────────────────────────
const COUNTRIES = [
  { code: "KE", dial: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "UG", dial: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "TZ", dial: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "RW", dial: "+250", name: "Rwanda", flag: "🇷🇼" },
  { code: "ET", dial: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "NG", dial: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "GH", dial: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "ZA", dial: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { code: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "IN", dial: "+91", name: "India", flag: "🇮🇳" },
  { code: "AE", dial: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "SG", dial: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "LS", dial: "+266", name: "Lesotho", flag: "🇱🇸" },
  { code: "MW", dial: "+265", name: "Malawi", flag: "🇲🇼" },
  { code: "ZM", dial: "+260", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", dial: "+263", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "MZ", dial: "+258", name: "Mozambique", flag: "🇲🇿" },
  { code: "SO", dial: "+252", name: "Somalia", flag: "🇸🇴" },
  { code: "SS", dial: "+211", name: "South Sudan", flag: "🇸🇸" },
  { code: "CD", dial: "+243", name: "DR Congo", flag: "🇨🇩" },
  { code: "CM", dial: "+237", name: "Cameroon", flag: "🇨🇲" },
  { code: "SN", dial: "+221", name: "Senegal", flag: "🇸🇳" },
];

// ── Supported / prohibited use-cases specific to Pesafy ──────
const SUPPORTED_USECASES = [
  "STK Push payments (Lipa na M-Pesa)",
  "B2C disbursements & payouts",
  "B2B business payments",
  "C2B paybill & buy goods",
  "Automated payment reconciliation",
  "Real-time webhook notifications",
];

const PROHIBITED_USECASES = [
  "Gambling or lottery platforms",
  "Pyramid or MLM schemes",
  "Illegal money transfers or laundering",
  "Unauthorised financial services",
  "Counterfeit goods or fraud",
];

// ── Step config ───────────────────────────────────────────────
const STEPS = [
  { id: "business", label: "Business", icon: Sparkles },
  { id: "environment", label: "Environment", icon: Globe },
  { id: "contact", label: "Contact", icon: Phone },
  { id: "done", label: "Done", icon: Check },
];

// ── Motion variants ───────────────────────────────────────────
const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0, scale: 0.97 }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 30 },
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 48 : -48,
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  }),
};

// ── Input style ───────────────────────────────────────────────
const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";

// ── Slug generator ────────────────────────────────────────────
function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const createBusiness = useMutation(api.businesses.createBusiness);
  const updateProfile = useMutation(api.userProfile.updateProfile);
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoad] = useState(false);
  const [error, setError] = useState("");

  // Step 0 — Business
  const [bizName, setBizName] = useState("");
  const [bizSlug, setBizSlug] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPolicy, setAgreedPolicy] = useState(false);
  const [agreedKyc, setAgreedKyc] = useState(false);

  // Step 1 — Environment
  const [environment, setEnv] = useState<"sandbox" | "production">("sandbox");

  // Step 2 — Contact
  const [selectedCountry, setCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhone] = useState("");
  const [countrySearch, setSearch] = useState("");
  const [showCountryList, setShowList] = useState(false);

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dial.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
    setError("");
  };

  const handleNext = async () => {
    // Validate step 0
    if (step === 0) {
      if (!bizName.trim()) {
        setError("Business name is required");
        return;
      }
      if (!bizSlug.trim()) {
        setError("Slug is required");
        return;
      }
      if (!agreedTerms) {
        setError("Please accept the Terms of Service");
        return;
      }
      if (!agreedPolicy) {
        setError("Please accept the Privacy Policy");
        return;
      }
      if (!agreedKyc) {
        setError("Please acknowledge the account review policy");
        return;
      }
    }

    // Final save on step 2 (contact)
    if (step === 2) {
      setLoad(true);
      setError("");
      try {
        await createBusiness({
          name: bizName.trim(),
          slug: bizSlug.trim(),
          mpesaEnvironment: environment,
        });
        if (phoneNumber.trim()) {
          await updateProfile({
            phoneNumber: `${selectedCountry.dial}${phoneNumber.replace(/^0+/, "")}`,
            phoneCountryCode: selectedCountry.dial,
          });
        }
        goTo(3);
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong");
      } finally {
        setLoad(false);
      }
      return;
    }

    if (step < STEPS.length - 1) goTo(step + 1);
  };

  const progress = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
      {/* Ambient glow */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.04, 0.09, 0.04] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-1/3 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-primary/50 blur-[140px] pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-[520px]">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2.5 justify-center mb-8"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Pesafy
          </span>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 pt-7 pb-5 border-b border-border">
            {/* Step pills */}
            <div className="flex items-center justify-between mb-5">
              {STEPS.map(({ label, icon: Icon }, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <div key={label} className="flex items-center gap-1.5">
                    <motion.div
                      animate={{
                        backgroundColor: done
                          ? "var(--primary)"
                          : active
                            ? "var(--primary)"
                            : "transparent",
                        borderColor:
                          done || active ? "var(--primary)" : "var(--border)",
                        scale: active ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.25 }}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold"
                    >
                      {done ? (
                        <Check
                          className="h-3.5 w-3.5 text-white"
                          strokeWidth={3}
                        />
                      ) : (
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5",
                            active ? "text-white" : "text-muted-foreground"
                          )}
                        />
                      )}
                    </motion.div>
                    <span
                      className={cn(
                        "hidden sm:block text-[11px] font-semibold",
                        active
                          ? "text-foreground"
                          : done
                            ? "text-primary"
                            : "text-muted-foreground/50"
                      )}
                    >
                      {label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className="hidden sm:block w-8 h-px bg-border mx-1" />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Progress bar */}
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
            <AnimatePresence custom={dir} mode="wait" initial={false}>
              <motion.div
                key={step}
                custom={dir}
                variants={reduce ? undefined : pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="px-8 py-6"
              >
                {/* ── STEP 0: Business Setup ─────────────────────── */}
                {step === 0 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-xl font-extrabold text-foreground">
                        Let's get you started
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Set up your business to start accepting M-Pesa payments.
                      </p>
                    </div>

                    {/* Business Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Business Name
                      </label>
                      <input
                        className={inp}
                        placeholder="e.g. Acme Holdings"
                        value={bizName}
                        onChange={(e) => {
                          setBizName(e.target.value);
                          if (!bizSlug || bizSlug === toSlug(bizName)) {
                            setBizSlug(toSlug(e.target.value));
                          }
                        }}
                      />
                    </div>

                    {/* Slug */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Business Slug
                      </label>
                      <div className="relative">
                        <input
                          className={cn(inp, "pl-[72px] font-mono text-xs")}
                          placeholder="acme-holdings"
                          value={bizSlug}
                          onChange={(e) => setBizSlug(toSlug(e.target.value))}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50 font-mono">
                          pesafy/
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/60">
                        Used in webhook URLs — lowercase letters, numbers and
                        hyphens only.
                      </p>
                    </div>

                    {/* Supported Use Cases */}
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        Supported Use Cases
                      </p>
                      <ul className="space-y-1">
                        {SUPPORTED_USECASES.map((u) => (
                          <li
                            key={u}
                            className="text-xs text-muted-foreground flex items-center gap-1.5"
                          >
                            <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Prohibited Use Cases */}
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                      <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Prohibited Use Cases
                      </p>
                      <ul className="space-y-1">
                        {PROHIBITED_USECASES.map((u) => (
                          <li
                            key={u}
                            className="text-xs text-muted-foreground flex items-center gap-1.5"
                          >
                            <span className="h-1 w-1 rounded-full bg-destructive/60 shrink-0" />
                            {u}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-muted-foreground/60 mt-2">
                        Transactions that violate our policy will be cancelled
                        and reversed.
                      </p>
                    </div>

                    {/* Agreements */}
                    <div className="space-y-3">
                      {[
                        {
                          key: "terms",
                          checked: agreedTerms,
                          set: setAgreedTerms,
                          label: (
                            <>
                              I understand the restrictions above and agree to
                              Pesafy's{" "}
                              <a
                                href="#"
                                className="text-primary underline underline-offset-2"
                              >
                                Terms of Service
                              </a>
                            </>
                          ),
                        },
                        {
                          key: "privacy",
                          checked: agreedPolicy,
                          set: setAgreedPolicy,
                          label: (
                            <>
                              I have read and accept the{" "}
                              <a
                                href="#"
                                className="text-primary underline underline-offset-2"
                              >
                                Privacy Policy
                              </a>
                            </>
                          ),
                        },
                        {
                          key: "kyc",
                          checked: agreedKyc,
                          set: setAgreedKyc,
                          label:
                            "Account Reviews Policy — I'll comply with KYC/AML requirements including Safaricom Daraja API verification",
                        },
                      ].map(({ key, checked, set, label }) => (
                        <label
                          key={key}
                          className="flex items-start gap-3 cursor-pointer group"
                        >
                          <motion.div
                            onClick={() => set(!checked)}
                            animate={{
                              backgroundColor: checked
                                ? "var(--primary)"
                                : "transparent",
                              borderColor: checked
                                ? "var(--primary)"
                                : "var(--border)",
                            }}
                            transition={{ duration: 0.15 }}
                            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2"
                          >
                            <AnimatePresence>
                              {checked && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 600,
                                    damping: 22,
                                  }}
                                >
                                  <Check
                                    className="h-2.5 w-2.5 text-white"
                                    strokeWidth={3}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── STEP 1: M-Pesa Environment ─────────────────── */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-xl font-extrabold text-foreground">
                        Choose Environment
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Select your Safaricom Daraja API environment.
                      </p>
                    </div>

                    {/* Environment Cards */}
                    <div className="grid gap-3">
                      {(
                        [
                          {
                            id: "sandbox",
                            label: "Sandbox",
                            tag: "TESTING",
                            desc: "Use Safaricom's test environment. Simulated payments — no real money.",
                            icon: Terminal,
                            iconColor: "text-amber-500 bg-amber-500/10",
                          },
                          {
                            id: "production",
                            label: "Production",
                            tag: "LIVE",
                            desc: "Real Safaricom Daraja API. Live M-Pesa transactions with actual money.",
                            icon: Globe,
                            iconColor: "text-emerald-500 bg-emerald-500/10",
                          },
                        ] as const
                      ).map(
                        ({ id, label, tag, desc, icon: Icon, iconColor }) => (
                          <motion.button
                            key={id}
                            type="button"
                            onClick={() => setEnv(id)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                            className={cn(
                              "relative w-full text-left rounded-xl border-2 p-4 transition-colors",
                              environment === id
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:border-border/80"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                  iconColor
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">
                                    {label}
                                  </p>
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                      id === "sandbox"
                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    )}
                                  >
                                    {tag}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  {desc}
                                </p>
                              </div>
                            </div>
                            <AnimatePresence>
                              {environment === id && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 600,
                                    damping: 24,
                                  }}
                                  className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary"
                                >
                                  <Check
                                    className="h-3 w-3 text-white"
                                    strokeWidth={3}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        )
                      )}
                    </div>

                    {/* Info box */}
                    <div className="flex gap-3 rounded-xl border border-border bg-muted/20 p-4">
                      <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        You can switch between environments at any time from
                        your Settings page. We recommend starting with{" "}
                        <strong className="text-foreground">Sandbox</strong> to
                        validate your integration before going live.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Contact ────────────────────────────── */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-xl font-extrabold text-foreground">
                        Your contact number
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Optional — used for M-Pesa STK push testing and
                        notifications.
                      </p>
                    </div>

                    {/* Country selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Country
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowList(!showCountryList)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground text-left",
                            "hover:border-primary/30 transition-colors"
                          )}
                        >
                          <span className="text-base">
                            {selectedCountry.flag}
                          </span>
                          <span className="flex-1">{selectedCountry.name}</span>
                          <span className="text-muted-foreground font-mono text-xs">
                            {selectedCountry.dial}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              showCountryList && "rotate-180"
                            )}
                          />
                        </button>

                        <AnimatePresence>
                          {showCountryList && (
                            <motion.div
                              initial={{ opacity: 0, y: -6, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.97 }}
                              transition={{
                                duration: 0.15,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
                            >
                              <div className="p-2 border-b border-border">
                                <input
                                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                                  placeholder="Search country..."
                                  value={countrySearch}
                                  onChange={(e) => setSearch(e.target.value)}
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {filteredCountries.map((c) => (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => {
                                      setCountry(c);
                                      setShowList(false);
                                      setSearch("");
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-muted/60 transition-colors",
                                      selectedCountry.code === c.code &&
                                        "bg-primary/5 text-primary"
                                    )}
                                  >
                                    <span>{c.flag}</span>
                                    <span className="flex-1">{c.name}</span>
                                    <span className="text-xs font-mono text-muted-foreground">
                                      {c.dial}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Phone number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Phone Number
                      </label>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm font-mono text-muted-foreground shrink-0">
                          <span className="text-base">
                            {selectedCountry.flag}
                          </span>
                          {selectedCountry.dial}
                        </div>
                        <input
                          className={cn(inp, "flex-1")}
                          placeholder="712 345 678"
                          value={phoneNumber}
                          onChange={(e) =>
                            setPhone(e.target.value.replace(/\D/g, ""))
                          }
                          type="tel"
                          inputMode="numeric"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground/60">
                        Enter without the leading zero. E.g. 712345678
                      </p>
                    </div>

                    <div className="flex gap-3 rounded-xl border border-border bg-muted/20 p-4">
                      <Smartphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This number will be pre-filled when you initiate STK
                        Push test payments from the dashboard. You can change it
                        anytime in your profile settings.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Done ───────────────────────────────── */}
                {step === 3 && (
                  <div className="text-center py-4">
                    <div className="relative flex h-20 w-20 items-center justify-center mx-auto mb-6">
                      {[1, 2].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1 + i * 0.3, opacity: 0 }}
                          transition={{
                            duration: 1,
                            delay: i * 0.2,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                          className="absolute inset-0 rounded-full border-2 border-primary"
                        />
                      ))}
                      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-xl shadow-primary/30">
                        <motion.svg
                          viewBox="0 0 24 24"
                          className="h-10 w-10"
                          fill="none"
                        >
                          <motion.path
                            d="M7 12.5L10.5 16L17 9"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{
                              delay: 0.3,
                              duration: 0.5,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          />
                        </motion.svg>
                      </div>
                    </div>

                    <motion.h2
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="font-display text-2xl font-extrabold text-foreground mb-2"
                    >
                      You're all set! 🎉
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-sm text-muted-foreground leading-relaxed mb-6"
                    >
                      <strong className="text-foreground">{bizName}</strong> is
                      ready to accept M-Pesa payments
                      {environment === "sandbox"
                        ? " in Sandbox mode."
                        : " in Production mode."}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-2.5"
                    >
                      {[
                        {
                          label: "Add Daraja API credentials",
                          path: "/settings",
                          icon: Shield,
                        },
                        {
                          label: "Send your first STK Push",
                          path: "/payments",
                          icon: Smartphone,
                        },
                        {
                          label: "Configure payment webhooks",
                          path: "/webhooks",
                          icon: Zap,
                        },
                      ].map(({ label, path, icon: Icon }, i) => (
                        <motion.button
                          key={path}
                          type="button"
                          onClick={() => navigate(path)}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: 0.55 + i * 0.08,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="w-full flex items-center gap-3 rounded-xl border border-border bg-muted/10 hover:border-primary/20 hover:bg-primary/5 px-4 py-3 text-sm text-left transition-colors text-foreground"
                        >
                          <Icon className="h-4 w-4 text-primary" />
                          {label}
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                        </motion.button>
                      ))}
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          {step < 3 && (
            <div className="flex items-center justify-between border-t border-border px-8 py-4 bg-muted/10">
              <motion.button
                type="button"
                onClick={() => goTo(Math.max(0, step - 1))}
                disabled={step === 0}
                whileHover={step > 0 ? { scale: 1.03 } : undefined}
                whileTap={step > 0 ? { scale: 0.97 } : undefined}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </motion.button>

              <div className="flex items-center gap-3">
                {/* Skip contact step */}
                {step === 2 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip for now
                  </button>
                )}
                {error && (
                  <p className="text-xs text-destructive max-w-[180px] text-right">
                    {error}
                  </p>
                )}

                <motion.button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 disabled:opacity-50 shadow-lg shadow-primary/20"
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
                  ) : step === 2 ? (
                    <>
                      <Check className="h-4 w-4" /> Finish Setup
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          )}

          {/* Done footer */}
          {step === 3 && (
            <div className="border-t border-border px-8 py-4 bg-muted/10">
              <motion.button
                type="button"
                onClick={() => navigate("/dashboard")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/85 shadow-lg shadow-primary/20"
              >
                Go to Dashboard →
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Already have account */}
        {step === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground mt-5"
          >
            Need help?{" "}
            <a
              href="mailto:support@pesafy.com"
              className="text-primary hover:underline underline-offset-2"
            >
              Contact support
            </a>
          </motion.p>
        )}
      </div>
    </div>
  );
}
