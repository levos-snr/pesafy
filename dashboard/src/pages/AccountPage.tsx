/**
 * AccountPage — Full profile CRUD
 * Name · Phone with country code · Avatar color · Password change · Delete account
 */
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Palette,
  Phone,
  Save,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/UserAvatarDropdown";
import { cn } from "@/lib/utils";
import { fadeUp, viewport } from "@/lib/variants";

const COUNTRY_CODES = [
  { code: "KE", dial: "+254", name: "Kenya" },
  { code: "UG", dial: "+256", name: "Uganda" },
  { code: "TZ", dial: "+255", name: "Tanzania" },
  { code: "RW", dial: "+250", name: "Rwanda" },
  { code: "NG", dial: "+234", name: "Nigeria" },
  { code: "GH", dial: "+233", name: "Ghana" },
  { code: "ZA", dial: "+27", name: "South Africa" },
  { code: "ET", dial: "+251", name: "Ethiopia" },
  { code: "US", dial: "+1", name: "United States" },
  { code: "GB", dial: "+44", name: "United Kingdom" },
  { code: "IN", dial: "+91", name: "India" },
  { code: "CA", dial: "+1", name: "Canada" },
  { code: "AU", dial: "+61", name: "Australia" },
  { code: "DE", dial: "+49", name: "Germany" },
  { code: "FR", dial: "+33", name: "France" },
  { code: "AE", dial: "+971", name: "UAE" },
  { code: "SG", dial: "+65", name: "Singapore" },
  { code: "BR", dial: "+55", name: "Brazil" },
  { code: "MX", dial: "+52", name: "Mexico" },
];

const AVATAR_COLORS = [
  "#d81b0d",
  "#c0392b",
  "#e74c3c",
  "#1a73e8",
  "#0d47a1",
  "#2980b9",
  "#27ae60",
  "#2e7d32",
  "#16a085",
  "#8e24aa",
  "#6a1b9a",
  "#9b59b6",
  "#e67e22",
  "#d35400",
  "#f39c12",
  "#2c3e50",
  "#34495e",
  "#95a5a6",
];

