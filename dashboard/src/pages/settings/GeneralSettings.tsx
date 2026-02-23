/**
 * pages/settings/GeneralSettings.tsx — /settings/general
 */
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { fadeUp, tapSpring } from "@/lib/variants";
import { CopyRow, inp, SaveBtn, SectionCard } from "./shared";

export default function GeneralSettings() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;
  const business = useQuery(
    api.businesses.getBusiness,
    businessId ? { businessId } : "skip"
  );
  const updateBusiness = useMutation(api.businesses.updateBusiness);
  const reduce = useReducedMotion();

  const [genName, setGenName] = useState("");
  const [genEmail, setGenEmail] = useState("");
  const [genWebsite, setGenWebsite] = useState("");
  const [genTwitter, setGenTwitter] = useState("");
  const [genSaving, setGenSaving] = useState(false);
  const [genSaved, setGenSaved] = useState(false);

  // Sync form fields once business data arrives.
  // useState initializers run before Convex resolves on client-side navigation,
  // so without this effect the inputs would always be blank until reload.
  useEffect(() => {
    if (!business) return;
    setGenName(business.name ?? "");
    setGenEmail(business.supportEmail ?? "");
    setGenWebsite(business.website ?? "");
    setGenTwitter(business.twitter ?? "");
  }, [business?._id]);

  const handleSaveGeneral = async () => {
    if (!businessId) return;
    setGenSaving(true);
    try {
      await updateBusiness({
        businessId,
        name: genName.trim() || undefined,
        supportEmail: genEmail.trim() || undefined,
        website: genWebsite.trim() || undefined,
        twitter: genTwitter.trim() || undefined,
      });
      setGenSaved(true);
      setTimeout(() => setGenSaved(false), 2500);
    } catch {
    } finally {
      setGenSaving(false);
    }
  };

  // Show skeleton while loading
  if (businesses === undefined) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 rounded-xl skeleton" />
        <div className="h-64 rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h2 className="font-display text-xl font-bold text-foreground">
          Organization Settings
        </h2>
      </motion.div>

      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
      >
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

          <div className="flex gap-5 mt-5 flex-col sm:flex-row">
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

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Organization Name <span className="text-primary">*</span>
                </label>
                <input
                  value={genName}
                  onChange={(e) => setGenName(e.target.value)}
                  placeholder="Your Business"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Support Email
                </label>
                <input
                  type="email"
                  value={genEmail}
                  onChange={(e) => setGenEmail(e.target.value)}
                  placeholder="support@yourcompany.com"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Website
                </label>
                <input
                  type="url"
                  value={genWebsite}
                  onChange={(e) => setGenWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className={inp}
                />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-foreground mb-3">
              Social Media
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Twitter / X
              </label>
              <input
                value={genTwitter}
                onChange={(e) => setGenTwitter(e.target.value)}
                placeholder="@yourhandle"
                className={cn(inp, "max-w-xs")}
              />
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
      </motion.div>
    </div>
  );
}
