/**
 * AccountPage — Full profile CRUD
 * Name · Phone with country code · Avatar color · Password change · Delete account
 *
 * Changes:
 *  - Layout now centered (max-w-2xl mx-auto) so it fills the content area
 *  - Country codes sourced from @/lib/countryCodes (world-wide, ~200 countries)
 *  - Country selector upgraded to a searchable dropdown (consistent with OnboardingPage)
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
import { useEffect, useState } from "react";
import { isPossiblePhoneNumber, PhoneField } from "@/components/PhoneField";
import { Avatar } from "@/components/UserAvatarDropdown";
import { cn } from "@/lib/utils";
import { fadeUp, viewport } from "@/lib/variants";

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
        "rounded-2xl border",
        danger
          ? "border-destructive/20 bg-destructive/5"
          : "border-border bg-card"
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 px-5 py-4 border-b rounded-t-2xl overflow-hidden",
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

// CountryPicker replaced by react-phone-number-input's built-in PhoneInput

// ── Main page ─────────────────────────────────────────────────────────────────
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

  const [phoneValue, setPhoneValue] = useState<string | undefined>(undefined);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [colorSaving, setColorSaving] = useState(false);
  const [colorSaved, setColorSaved] = useState(false);

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

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    if (profile.avatarColor) setSelectedColor(profile.avatarColor);
    if (profile.phoneNumber) {
      // phoneNumber is stored in E.164 format (e.g. "+254712345678")
      setPhoneValue(profile.phoneNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-2xl skeleton" />
        ))}
      </div>
    );
  }

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
      },
      setNameSaving,
      setNameSaved,
      setNameErr
    );

  const handleSavePhone = () =>
    save(
      async () => {
        await updateProfile({
          phoneNumber: phoneValue || undefined,
          phoneCountryCode: undefined,
        });
      },
      setPhoneSaving,
      setPhoneSaved
    );

  const handleSaveColor = () =>
    save(
      async () => {
        if (!selectedColor) return;
        await updateProfile({ avatarColor: selectedColor });
      },
      setColorSaving,
      setColorSaved
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
    // ── CENTERED: max-w-2xl mx-auto fills the available content area ──
    <div className="max-w-2xl mx-auto space-y-5">
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
        className="relative rounded-2xl border border-border bg-card"
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

      {/* Display Name */}
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
              className="text-xs text-destructive mt-2"
            >
              {nameErr}
            </motion.p>
          )}
        </AnimatePresence>
      </Section>

      {/* Email (read-only) */}
      <Section
        icon={<Mail className="h-4 w-4" />}
        title="Email Address"
        subtitle="Managed by Better Auth — contact support to change"
      >
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground">{profile.email}</span>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 border border-border rounded-full px-2 py-0.5">
            Verified
          </span>
        </div>
      </Section>

      {/* Phone */}
      <Section
        icon={<Phone className="h-4 w-4" />}
        title="Phone Number"
        subtitle="Used for SMS notifications and M-Pesa verification"
      >
        <div className="flex gap-2 items-start">
          <PhoneField
            value={phoneValue}
            onChange={setPhoneValue}
            placeholder="712 345 678"
            defaultCountry="KE"
            size="md"
            className="flex-1"
          />
          <SaveButton
            saving={phoneSaving}
            saved={phoneSaved}
            disabled={!!phoneValue && !isPossiblePhoneNumber(phoneValue)}
            onClick={handleSavePhone}
          />
        </div>
      </Section>

      {/* Avatar Color */}
      <Section
        icon={<Palette className="h-4 w-4" />}
        title="Avatar Color"
        subtitle="Shown when you don't have a profile photo"
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {AVATAR_COLORS.map((color) => (
            <motion.button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-all",
                selectedColor === color
                  ? "border-foreground scale-110 shadow-md"
                  : "border-transparent"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Avatar
            name={profile.name}
            email={profile.email}
            image={profile.image}
            userId={profile.id}
            size="md"
            color={avatarColor}
          />
          <p className="text-xs text-muted-foreground">Preview</p>
          <SaveButton
            saving={colorSaving}
            saved={colorSaved}
            disabled={!selectedColor || selectedColor === profile.avatarColor}
            onClick={handleSaveColor}
          />
        </div>
      </Section>

      {/* Change Password */}
      <Section
        icon={<Lock className="h-4 w-4" />}
        title="Change Password"
        subtitle="Must be at least 8 characters"
      >
        <form onSubmit={handleChangePassword} className="space-y-3">
          {[
            {
              id: "cur",
              label: "Current Password",
              val: currentPw,
              set: setCurrentPw,
              show: showCur,
              toggle: () => setShowCur((v) => !v),
              auto: "current-password",
              min: 1,
            },
            {
              id: "new",
              label: "New Password",
              val: newPw,
              set: setNewPw,
              show: showNew,
              toggle: () => setShowNew((v) => !v),
              auto: "new-password",
              min: 8,
            },
          ].map(({ id, label, val, set, show, toggle, auto, min }) => (
            <div key={id}>
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