function Section({
  icon,
  title,
  subtitle,
  children,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className={cn(
        "rounded-2xl border overflow-hidden",
        danger
          ? "border-destructive/20 bg-destructive/5"
          : "border-border bg-card"
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 px-5 py-4 border-b",
          danger ? "border-destructive/15" : "border-border"
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg mt-0.5",
            danger
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-display font-semibold text-[15px] text-foreground">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";

function SaveButton({
  saving,
  saved,
  disabled,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={saving || disabled}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 disabled:opacity-45 shadow-md shadow-primary/15"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={saved ? "ok" : "save"}
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

export default function AccountPage() {
  const profile = useQuery(api.userProfile.getProfile);
  const updateName = useMutation(api.userProfile.updateName);
  const updateProfile = useMutation(api.userProfile.updateProfile);
  const changePassword = useMutation(api.userProfile.changePassword);
  const deleteAccount = useMutation(api.userProfile.deleteAccount);
  const shouldReduceMotion = useReducedMotion();

  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameErr, setNameErr] = useState("");

  const [phone, setPhone] = useState("");
  const [countryDial, setCountryDial] = useState("+254");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwErr, setPwErr] = useState("");

  const [showDelete, setShowDelete] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  if (!profile)
    return (
      <div className="max-w-xl space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-2xl skeleton" />
        ))}
      </div>
    );

  const avatarColor = selectedColor ?? profile?.avatarColor ?? undefined;

  const save = async (
    fn: () => Promise<void>,
    setSaving: (v: boolean) => void,
    setSaved: (v: boolean) => void,
    setErr?: (v: string) => void
  ) => {
    setSaving(true);
    setErr?.("");
    try {
      await fn();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setErr?.(e?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = () =>
    save(
      async () => {
        await updateName({ name: name.trim() || profile.name || "" });
        setName("");
      },
      setNameSaving,
      setNameSaved,
      setNameErr
    );

  const handleSavePhone = () =>
    save(
      async () => {
        const full = phone
          ? `${countryDial}${phone.replace(/^0/, "")}`
          : undefined;
        await updateProfile({
          phoneNumber: full,
          phoneCountryCode: countryDial,
        });
        setPhone("");
      },
      setPhoneSaving,
      setPhoneSaved
    );

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr("");
    if (newPw !== confirmPw) {
      setPwErr("Passwords don't match");
      return;
    }
    save(
      async () => {
        await changePassword({
          currentPassword: currentPw,
          newPassword: newPw,
        });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      },
      setPwSaving,
      setPwSaved,
      setPwErr
    );
  };

  return (
    <div className="max-w-xl space-y-5">
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Account
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your profile and account security
        </p>
      </motion.div>

      {/* Overview card */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.06 }}
        className="relative rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center gap-4 px-5 py-5">
          <motion.div
            whileHover={{ scale: 1.06, rotate: [0, -3, 3, 0] }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            <Avatar
              name={profile.name}
              email={profile.email}
              image={profile.image}
              userId={profile.id}
              size="lg"
              color={avatarColor}
            />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg font-bold text-foreground">
              {profile.name ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {profile.email}
            </p>
            {profile.phoneNumber && (
              <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono">
                {profile.phoneNumber}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
            <motion.span
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            />
            Active
          </span>
        </div>
      </motion.div>

      {/* Name */}
      <Section
        icon={<User className="h-4 w-4" />}
        title="Display Name"
        subtitle="Shown across your dashboard and API responses"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={profile.name || "Enter your name"}
            className={cn(inp, "flex-1")}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
          />
          <SaveButton
            saving={nameSaving}
            saved={nameSaved}
            onClick={handleSaveName}
          />
        </div>
        <AnimatePresence>
          {nameErr && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1.5 text-xs text-destructive"
            >
              {nameErr}
            </motion.p>
          )}
        </AnimatePresence>
      </Section>

      {/* Email */}
      <Section
        icon={<Mail className="h-4 w-4" />}
        title="Email Address"
        subtitle="Your sign-in email — contact support to change"
      >
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">
            {profile.email}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40">
            Read-only
          </span>
        </div>
      </Section>

      {/* Phone */}
      <Section
        icon={<Phone className="h-4 w-4" />}
        title="Phone Number"
        subtitle="Used for SMS notifications and 2FA"
      >
        <div className="flex gap-2">
          <select
            value={countryDial}
            onChange={(e) => setCountryDial(e.target.value)}
            className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shrink-0"
          >
            {COUNTRY_CODES.map(({ code, dial, name: n }) => (
              <option key={`${code}-${dial}`} value={dial}>
                {code} {dial}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={
              profile.phoneNumber?.replace(/^\+\d+/, "") || "712 345 678"
            }
            className={cn(inp, "flex-1")}
          />
          <SaveButton
            saving={phoneSaving}
            saved={phoneSaved}
            onClick={handleSavePhone}
          />
        </div>
        {profile.phoneNumber && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Current: <span className="font-mono">{profile.phoneNumber}</span>
          </p>
        )}
      </Section>

      {/* Avatar color */}
      <Section
        icon={<Palette className="h-4 w-4" />}
        title="Avatar Color"
        subtitle="Customize your initials avatar"
      >
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((color) => (
            <motion.button
              key={color}
              type="button"
              onClick={async () => {
                setSelectedColor(color);
                await updateProfile({ avatarColor: color });
              }}
              whileHover={{ scale: 1.18 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
              className="relative h-8 w-8 rounded-full ring-2 ring-transparent focus:outline-none focus:ring-primary"
              style={{ backgroundColor: color }}
            >
              <AnimatePresence>
                {avatarColor === color && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 22 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Check
                      className="h-3.5 w-3.5 text-white drop-shadow"
                      strokeWidth={3}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Preview:</span>
          <Avatar
            name={profile.name}
            email={profile.email}
            userId={profile.id}
            size="sm"
            color={avatarColor}
          />
        </div>
      </Section>

      {/* Change password */}
      <Section
        icon={<Lock className="h-4 w-4" />}
        title="Change Password"
        subtitle="Use at least 8 characters with mixed case"
      >
        <form onSubmit={handleChangePassword} className="space-y-3">
          {[
            {
              label: "Current Password",
              val: currentPw,
              set: setCurrentPw,
              show: showCur,
              toggle: () => setShowCur(!showCur),
              auto: "current-password",
            },
            {
              label: "New Password",
              val: newPw,
              set: setNewPw,
              show: showNew,
              toggle: () => setShowNew(!showNew),
              auto: "new-password",
              min: 8,
            },
          ].map(({ label, val, set, show, toggle, auto, min }) => (
            <div key={label}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {label}
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  required
                  minLength={min}
                  autoComplete={auto}
                  className={cn(inp, "pr-10")}
                />
                <motion.button
                  type="button"
                  onClick={toggle}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {show ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </motion.button>
              </div>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              autoComplete="new-password"
              className={cn(
                inp,
                confirmPw && confirmPw !== newPw ? "border-destructive/60" : ""
              )}
            />
          </div>
          <AnimatePresence>
            {pwErr && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-destructive"
              >
                {pwErr}
              </motion.p>
            )}
          </AnimatePresence>
          <motion.button
            type="submit"
            disabled={pwSaving || !currentPw || !newPw || !confirmPw}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 disabled:opacity-40 shadow-md shadow-primary/15"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={pwSaved ? "ok" : "key"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
              >
                {pwSaving ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                  />
                ) : pwSaved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
              </motion.span>
            </AnimatePresence>
            {pwSaved ? "Password changed!" : "Change Password"}
          </motion.button>
        </form>
      </Section>

      {/* Security info */}
      <Section icon={<Shield className="h-4 w-4" />} title="Account Security">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/6 px-4 py-3">
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Email & password
              </p>
              <p className="text-xs text-muted-foreground">
                Secured via Better Auth · verified
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Two-factor authentication
              </p>
              <p className="text-xs text-muted-foreground">
                Extra layer of security
              </p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 border border-border rounded-full px-2.5 py-1">
              Soon
            </span>
          </div>
        </div>
      </Section>

      {/* Danger zone */}
      <Section
        icon={<AlertTriangle className="h-4 w-4" />}
        title="Danger Zone"
        subtitle="Permanent — cannot be undone"
        danger
      >
        <AnimatePresence mode="wait">
          {!showDelete ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your Pesafy account, all businesses,
                credentials, and transaction history.
              </p>
              <motion.button
                type="button"
                onClick={() => setShowDelete(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:bg-destructive/85 shadow-md shadow-destructive/20"
              >
                <Trash2 className="h-4 w-4" /> Delete My Account
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="text-sm font-medium text-destructive">
                Type{" "}
                <span className="font-bold font-mono">{profile.email}</span> to
                confirm:
              </p>
              <input
                type="email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder={profile.email}
                className={inp}
              />
              <AnimatePresence>
                {deleteErr && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-destructive"
                  >
                    {deleteErr}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="flex gap-2">
                <motion.button
                  type="button"
                  onClick={async () => {
                    setDeleting(true);
                    setDeleteErr("");
                    try {
                      await deleteAccount({ confirmationEmail: deleteEmail });
                      window.location.href = "/";
                    } catch (e: any) {
                      setDeleteErr(e?.message ?? "Failed");
                      setDeleting(false);
                    }
                  }}
                  disabled={
                    deleting ||
                    deleteEmail.toLowerCase() !== profile.email?.toLowerCase()
                  }
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:bg-destructive/85 disabled:opacity-40"
                >
                  {deleting ? "Deleting…" : "Confirm Delete"}
                </motion.button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDelete(false);
                    setDeleteEmail("");
                    setDeleteErr("");
                  }}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>
    </div>
  );
}
