export default function ReactDocsPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-foreground">
        React Components · Mpesa Express
      </h1>
      <p className="text-sm text-muted-foreground">
        Pesafy ships React components that match this dashboard&apos;s theme.
        They collect payment details and call your Express endpoints — Daraja
        credentials always stay on the server.
      </p>
      <pre className="rounded-xl bg-muted p-4 text-xs overflow-x-auto">
        <code>{`import {
  PaymentForm,
  PaymentStatus,
} from "pesafy/components/react";
import "pesafy/components/react/styles.css";

export function CheckoutButton() {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  return (
    <>
      <PaymentForm
        onSubmit={async (data) => {
          setStatus("pending");
          const res = await fetch("/api/mpesa/express/stk-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          setStatus(res.ok ? "success" : "error");
        }}
      />
      <PaymentStatus status={status} />
    </>
  );
}`}</code>
      </pre>
      <p className="text-xs text-muted-foreground">
        The CSS file uses the same design tokens as the dashboard (
        <code>--primary</code>, <code>--background</code>, etc.), so the
        components blend into any Pesafy-powered UI.
      </p>
    </div>
  );
}
