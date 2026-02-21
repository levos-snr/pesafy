# Pesafy React Components

Reusable React components for M-Pesa payment integration.

## Installation

```bash
npm install pesafy react
```

## Import Styles

```tsx
import "pesafy/components/react/styles.css";
```

## Components

### PaymentButton

Simple button to trigger payment.

```tsx
import { PaymentButton } from "pesafy/components/react";

<PaymentButton
  amount={100}
  onPay={async ({ amount }) => {
    // Call your backend API which uses Pesafy
    await fetch("/api/payments/stk-push", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  }}
/>;
```

### PaymentForm

Complete form for collecting payment details.

```tsx
import { PaymentForm } from "pesafy/components/react";

<PaymentForm
  onSubmit={async (data) => {
    // data: { amount, phoneNumber, accountReference, transactionDesc }
    await fetch("/api/payments/stk-push", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }}
/>;
```

### QRCode

Display M-Pesa Dynamic QR code.

```tsx
import { QRCode } from "pesafy/components/react";

// After calling mpesa.qrCode() on backend
<QRCode base64={qrCodeResponse.QRCode} size={300} />;
```

### PaymentStatus

Display payment status.

```tsx
import { PaymentStatus } from "pesafy/components/react";

<PaymentStatus
  status="pending" // "idle" | "pending" | "success" | "error"
  message="Waiting for payment confirmation"
/>;
```

## Important Security Note

**Never expose your Daraja API credentials in client-side code!**

Components call your backend API, which uses Pesafy with credentials:

```tsx
// ✅ Good: Call your backend
onPay={async ({ amount }) => {
  await fetch("/api/payments/stk-push", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}}

// ❌ Bad: Don't do this!
import { Mpesa } from "pesafy";
const mpesa = new Mpesa({ consumerKey: "...", ... }); // NO!
```

## Example: Next.js API Route

```typescript
// app/api/payments/stk-push/route.ts
import { Mpesa } from "pesafy";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
  lipaNaMpesaShortCode: "174379",
  lipaNaMpesaPassKey: process.env.LIPA_NA_MPESA_PASSKEY!,
});

export async function POST(req: Request) {
  const { amount, phoneNumber, accountReference, transactionDesc } =
    await req.json();

  const result = await mpesa.stkPush({
    amount,
    phoneNumber,
    callbackUrl: `${process.env.BASE_URL}/api/webhooks/stk-push`,
    accountReference,
    transactionDesc,
  });

  return Response.json(result);
}
```
