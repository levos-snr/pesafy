/**
 * UserAvatarDropdown.tsx — Pesafy user menu with spectacular design
 */
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  CreditCard,
  ExternalLink,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// ── Avatar color palette ───────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#d81b0d",
  "#e03120",
  "#c0392b",
  "#1a73e8",
  "#0d47a1",
  "#1565c0",
  "#2e7d32",
  "#388e3c",
  "#43a047",
  "#6a1b9a",
  "#7b1fa2",
  "#8e24aa",
  "#e65100",
  "#f57c00",
  "#ef6c00",
];

function getAvatarColor(userId?: string): string {
  if (!userId) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Avatar component ───────────────────────────────────────────────────────

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  userId?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: string;
}

export function Avatar({
  name,
  email,
  image,
  userId,
  size = "md",
  color,
}: AvatarProps) {
  const initials = (name?.[0] ?? email?.[0] ?? "U").toUpperCase();
  const bg = color ?? getAvatarColor(userId);

  const sizeClass = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-xl",
  }[size];

  if (image) {
    return (
      <img
        src={image}
        alt={name ?? "User"}
        className={cn("rounded-full object-cover", sizeClass)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold font-display text-white select-none",
        sizeClass
      )}
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  );
}

// ── Theme cycling ──────────────────────────────────────────────────────────

const THEMES = ["light", "dark", "system"] as const;
const THEME_META: Record<
  string,
  { icon: React.ElementType; label: string; desc: string }
> = {
  light: { icon: Sun, label: "Light", desc: "Always light" },
  dark: { icon: Moon, label: "Dark", desc: "Always dark" },
  system: { icon: Monitor, label: "System", desc: "Follows OS" },
};

// ── Nav items ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: User, label: "Account", sub: "Profile & security", path: "/account" },
  { icon: Settings, label: "Settings", sub: "Preferences", path: "/settings" },
  {
    icon: CreditCard,
    label: "Payments",
    sub: "Transactions",
    path: "/payments",
  },
  {
    icon: Bell,
    label: "Notifications",
    sub: "Alerts & updates",
    path: "/settings/notifications",
  },
];

// ── Dropdown animation variants ────────────────────────────────────────────

