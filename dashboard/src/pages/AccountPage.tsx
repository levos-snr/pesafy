import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { Hash, LogOut, Mail, ShieldCheck, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { fadeUp, stagger, staggerItem, viewport } from "@/lib/variants";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : staggerItem}
      className="flex items-center gap-4 py-4 border-b border-border last:border-0"
    >
      <motion.div
        whileHover={{ scale: 1.1, rotate: 8 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
      >
        {icon}
      </motion.div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground truncate">
          {value ?? "—"}
        </p>
      </div>
    </motion.div>
  );
}

export default function AccountPage() {
  const user = useQuery(api.auth.getCurrentUser);
  const shouldReduceMotion = useReducedMotion();

  const signOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  const initials = (user?.name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="max-w-lg space-y-5">
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
          Account
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your profile and authentication
        </p>
      </motion.div>

      {/* Profile card */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <motion.div
          className="flex items-center gap-4 px-5 py-5 border-b border-border"
          whileInView="visible"
          viewport={viewport}
        >
          <motion.div
            whileHover={{ scale: 1.08, rotate: [0, -5, 5, 0] }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary text-xl font-bold font-display shadow-inner"
          >
            {initials}
          </motion.div>
          <div>
            <p className="font-display text-lg font-bold text-foreground">
              {user?.name ?? "User"}
            </p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </motion.div>

        <motion.div
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
          className="px-5"
        >
          <InfoRow
            icon={<User className="h-4 w-4" />}
            label="Full Name"
            value={user?.name}
          />
          <InfoRow
            icon={<Mail className="h-4 w-4" />}
            label="Email Address"
            value={user?.email}
          />
          <InfoRow
            icon={<Hash className="h-4 w-4" />}
            label="User ID"
            value={user?._id}
          />
        </motion.div>
      </motion.div>

      {/* Security */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-[15px] text-foreground">
            Security
          </h3>
        </div>
        <div className="px-5 py-5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3"
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0"
            />
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Email & password authentication active
            </p>
          </motion.div>
          <p className="mt-3 text-xs text-muted-foreground">
            Secured via Better Auth. To change your password, sign out and use
            the password reset flow.
          </p>
        </div>
      </motion.div>

      {/* Sign out */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        className="rounded-2xl border border-destructive/20 bg-destructive/5 overflow-hidden"
      >
        <div className="px-5 py-5">
          <h3 className="font-display font-semibold text-foreground mb-1">
            Sign Out
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            You'll be signed out of your current session.
          </p>
          <motion.button
            onClick={signOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-white hover:bg-destructive/85 shadow-md shadow-destructive/20"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
