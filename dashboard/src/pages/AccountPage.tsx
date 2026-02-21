import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Hash, LogOut, Mail, ShieldCheck, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-border last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground truncate">
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const user = useQuery(api.auth.getCurrentUser);

  const signOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  const initials = (user?.name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="max-w-lg space-y-5">
      <div className="animate-fade-up">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Account
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your profile and authentication
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-up delay-75">
        <div className="flex items-center gap-4 px-5 py-5 border-b border-border">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary text-xl font-bold font-display shadow-inner">
            {initials}
          </div>
          <div>
            <p className="font-display text-lg font-bold text-foreground">
              {user?.name ?? "User"}
            </p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="px-5">
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
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-up delay-150">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-[15px] text-foreground">
            Security
          </h3>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/6 px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-400 font-medium">
              Email & password authentication active
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Your account is secured via Better Auth. To change your password,
            sign out and use the password reset flow.
          </p>
        </div>
      </div>

      {/* Sign out */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 overflow-hidden animate-fade-up delay-225">
        <div className="px-5 py-5">
          <h3 className="font-display font-semibold text-foreground mb-1">
            Sign Out
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            You'll be signed out of your current session.
          </p>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-destructive/85 active:scale-[0.97] shadow-md shadow-destructive/20"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