const panelVariants = {
  hidden: { opacity: 0, scale: 0.92, y: -12, transformOrigin: "top right" },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transformOrigin: "top right",
    transition: { type: "spring", stiffness: 420, damping: 30, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -8,
    transformOrigin: "top right",
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.04 + i * 0.04,
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

// ── Main component ─────────────────────────────────────────────────────────

export default function UserAvatarDropdown() {
  const user = useQuery(api.auth.getCurrentUser);
  const profile = useQuery(api.userProfile.getProfile);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();

  const avatarColor = profile?.avatarColor ?? getAvatarColor(user?._id);
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "User";
  const email = user?.email ?? "";

  const ThemeData = THEME_META[theme] ?? THEME_META.system;
  const ThemeIcon = ThemeData.icon;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme as (typeof THEMES)[number]);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  const signOut = async () => {
    setSigningOut(true);
    setOpen(false);
    await authClient.signOut();
    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "relative flex items-center gap-2.5 rounded-2xl border transition-all duration-200 cursor-pointer",
          "pl-1.5 pr-3 py-1.5",
          open
            ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
            : "border-border bg-background hover:border-primary/20 hover:bg-muted/50"
        )}
      >
        {/* Avatar with animated glow ring */}
        <div className="relative">
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -inset-[3px] rounded-full blur-[3px]"
                style={{
                  background: `conic-gradient(from 0deg, ${avatarColor}, transparent 40%, ${avatarColor})`,
                }}
              />
            )}
          </AnimatePresence>

          <motion.div
            animate={open ? { rotate: 360 } : { rotate: 0 }}
            transition={
              open
                ? { duration: 10, repeat: Infinity, ease: "linear" }
                : { duration: 0.4 }
            }
            className={cn(
              "absolute -inset-[2px] rounded-full transition-opacity duration-300",
              open ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: `conic-gradient(from 0deg, ${avatarColor}70, transparent 55%, ${avatarColor}70)`,
            }}
          />

          <Avatar
            name={user?.name}
            email={user?.email}
            image={user?.image}
            userId={user?._id}
            size="sm"
            color={avatarColor}
          />

          {/* Online dot */}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-background" />
        </div>

        <span className="hidden sm:block text-sm font-semibold text-foreground max-w-[96px] truncate leading-none">
          {displayName}
        </span>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </motion.span>
      </motion.button>

      {/* ── Dropdown panel ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={shouldReduceMotion ? undefined : panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="menu"
            className={cn(
              "absolute right-0 top-[calc(100%+10px)] z-50 w-72",
              "rounded-2xl border border-border/60",
              "bg-card/95 backdrop-blur-2xl",
              "shadow-2xl shadow-black/20 dark:shadow-black/60",
              "overflow-hidden"
            )}
          >
            {/* ── Profile header card ──────────────────────────────────── */}
            <div className="relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${avatarColor}1a 0%, ${avatarColor}08 60%, transparent 100%)`,
                }}
              />
              <div
                className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-[0.08]"
                style={{ backgroundColor: avatarColor }}
              />
              <div
                className="absolute top-2 right-10 h-12 w-12 rounded-full opacity-[0.05]"
                style={{ backgroundColor: avatarColor }}
              />

              <div className="relative flex items-center gap-3.5 px-4 py-4">
                {/* Large avatar with glow */}
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 22,
                    delay: 0.05,
                  }}
                  className="relative shrink-0"
                >
                  <div
                    className="absolute -inset-1.5 rounded-full opacity-30 blur-md"
                    style={{ backgroundColor: avatarColor }}
                  />
                  <Avatar
                    name={user?.name}
                    email={user?.email}
                    image={user?.image}
                    userId={user?._id}
                    size="lg"
                    color={avatarColor}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-card" />
                </motion.div>

                {/* Name / email / badge */}
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.07,
                    duration: 0.25,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="min-w-0 flex-1"
                >
                  <p className="font-display font-bold text-[15px] text-foreground truncate leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">
                    {email}
                  </p>
                  <div
                    className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${avatarColor}18`,
                      color: avatarColor,
                      border: `1px solid ${avatarColor}30`,
                    }}
                  >
                    <Zap className="h-2.5 w-2.5" strokeWidth={2.5} />
                    Pesafy Pro
                  </div>
                </motion.div>

                {/* Quick link to account */}
                <Link to="/account" onClick={() => setOpen(false)}>
                  <motion.div
                    whileHover={{ scale: 1.12, rotate: -10 }}
                    whileTap={{ scale: 0.9 }}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </motion.div>
                </Link>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* ── Nav items ────────────────────────────────────────────── */}
            <div className="p-1.5 space-y-0.5">
              {NAV_ITEMS.map(({ icon: Icon, label, sub, path }, i) => (
                <motion.div
                  key={path}
                  custom={i}
                  variants={shouldReduceMotion ? undefined : itemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link to={path} onClick={() => setOpen(false)}>
                    <motion.div
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 group-hover:bg-muted transition-colors">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground leading-none">
                          {label}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                          {sub}
                        </p>
                      </div>
                      <ChevronDown className="h-3 w-3 -rotate-90 opacity-0 group-hover:opacity-30 transition-opacity shrink-0" />
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* ── Divider ──────────────────────────────────────────────── */}
            <div className="mx-4 h-px bg-border/60" />

            {/* ── Theme + Sign out ─────────────────────────────────────── */}
            <div className="p-1.5 space-y-0.5">
              {/* Theme row */}
              <motion.div
                custom={NAV_ITEMS.length}
                variants={shouldReduceMotion ? undefined : itemVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.button
                  type="button"
                  onClick={cycleTheme}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 group-hover:bg-muted transition-colors overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={theme}
                        initial={{ y: -12, opacity: 0, scale: 0.6 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 12, opacity: 0, scale: 0.6 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 28,
                        }}
                        className="flex"
                      >
                        <ThemeIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground leading-none">
                      Theme
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                      {ThemeData.desc}
                    </p>
                  </div>
                  {/* Inline theme pill selector */}
                  <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
                    {THEMES.map((t) => {
                      const TIcon = THEME_META[t].icon;
                      return (
                        <motion.button
                          key={t}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTheme(t);
                          }}
                          whileTap={{ scale: 0.9 }}
                          title={THEME_META[t].label}
                          className={cn(
                            "relative flex h-5 w-5 items-center justify-center rounded-md transition-colors",
                            theme === t
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <TIcon className="h-3 w-3" />
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.button>
              </motion.div>

              {/* Sign out */}
              <motion.div
                custom={NAV_ITEMS.length + 1}
                variants={shouldReduceMotion ? undefined : itemVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-destructive/8 transition-colors disabled:opacity-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 group-hover:bg-destructive/10 transition-colors">
                    {signingOut ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="h-3.5 w-3.5 rounded-full border-2 border-destructive/30 border-t-destructive"
                      />
                    ) : (
                      <LogOut className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive transition-colors" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground group-hover:text-destructive leading-none transition-colors">
                      {signingOut ? "Signing out…" : "Sign out"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                      End session
                    </p>
                  </div>
                </motion.button>
              </motion.div>
            </div>

            {/* ── Footer bar ───────────────────────────────────────────── */}
            <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/40 font-mono">
                v0.0.1
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                All systems operational
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
