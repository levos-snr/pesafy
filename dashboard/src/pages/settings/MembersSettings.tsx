/**
 * pages/settings/MembersSettings.tsx — /settings/members
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Plus, Users, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { fadeUp, tapSpring } from "@/lib/variants";
import { inp, sel } from "./shared";

export default function MembersSettings() {
  const reduce = useReducedMotion();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="flex items-start justify-between gap-4"
      >
        <h2 className="font-display text-xl font-bold text-foreground">
          Members
        </h2>
        <motion.button
          type="button"
          onClick={() => setShowInvite(true)}
          {...tapSpring}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/15"
        >
          <Plus className="h-3.5 w-3.5" />
          Invite
        </motion.button>
      </motion.div>

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

      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">
            Manage team members
          </p>
          <p className="text-xs max-w-sm mx-auto">
            Manage users who have access to this organization. All members are
            entitled to view and manage organization settings, products,
            subscriptions, etc.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
