/**
 * pages/settings/NotificationsSettings.tsx — /settings/notifications
 */
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { fadeUp } from "@/lib/variants";
import { SaveBtn, SectionCard, ToggleSwitch } from "./shared";

export default function NotificationsSettings() {
  const profile = useQuery(api.userProfile.getProfile);
  const updatePreferences = useMutation(api.userProfile.updatePreferences);
  const reduce = useReducedMotion();

  // Initialize with safe defaults — do NOT read from profile here.
  // profile is undefined on first render (query not yet resolved), so
  // useState(profile?.x ?? default) would always capture the fallback
  // and never update when data arrives. Use useEffect instead.
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  // Sync once profile data arrives after client-side navigation
  useEffect(() => {
    if (profile === undefined) return; // still loading
    setEmailNotif(profile?.emailNotifications ?? true);
    setSmsNotif(profile?.smsNotifications ?? false);
    setWeeklyDigest(profile?.weeklyDigest ?? true);
  }, [profile?.id]);

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

  // Skeleton while loading
  if (profile === undefined) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-40 rounded-xl skeleton" />
        <div className="h-52 rounded-2xl skeleton" />
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
          Notifications
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose how and when to be notified
        </p>
      </motion.div>

      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
      >
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
      </motion.div>
    </div>
  );
}
