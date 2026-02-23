/**
 * SettingsPage.tsx — /settings
 *
 * Tabs: General · Billing · Members · Webhooks · Custom Fields
 * (+ existing M-Pesa · Appearance · Notifications preserved)
 *
 * Matches Polar-style Settings UI adapted for Pesafy/M-Pesa.
 */
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  KeyRound,
  Monitor,
  Moon,
  Plus,
  Save,
  Settings2,
  Shield,
  Sun,
  Tag,
  Trash2,
  Users,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { fadeUp, tapSpring } from "@/lib/variants";

// ── Shared ────────────────────────────────────────────────────────────────────

const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";

const sel =
  "rounded-xl border border-border bg-input px-3 py-2 pr-8 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer";

// ── Tab config ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "general", label: "General", icon: Building2 },
  { id: "billing", label: "Billing", icon: FileText },
  { id: "members", label: "Members", icon: Users },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "customfields", label: "Custom Fields", icon: Tag },
  { id: "mpesa", label: "M-Pesa", icon: Zap },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "notifications", label: "Alerts", icon: Bell },
] as const;

type Tab = (typeof TABS)[number]["id"];

// ── Shared components ─────────────────────────────────────────────────────────

function SectionCard({
  title,
  desc,
  icon: Icon,
  children,
}: {
  title: string;
  desc?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {(title || Icon) && (
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <h3 className="font-display font-semibold text-foreground">
              {title}
            </h3>
            {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <motion.button
        type="button"
        onClick={() => onChange(!checked)}
        whileTap={{ scale: 0.93 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "relative flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200",
          checked ? "bg-primary border-primary" : "bg-muted border-border"
        )}
        role="switch"
        aria-checked={checked}
      >
        <motion.span
          layout
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 600, damping: 30 }}
          className={cn(
            "h-4 w-4 rounded-full shadow-sm",
            checked ? "bg-white" : "bg-muted-foreground/40"
          )}
        />
      </motion.button>
    </div>
  );
}

function SelectRow({
  label,
  desc,
  value,
  onChange,
  options,
}: {
  label: string;
  desc?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="relative shrink-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={sel}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

function CopyRow({
  label,
  desc,
  value,
}: {
  label: string;
  desc?: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm text-muted-foreground font-mono max-w-[180px] truncate">
          {value}
        </span>
        <motion.button
          type="button"
          onClick={copy}
          {...tapSpring}
          className="rounded-lg border border-border bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : "Copy"}
        </motion.button>
      </div>
    </div>
  );
}

function SaveBtn({
  saving,
  saved,
  disabled,
  onClick,
  type = "button",
}: {
  saving: boolean;
  saved: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={saving || disabled}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 disabled:opacity-40 shadow-md shadow-primary/15"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={saved ? "ok" : "s"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
        >
          {saving ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
              className="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
            />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </motion.span>
      </AnimatePresence>
      {saved ? "Saved!" : "Save"}
    </motion.button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

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
  const profile = useQuery(api.userProfile.getProfile);

  const updateBusiness = useMutation(api.businesses.updateBusiness);
  const setCredentials = useMutation(api.credentials.setCredentials);
  const updatePreferences = useMutation(api.userProfile.updatePreferences);

  const { theme, setTheme } = useTheme();
  const reduce = useReducedMotion();

  const [activeTab, setActiveTab] = useState<Tab>("general");

  // ── General tab state ──────────────────────────────────────────────────────
  const [genName, setGenName] = useState("");
  const [genEmail, setGenEmail] = useState("");
  const [genWebsite, setGenWebsite] = useState("");
  const [genTwitter, setGenTwitter] = useState("");
  const [genSaving, setGenSaving] = useState(false);
  const [genSaved, setGenSaved] = useState(false);

  const handleSaveGeneral = async () => {
    if (!businessId) return;
    setGenSaving(true);
    try {
      await updateBusiness({
        businessId,
        name: genName || business?.name,
        supportEmail: genEmail || business?.supportEmail,
        website: genWebsite || business?.website,
      });
      setGenSaved(true);
      setTimeout(() => setGenSaved(false), 2500);
    } catch {
    } finally {
      setGenSaving(false);
    }
  };

  // ── Billing tab state ──────────────────────────────────────────────────────
  const [multiSubs, setMultiSubs] = useState(false);
  const [proration, setProration] = useState("next-invoice");
  const [gracePeriod, setGracePeriod] = useState("immediately");
  const [preventAbuse, setPreventAbuse] = useState(false);
  const [portalEnabled, setPortalEnabled] = useState(true);
  const [portalCancelAt, setPortalCancelAt] = useState("end-of-period");

  // ── Webhooks tab state ─────────────────────────────────────────────────────
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhooks, setWebhooks] = useState<
    { id: string; url: string; active: boolean }[]
  >([]);

  const addWebhook = () => {
    if (!webhookUrl.trim()) return;
    setWebhooks((w) => [
      ...w,
      { id: Date.now().toString(), url: webhookUrl, active: true },
    ]);
    setWebhookUrl("");
    setShowAddWebhook(false);
  };

  // ── Custom Fields tab state ────────────────────────────────────────────────
  const [showAddField, setShowAddField] = useState(false);
  const [fieldSlug, setFieldSlug] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [customFields, setCustomFields] = useState<
    { id: string; slug: string; name: string; type: string }[]
  >([]);

  const addCustomField = () => {
    if (!fieldSlug.trim() || !fieldName.trim()) return;
    setCustomFields((f) => [
      ...f,
      {
        id: Date.now().toString(),
        slug: fieldSlug,
        name: fieldName,
        type: fieldType,
      },
    ]);
    setFieldSlug("");
    setFieldName("");
    setFieldType("text");
    setShowAddField(false);
  };

  // ── Members tab state ──────────────────────────────────────────────────────
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // ── M-Pesa tab state ───────────────────────────────────────────────────────
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
      setTimeout(() => setCredsSaved(false), 2500);
    } catch (e: any) {
      setCredsErr(e?.message ?? "Failed");
    } finally {
      setCredsSaving(false);
    }
  };

  // ── Notifications tab state ────────────────────────────────────────────────
  const [emailNotif, setEmailNotif] = useState(
    profile?.emailNotifications ?? true
  );
  const [smsNotif, setSmsNotif] = useState(profile?.smsNotifications ?? false);
  const [weeklyDigest, setWeeklyDigest] = useState(
    profile?.weeklyDigest ?? true
  );
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  const handleSavePreferences = async () => {
    setPrefSaving(true);
    try {
      await updatePreferences({
        emailNotifications: emailNotif,
        smsNotifications: smsNotif,
        weeklyDigest,
      });
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2500);
    } catch {
    } finally {
      setPrefSaving(false);
    }
  };

  const handleThemeChange = (t: "light" | "dark" | "system") => {
    setTheme(t);
    updatePreferences({ theme: t }).catch(() => {});
  };

  if (!businessId && businesses !== undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/20 mb-3" />
        <h2 className="font-display text-xl font-bold text-foreground">
          No business yet
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete onboarding to access settings.
        </p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your organization, billing, and preferences
        </p>
      </motion.div>

      {/* ── Tab bar (horizontal scroll on mobile) ──────────── */}
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.06 }}
        className="flex gap-0.5 overflow-x-auto rounded-2xl border border-border bg-muted/30 p-1 scrollbar-none"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "relative flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap",
              activeTab === id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === id && (
              <motion.div
                layoutId="settings-tab-bg"
                className="absolute inset-0 rounded-xl bg-card shadow-sm border border-border"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── Tab content ───────────────────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
          {/* ════════════════════════════════════════════════════
              GENERAL
          ════════════════════════════════════════════════════ */}
          {activeTab === "general" && (
            <>
              <h2 className="font-display text-xl font-bold text-foreground">
                Organization Settings
              </h2>

              {/* Profile section */}
              <SectionCard
                title="Profile"
                icon={Building2}
                desc="Your organization's public profile"
              >
                <div className="space-y-0">
                  <CopyRow
                    label="Identifier"
                    desc="Unique identifier for your organization"
                    value={businessId ?? "—"}
                  />
                  <CopyRow
                    label="Organization Slug"
                    desc="Used for Customer Portal, Transaction Statements, etc."
                    value={business?.slug ?? "—"}
                  />
                </div>

                {/* Logo + editable fields */}
                <div className="flex gap-5 mt-5 flex-col sm:flex-row">
                  {/* Logo */}
                  <div className="shrink-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Logo
                    </p>
                    <motion.button
                      type="button"
                      {...tapSpring}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary text-xl font-bold font-display hover:bg-primary/25 transition-colors"
                    >
                      {(business?.name?.[0] ?? "?").toUpperCase()}
                    </motion.button>
                  </div>

                  {/* Fields */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Organization Name{" "}
                        <span className="text-primary">*</span>
                      </label>
                      <input
                        value={genName || business?.name || ""}
                        onChange={(e) => setGenName(e.target.value)}
                        placeholder={business?.name ?? "Your Business"}
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Support Email <span className="text-primary">*</span>
                      </label>
                      <input
                        type="email"
                        value={genEmail || business?.supportEmail || ""}
                        onChange={(e) => setGenEmail(e.target.value)}
                        placeholder={
                          business?.supportEmail ?? "support@acme.com"
                        }
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Website <span className="text-primary">*</span>
                      </label>
                      <input
                        type="url"
                        value={genWebsite || business?.website || ""}
                        onChange={(e) => setGenWebsite(e.target.value)}
                        placeholder="https://yourcompany.com"
                        className={inp}
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="mt-5">
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Social Media
                  </p>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Twitter / X",
                        ph: "@yourhandle",
                        val: genTwitter,
                        set: setGenTwitter,
                      },
                    ].map(({ label, ph, val, set }) => (
                      <div key={label}>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          {label}
                        </label>
                        <input
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          placeholder={ph}
                          className={inp}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <SaveBtn
                    saving={genSaving}
                    saved={genSaved}
                    onClick={handleSaveGeneral}
                  />
                </div>
              </SectionCard>
            </>
          )}

          {/* ════════════════════════════════════════════════════
              BILLING
          ════════════════════════════════════════════════════ */}
          {activeTab === "billing" && (
            <>
              <h2 className="font-display text-xl font-bold text-foreground">
                Billing
              </h2>

              {/* Subscriptions section */}
              <SectionCard
                title="Subscriptions"
                icon={FileText}
                desc="Configure how subscriptions work"
              >
                <div className="space-y-0">
                  <ToggleSwitch
                    checked={multiSubs}
                    onChange={setMultiSubs}
                    label="Allow multiple subscriptions"
                    desc="Customers can have multiple active subscriptions at the same time."
                  />
                  <SelectRow
                    label="Proration"
                    desc="Determines how to bill customers when they change their subscription"
                    value={proration}
                    onChange={setProration}
                    options={[
                      { value: "next-invoice", label: "Next Invoice" },
                      { value: "immediate", label: "Immediate" },
                      { value: "none", label: "None" },
                    ]}
                  />
                  <SelectRow
                    label="Grace period for benefit revocation"
                    desc="How long to wait before revoking benefits during payment retries"
                    value={gracePeriod}
                    onChange={setGracePeriod}
                    options={[
                      { value: "immediately", label: "Immediately" },
                      { value: "1-day", label: "1 Day" },
                      { value: "3-days", label: "3 Days" },
                      { value: "7-days", label: "7 Days" },
                    ]}
                  />
                  <ToggleSwitch
                    checked={preventAbuse}
                    onChange={setPreventAbuse}
                    label="Prevent trial abuse"
                    desc="When enabled, customers who previously had a trial on any of your products won't be eligible for another trial."
                  />
                </div>
              </SectionCard>

              {/* Customer portal section */}
              <SectionCard
                title="Customer portal"
                icon={Settings2}
                desc="Self-service portal settings"
              >
                <div className="space-y-0">
                  <ToggleSwitch
                    checked={portalEnabled}
                    onChange={setPortalEnabled}
                    label="Enable customer portal"
                    desc="Allow customers to manage their subscriptions and billing details."
                  />
                  {portalEnabled && (
                    <SelectRow
                      label="Cancellation timing"
                      desc="When subscriptions are cancelled through the portal"
                      value={portalCancelAt}
                      onChange={setPortalCancelAt}
                      options={[
                        {
                          value: "end-of-period",
                          label: "End of billing period",
                        },
                        { value: "immediately", label: "Immediately" },
                      ]}
                    />
                  )}
                </div>
              </SectionCard>
            </>
          )}

          {/* ════════════════════════════════════════════════════
              MEMBERS
          ════════════════════════════════════════════════════ */}
          {activeTab === "members" && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Members
                  </h2>
                </div>
                <motion.button
                  type="button"
                  onClick={() => setShowInvite(true)}
                  {...tapSpring}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/15"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Invite
                </motion.button>
              </div>

              {/* Invite modal */}
              <AnimatePresence>
                {showInvite && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl border border-primary/20 bg-primary/5 p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-foreground">
                        Invite a team member
                      </p>
                      <motion.button
                        type="button"
                        onClick={() => setShowInvite(false)}
                        {...tapSpring}
                        className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </motion.button>
                    </div>
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className={cn(inp, "flex-1")}
                      />
                      <div className="relative shrink-0">
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className={cn(sel, "min-w-[110px]")}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => {
                          setShowInvite(false);
                          setInviteEmail("");
                        }}
                        {...tapSpring}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shrink-0"
                      >
                        Send Invite
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="font-medium text-foreground mb-1">
                    Manage team members
                  </p>
                  <p className="text-xs max-w-sm mx-auto">
                    Manage users who have access to this organization. All
                    members are entitled to view and manage organization
                    settings, products, subscriptions, etc.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════
              WEBHOOKS
          ════════════════════════════════════════════════════ */}
          {activeTab === "webhooks" && (
            <>
              <h2 className="font-display text-xl font-bold text-foreground">
                Webhooks
              </h2>

              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {webhooks.length === 0 && !showAddWebhook ? (
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {business?.name ?? "Your organization"} doesn't have any
                      webhooks yet
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        type="button"
                        onClick={() => setShowAddWebhook(true)}
                        {...tapSpring}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/15"
                      >
                        Add Endpoint
                      </motion.button>
                      <a
                        href="https://docs.pesafy.com/webhooks"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <motion.button
                          type="button"
                          {...tapSpring}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          Documentation <ExternalLink className="h-3.5 w-3.5" />
                        </motion.button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Existing webhooks list */}
                    {webhooks.map((wh) => (
                      <div
                        key={wh.id}
                        className="flex items-center justify-between px-5 py-3.5 border-b border-border"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              wh.active ? "bg-emerald-500" : "bg-zinc-500"
                            )}
                          />
                          <span className="text-sm font-mono text-foreground truncate max-w-xs">
                            {wh.url}
                          </span>
                        </div>
                        <motion.button
                          type="button"
                          onClick={() =>
                            setWebhooks((w) => w.filter((x) => x.id !== wh.id))
                          }
                          {...tapSpring}
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </motion.button>
                      </div>
                    ))}

                    {/* Add form */}
                    <AnimatePresence>
                      {showAddWebhook && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 border-b border-border bg-muted/10">
                            <p className="text-sm font-semibold text-foreground mb-3">
                              New Endpoint
                            </p>
                            <div className="flex gap-2">
                              <input
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://yoursite.com/webhooks/pesafy"
                                className={cn(inp, "flex-1")}
                              />
                              <motion.button
                                type="button"
                                onClick={addWebhook}
                                {...tapSpring}
                                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shrink-0"
                              >
                                Add
                              </motion.button>
                              <motion.button
                                type="button"
                                onClick={() => setShowAddWebhook(false)}
                                {...tapSpring}
                                className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors shrink-0"
                              >
                                Cancel
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!showAddWebhook && (
                      <div className="p-4 flex gap-3">
                        <motion.button
                          type="button"
                          onClick={() => setShowAddWebhook(true)}
                          {...tapSpring}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/15"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Endpoint
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════
              CUSTOM FIELDS
          ════════════════════════════════════════════════════ */}
          {activeTab === "customfields" && (
            <>
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Custom Fields
                </h2>
                <motion.button
                  type="button"
                  onClick={() => setShowAddField(true)}
                  {...tapSpring}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/15"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Custom Field
                </motion.button>
              </div>

              {/* Add field form */}
              <AnimatePresence>
                {showAddField && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl border border-primary/20 bg-primary/5 p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-foreground">
                        New Custom Field
                      </p>
                      <motion.button
                        type="button"
                        onClick={() => setShowAddField(false)}
                        {...tapSpring}
                        className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </motion.button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Slug
                        </label>
                        <input
                          value={fieldSlug}
                          onChange={(e) => setFieldSlug(e.target.value)}
                          placeholder="e.g. account_number"
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Name
                        </label>
                        <input
                          value={fieldName}
                          onChange={(e) => setFieldName(e.target.value)}
                          placeholder="e.g. Account Number"
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Type
                        </label>
                        <div className="relative">
                          <select
                            value={fieldType}
                            onChange={(e) => setFieldType(e.target.value)}
                            className={cn(sel, "w-full")}
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="date">Date</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <motion.button
                        type="button"
                        onClick={addCustomField}
                        {...tapSpring}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                      >
                        Create Field
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => setShowAddField(false)}
                        {...tapSpring}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/15">
                      {["Slug ↑", "Name", "Type", ""].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customFields.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-12 text-center text-sm text-muted-foreground"
                        >
                          No Results
                        </td>
                      </tr>
                    ) : (
                      customFields.map((f) => (
                        <tr
                          key={f.id}
                          className="hover:bg-muted/10 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-foreground">
                            {f.slug}
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {f.name}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground capitalize">
                              {f.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <motion.button
                              type="button"
                              onClick={() =>
                                setCustomFields((cf) =>
                                  cf.filter((x) => x.id !== f.id)
                                )
                              }
                              {...tapSpring}
                              className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </motion.button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════
              M-PESA (preserved from original)
          ════════════════════════════════════════════════════ */}
          {activeTab === "mpesa" && (
            <div className="space-y-5">
              {/* Environment */}
              <SectionCard
                title="Business Environment"
                icon={Shield}
                desc="Your M-Pesa API environment"
              >
                <div className="flex flex-wrap gap-2 items-center">
                  {(["sandbox", "production"] as const).map((env) => {
                    const current = bizEnv ?? business?.mpesaEnvironment;
                    const active = current === env;
                    return (
                      <motion.button
                        key={env}
                        type="button"
                        onClick={() => setBizEnv(env)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
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
                  {bizEnv && bizEnv !== business?.mpesaEnvironment && (
                    <SaveBtn
                      saving={bizSaving}
                      saved={bizSaved}
                      onClick={handleSaveBusiness}
                    />
                  )}
                </div>
              </SectionCard>

              {/* Credentials */}
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
                        ph: credentials?.lipaNaMpesaPassKey
                          ? "••••"
                          : "Optional",
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
                          type={
                            id === "ck" || id === "in" ? "text" : "password"
                          }
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
                    <SaveBtn
                      saving={credsSaving}
                      saved={credsSaved}
                      type="submit"
                    />
                    <p className="text-xs text-muted-foreground">
                      AES-256 encrypted · never shared
                    </p>
                  </div>
                </form>
              </SectionCard>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              APPEARANCE (preserved)
          ════════════════════════════════════════════════════ */}
          {activeTab === "appearance" && (
            <SectionCard
              title="Appearance"
              icon={Sun}
              desc="Customize how the dashboard looks"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Color Theme
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: "light",
                    label: "Light",
                    icon: Sun,
                    desc: "Clean and bright",
                  },
                  {
                    id: "dark",
                    label: "Dark",
                    icon: Moon,
                    desc: "Easy on the eyes",
                  },
                  {
                    id: "system",
                    label: "System",
                    icon: Monitor,
                    desc: "Follow OS setting",
                  },
                ].map(({ id, label, icon: Icon, desc }) => (
                  <motion.button
                    key={id}
                    type="button"
                    onClick={() =>
                      handleThemeChange(id as "light" | "dark" | "system")
                    }
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
                      theme === id
                        ? "border-primary/40 bg-primary/6 ring-1 ring-primary/20"
                        : "border-border bg-muted/20 hover:border-primary/20"
                    )}
                  >
                    <AnimatePresence>
                      {theme === id && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 26,
                          }}
                          className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary"
                        >
                          <Check
                            className="h-2.5 w-2.5 text-white"
                            strokeWidth={3}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        theme === id
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {desc}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Language
                </p>
                <select className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="en">English</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>
            </SectionCard>
          )}

          {/* ════════════════════════════════════════════════════
              NOTIFICATIONS (preserved)
          ════════════════════════════════════════════════════ */}
          {activeTab === "notifications" && (
            <SectionCard
              title="Notification Preferences"
              icon={Bell}
              desc="Choose how and when to be notified"
            >
              <ToggleSwitch
                checked={emailNotif}
                onChange={setEmailNotif}
                label="Email notifications"
                desc="Transaction updates and system alerts"
              />
              <ToggleSwitch
                checked={smsNotif}
                onChange={setSmsNotif}
                label="SMS notifications"
                desc="Receive updates on your phone number"
              />
              <ToggleSwitch
                checked={weeklyDigest}
                onChange={setWeeklyDigest}
                label="Weekly digest"
                desc="Summary of your payment activity every Monday"
              />
              <div className="mt-5">
                <SaveBtn
                  saving={prefSaving}
                  saved={prefSaved}
                  onClick={handleSavePreferences}
                />
              </div>
            </SectionCard>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
