import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  CreditCard,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

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

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  userId?: string;
  size?: "sm" | "md" | "lg";
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
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  }[size];

  if (image) {
    return (
      <img
        src={image}
        alt={name ?? "User"}
        className={cn(
          "rounded-full object-cover ring-2 ring-border",
          sizeClass
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold font-display text-white ring-2 ring-white/20",
        sizeClass
      )}
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  );
}

const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.94, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 32 },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -6,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
};

const THEME_ICONS: Record<string, React.ElementType> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};
const THEME_ORDER = ["light", "dark", "system"] as const;

export default function UserAvatarDropdown() {
  const user = useQuery(api.auth.getCurrentUser);
  const profile = useQuery(api.userProfile.getProfile);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();

  const ThemeIcon = THEME_ICONS[theme] ?? Monitor;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [navigate]);

  const cycleTheme = () => {
    const idx = THEME_ORDER.indexOf(theme as (typeof THEME_ORDER)[number]);
    setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  };

  const signOut = async () => {
    setOpen(false);
    await authClient.signOut();
    navigate("/", { replace: true });
    window.location.reload();
  };

  const avatarColor = profile?.avatarColor ?? getAvatarColor(user?._id);
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "User";
  const email = user?.email ?? "";

  return (
    <div ref={ref} className="relative">
      {/* Avatar trigger button */}
      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className="flex items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5 transition-colors hover:bg-muted"
        aria-label="User menu"
        aria-expanded={open}
      >
        <Avatar
          name={user?.name}
          email={user?.email}
          image={user?.image}
          userId={user?._id}
          size="sm"
          color={avatarColor}
        />
        <span className="hidden sm:block text-sm font-medium text-foreground max-w-[100px] truncate">
          {displayName}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </motion.span>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={shouldReduceMotion ? undefined : dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "absolute right-0 top-[calc(100%+8px)] z-50 w-64",
              "rounded-2xl border border-border bg-card shadow-2xl shadow-black/15 dark:shadow-black/50",
              "overflow-hidden"
            )}
          >
            {/* Top gradient line */}
            <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            {/* User info header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
              <Avatar
                name={user?.name}
                email={user?.email}
                image={user?.image}
                userId={user?._id}
                size="md"
                color={avatarColor}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {email}
                </p>
              </div>
            </div>

            {/* Nav items */}
            <div className="p-1.5">
              {[
                { icon: User, label: "Account", path: "/account" },
                { icon: Settings, label: "Settings", path: "/settings" },
                { icon: CreditCard, label: "Payments", path: "/payments" },
                {
                  icon: Bell,
                  label: "Notifications",
                  path: "/settings?tab=notifications",
                },
              ].map(({ icon: Icon, label, path }) => (
                <Link key={path} to={path} onClick={() => setOpen(false)}>
                  <motion.div
                    whileHover={{
                      x: 3,
                      backgroundColor: "rgba(var(--muted), 0.4)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </motion.div>
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="mx-3 h-px bg-border" />

            {/* Theme toggle row */}
            <div className="p-1.5">
              <motion.button
                type="button"
                onClick={cycleTheme}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={theme}
                    initial={{ rotate: -30, scale: 0.6, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 30, scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  >
                    <ThemeIcon className="h-4 w-4 shrink-0" />
                  </motion.span>
                </AnimatePresence>
                <span>Theme</span>
                <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {theme}
                </span>
              </motion.button>

              {/* Sign out */}
              <motion.button
                type="button"
                onClick={signOut}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </motion.button>
            </div>

            {/* Bottom gradient line */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
