/**
 * CustomersPage — Two-pane layout: list + detail panel
 * Matches the Polar-inspired design from screenshots.
 * Wire up api.customers.* once you add those Convex functions.
 */
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  CreditCard,
  Mail,
  Phone,
  Plus,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import {
  fadeUp,
  stagger,
  staggerItem,
  tapSpring,
  viewport,
} from "@/lib/variants";

const inp =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:outline-none";

function getInitials(name?: string | null, email?: string | null) {
  if (name)
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "?";
}

function Avatar({
  name,
  email,
  color,
  size = 9,
}: {
  name?: string | null;
  email?: string | null;
  color?: string | null;
  size?: number;
}) {
  return (
    <div
      style={{
        background: color ?? "#d81b0d",
        width: `${size * 4}px`,
        height: `${size * 4}px`,
      }}
      className="flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white font-display"
    >
      {getInitials(name, email)}
    </div>
  );
}

function DetailPanel({
  customer,
  onClose,
}: {
  customer: any;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border bg-card overflow-y-auto"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-display font-semibold text-sm text-foreground">
          Customer Details
        </h3>
        <motion.button
          type="button"
          onClick={onClose}
          {...tapSpring}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>
      <div className="flex flex-col items-center gap-3 px-5 py-6 border-b border-border">
        <Avatar
          name={customer.name}
          email={customer.email}
          color={customer.avatarColor}
          size={14}
        />
        <div className="text-center">
          <p className="font-display font-semibold text-foreground">
            {customer.name ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {customer.email}
          </p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">
        {[
          { icon: Mail, label: "Email", value: customer.email },
          { icon: Phone, label: "Phone", value: customer.phoneNumber ?? "—" },
          {
            icon: Calendar,
            label: "Created",
            value: customer.createdAt ? formatDate(customer.createdAt) : "—",
          },
          {
            icon: CreditCard,
            label: "Transactions",
            value: String(customer.transactionCount ?? 0),
          },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground mt-0.5">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="text-sm text-foreground mt-0.5 break-all">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function CustomersPage() {
  const businesses = useQuery(api.businesses.getUserBusinesses);
  const businessId = businesses?.[0]?._id;

  // TODO: replace with your real Convex customers query
  // const customers = useQuery(api.customers.getCustomers, businessId ? { businessId } : "skip");
  const customers: any[] | undefined = businessId ? [] : undefined;

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const shouldReduceMotion = useReducedMotion();

  const filtered = (customers ?? []).filter(
    (c: any) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phoneNumber?.includes(search)
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setLoading(true);
    setErr("");
    try {
      // await createCustomer({ businessId, name: formName, email: formEmail, phoneNumber: formPhone || undefined });
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setShowForm(false);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex flex-1 min-w-0 flex-col space-y-5">
        {/* Header */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-fluid-xl font-bold tracking-tight text-foreground">
              Customers
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and view all your customers
            </p>
          </div>
          <motion.button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setErr("");
            }}
            {...tapSpring}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              showForm
                ? "border border-border text-muted-foreground hover:bg-muted"
                : "bg-primary text-white hover:bg-primary/85 shadow-lg shadow-primary/20"
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={showForm ? "x" : "plus"}
                initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {showForm ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </motion.span>
            </AnimatePresence>
            {showForm ? "Cancel" : "Add Customer"}
          </motion.button>
        </motion.div>

        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">
                      New Customer
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Add a customer to your business
                    </p>
                  </div>
                </div>
                <form
                  onSubmit={handleCreate}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  {[
                    {
                      id: "name",
                      label: "Full Name",
                      type: "text",
                      val: formName,
                      set: setFormName,
                      ph: "Jane Doe",
                      req: true,
                    },
                    {
                      id: "email",
                      label: "Email Address",
                      type: "email",
                      val: formEmail,
                      set: setFormEmail,
                      ph: "jane@example.com",
                      req: true,
                    },
                    {
                      id: "phone",
                      label: "Phone Number",
                      type: "tel",
                      val: formPhone,
                      set: setFormPhone,
                      ph: "254712345678",
                      req: false,
                    },
                  ].map(({ id, label, type, val, set, ph, req }) => (
                    <div key={id}>
                      <label
                        htmlFor={id}
                        className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                      >
                        {label}
                        {req && <span className="text-primary ml-1">*</span>}
                      </label>
                      <input
                        id={id}
                        type={type}
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        placeholder={ph}
                        required={req}
                        className={inp}
                      />
                    </div>
                  ))}
                  <AnimatePresence>
                    {err && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="sm:col-span-2 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                      >
                        {err}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="sm:col-span-2 flex gap-3">
                    <motion.button
                      type="submit"
                      disabled={loading || !businessId}
                      {...tapSpring}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 disabled:opacity-45 shadow-md shadow-primary/15"
                    >
                      {loading ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 0.7,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        />
                      ) : (
                        <>
                          <Plus className="h-4 w-4" /> Create Customer
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setShowForm(false)}
                      {...tapSpring}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Customers"
                className="w-full rounded-lg border border-border bg-input pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap sm:ml-auto">
              {filtered.length} customer{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          {customers === undefined ? (
            <div className="px-5 py-4 space-y-3.5">
              {["sk-1", "sk-2", "sk-3", "sk-4"].map((id) => (
                <div key={id} className="flex items-center gap-4">
                  <div className="skeleton h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-28 rounded" />
                    <div className="skeleton h-3 w-40 rounded" />
                  </div>
                  <div className="skeleton h-4 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center py-20 gap-3"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Users className="h-9 w-9 text-muted-foreground/20" />
              </motion.div>
              <p className="font-display font-semibold text-foreground">
                No Customers
              </p>
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No customers match your search"
                  : "Create a customer to get started"}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-xs text-primary hover:underline"
                >
                  Clear search
                </button>
              )}
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-border bg-muted/15">
                    {["Customer", "Email", "Phone", "Created"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody
                  variants={shouldReduceMotion ? undefined : stagger}
                  initial="hidden"
                  animate="visible"
                  className="divide-y divide-border"
                >
                  {filtered.map((c: any) => (
                    <motion.tr
                      key={c._id}
                      variants={shouldReduceMotion ? undefined : staggerItem}
                      onClick={() =>
                        setSelected(selected?._id === c._id ? null : c)
                      }
                      className={cn(
                        "cursor-pointer transition-colors",
                        selected?._id === c._id
                          ? "bg-primary/5"
                          : "hover:bg-muted/30"
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={c.name}
                            email={c.email}
                            color={c.avatarColor}
                          />
                          <span className="font-semibold text-foreground">
                            {c.name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {c.email}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {c.phoneNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                        {c.createdAt ? formatDate(c.createdAt) : "—"}
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <DetailPanel customer={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
