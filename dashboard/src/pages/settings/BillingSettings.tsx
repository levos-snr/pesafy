/**
 * pages/settings/BillingSettings.tsx — /settings/billing
 */
import { motion, useReducedMotion } from "framer-motion";
import { FileText, Settings2 } from "lucide-react";
import { useState } from "react";
import { fadeUp } from "@/lib/variants";
import { SectionCard, SelectRow, ToggleSwitch } from "./shared";

export default function BillingSettings() {
  const reduce = useReducedMotion();
  const [multiSubs, setMultiSubs] = useState(false);
  const [proration, setProration] = useState("next-invoice");
  const [gracePeriod, setGracePeriod] = useState("immediately");
  const [preventAbuse, setPreventAbuse] = useState(false);
  const [portalEnabled, setPortalEnabled] = useState(true);
  const [portalCancelAt, setPortalCancelAt] = useState("end-of-period");

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h2 className="font-display text-xl font-bold text-foreground">
          Billing
        </h2>
      </motion.div>

      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
      >
        <SectionCard
          title="Subscriptions"
          icon={FileText}
          desc="Configure how subscriptions work"
        >
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
            desc="Customers who previously had a trial won't be eligible for another trial."
          />
        </SectionCard>
      </motion.div>

      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        <SectionCard
          title="Customer portal"
          icon={Settings2}
          desc="Self-service portal settings"
        >
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
                { value: "end-of-period", label: "End of billing period" },
                { value: "immediately", label: "Immediately" },
              ]}
            />
          )}
        </SectionCard>
      </motion.div>
    </div>
  );
}
