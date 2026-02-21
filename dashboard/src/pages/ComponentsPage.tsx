import {
  PaymentButton,
  PaymentForm,
  PaymentStatus,
  QRCode,
} from "pesafy/components/react";
import { useState } from "react";
import "pesafy/components/react/styles.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function ComponentsPage() {
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Component Showcase</h1>
      <p className="text-muted-foreground mb-6">
        Preview and test the Pesafy React components. These are the same
        components available in the npm package.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>PaymentButton</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentButton
              amount={100}
              onPay={async ({ amount }) => {
                setPaymentStatus("pending");
                // Simulate payment
                setTimeout(() => {
                  setPaymentStatus("success");
                }, 2000);
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PaymentForm</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentForm
              onSubmit={async (data) => {
                console.log("Payment form submitted:", data);
                setPaymentStatus("pending");
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QRCode</CardTitle>
          </CardHeader>
          <CardContent>
            <QRCode
              qrCode="https://example.com/qr-code"
              amount={500}
              merchantName="Demo Merchant"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PaymentStatus</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentStatus status={paymentStatus} />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus("idle")}
                className="rounded-lg border border-input bg-background px-3 py-1 text-sm"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus("pending")}
                className="rounded-lg border border-input bg-background px-3 py-1 text-sm"
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus("success")}
                className="rounded-lg border border-input bg-background px-3 py-1 text-sm"
              >
                Success
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus("error")}
                className="rounded-lg border border-input bg-background px-3 py-1 text-sm"
              >
                Error
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usage Example</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
            <code>{`import { PaymentButton } from "pesafy/components/react";
import "pesafy/components/react/styles.css";

<PaymentButton
  amount={100}
  onPay={async ({ amount }) => {
    // Call your backend API
    await fetch("/api/payments/stk-push", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  }}
/>`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
