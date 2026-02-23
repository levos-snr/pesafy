/**
 * pages/settings/CustomFieldsSettings.tsx — /settings/custom-fields
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { fadeUp, tapSpring } from "@/lib/variants";
import { inp, sel } from "./shared";

export default function CustomFieldsSettings() {
  const reduce = useReducedMotion();
  const [showAddField, setShowAddField] = useState(false);
  const [fieldSlug, setFieldSlug] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [customFields, setCustomFields] = useState<
    { id: string; slug: string; name: string; type: string }[]
  >([]);

  const addCustomField = () => {
    if (!fieldSlug.trim() || !fieldName.trim()) return;
    setCustomFields((f) => [
      ...f,
      {
        id: Date.now().toString(),
        slug: fieldSlug,
        name: fieldName,
        type: fieldType,
      },
    ]);
    setFieldSlug("");
    setFieldName("");
    setFieldType("text");
    setShowAddField(false);
  };

  return (
    <div className="space-y-5">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between gap-4"
      >
        <h2 className="font-display text-xl font-bold text-foreground">
          Custom Fields
        </h2>
        <motion.button
          type="button"
          onClick={() => setShowAddField(true)}
          {...tapSpring}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/15"
        >
          <Plus className="h-3.5 w-3.5" />
          New Custom Field
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showAddField && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                New Custom Field
              </p>
              <motion.button
                type="button"
                onClick={() => setShowAddField(false)}
                {...tapSpring}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Slug
                </label>
                <input
                  value={fieldSlug}
                  onChange={(e) => setFieldSlug(e.target.value)}
                  placeholder="e.g. account_number"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Name
                </label>
                <input
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. Account Number"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Type
                </label>
                <div className="relative">
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                    className={cn(sel, "w-full")}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <motion.button
                type="button"
                onClick={addCustomField}
                {...tapSpring}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Create Field
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setShowAddField(false)}
                {...tapSpring}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/15">
              {["Slug ↑", "Name", "Type", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customFields.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No Results
                </td>
              </tr>
            ) : (
              customFields.map((f) => (
                <tr key={f.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {f.slug}
                  </td>
                  <td className="px-4 py-3 text-foreground">{f.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground capitalize">
                      {f.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <motion.button
                      type="button"
                      onClick={() =>
                        setCustomFields((cf) => cf.filter((x) => x.id !== f.id))
                      }
                      {...tapSpring}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
