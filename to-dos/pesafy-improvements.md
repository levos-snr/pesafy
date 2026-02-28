# pesafy — Future Improvements Roadmap

> A fintech-grade improvement plan for the `pesafy` M-Pesa Daraja SDK.
> Grounded in the official Safaricom Daraja API documentation, modern TypeScript patterns, and production fintech engineering standards.

---

## 1. Missing Daraja APIs

The current SDK covers STK Push, STK Query, and Transaction Status. The full Daraja surface is much wider. Each of these is a separate revenue-generating integration point for businesses.

### 1.1 B2C (Business to Customer) Payments

Used for salary disbursements, cashbacks, and refunds. This is one of the most commercially important Daraja APIs.

```ts
// Proposed API
await mpesa.b2c({
  amount: 5000,
  phoneNumber: "0712345678",
  commandId: "SalaryPayment", // | "BusinessPayment" | "PromotionPayment"
  remarks: "March salary",
  resultUrl: "https://yourdomain.com/mpesa/b2c/result",
  queueTimeOutUrl: "https://yourdomain.com/mpesa/b2c/timeout",
});
```

**Why it matters:** B2C requires `SecurityCredential` (RSA encryption) — which the SDK already supports. The infrastructure is 80% ready. B2C unlocks marketplaces, insurance payouts, and gig-worker platforms.

### 1.2 C2B (Customer to Business) Registration & Confirmation

Allows merchants to register callback URLs for PayBill/Till payments made outside of STK Push (e.g. customer dials *150*00# themselves).

```ts
// Two endpoints needed:
await mpesa.c2bRegister({
  shortCode: "174379",
  responseType: "Completed",
  confirmationUrl: "https://yourdomain.com/mpesa/c2b/confirm",
  validationUrl: "https://yourdomain.com/mpesa/c2b/validate",
});

await mpesa.c2bSimulate({  // sandbox only
  shortCode: "174379",
  commandId: "CustomerPayBillOnline",
  amount: 100,
  msisdn: "254712345678",
  billRefNumber: "INV-001",
});
```

### 1.3 Transaction Reversal

Critical for fintech compliance — allows merchants to reverse erroneous or disputed transactions.

```ts
await mpesa.reverse({
  transactionId: "OEI2AK4XXXX",
  amount: 100,
  receiverShortCode: "174379",
  remarks: "Customer refund",
  resultUrl: "https://yourdomain.com/mpesa/reversal/result",
  queueTimeOutUrl: "https://yourdomain.com/mpesa/reversal/timeout",
});
```

### 1.4 Account Balance Query

Allows businesses to programmatically check their M-Pesa account balance — essential for treasury dashboards and automated reconciliation.

```ts
await mpesa.accountBalance({
  partyA: "174379",
  identifierType: "4",
  resultUrl: "https://yourdomain.com/mpesa/balance/result",
  queueTimeOutUrl: "https://yourdomain.com/mpesa/balance/timeout",
});
```

### 1.5 Tax Remittance (KRA)

The docs already include this API. It enables businesses to remit tax directly to Kenya Revenue Authority via M-Pesa.

```ts
await mpesa.remitTax({
  amount: 239,
  partyA: "888880",
  accountReference: "PRN1234XN", // KRA Payment Registration Number
  resultUrl: "https://yourdomain.com/mpesa/tax/result",
  queueTimeOutUrl: "https://yourdomain.com/mpesa/tax/timeout",
});
```

### 1.6 B2B (Business to Business)

Transfers between businesses — Paybill to Paybill, Paybill to Till.

---

## 2. STK Push Result Code Enum

The Daraja docs define 15+ specific STK result codes. Currently these are just raw numbers with no SDK-level meaning. This leads to developers guessing what `ResultCode: 17` means.

### Proposed: `StkResultCode` enum

```ts
// src/mpesa/stk-push/result-codes.ts

export const StkResultCode = {
  SUCCESS: 0,
  INSUFFICIENT_BALANCE: 1,
  LESS_THAN_MINIMUM: 2,
  EXCEEDS_MAXIMUM_AMOUNT: 3,
  EXCEEDS_DAILY_LIMIT: 4,
  EXCEEDS_BALANCE_LIMIT: 8,
  DUPLICATE_WITHIN_2_MINUTES: 17,
  TRANSACTION_EXPIRED: 1019,
  USSD_PUSH_ERROR: 1025,
  CANCELLED_BY_USER: 1032,
  USER_UNREACHABLE_TIMEOUT: 1037,
  WRONG_PIN: 2001,
  WRONG_TRANSACTION_TYPE_OR_PARTY_B: 2028,
  CREDENTIAL_LOCKED: 8006,
} as const;

export type StkResultCode = typeof StkResultCode[keyof typeof StkResultCode];

// Helper for human-readable messages
export function describeStkResult(code: number): string {
  const descriptions: Record<number, string> = {
    0:    "Transaction successful",
    1:    "Insufficient balance",
    1032: "Cancelled by user",
    1037: "User unreachable (phone offline or busy)",
    2001: "Wrong PIN entered",
    17:   "Duplicate transaction — wait 2 minutes",
    // ...
  };
  return descriptions[code] ?? `Unknown result code: ${code}`;
}
```

Usage in `webhook-handler.ts`:

```ts
import { StkResultCode, describeStkResult } from "./result-codes";

if (webhook.Body.stkCallback.ResultCode === StkResultCode.CANCELLED_BY_USER) {
  // handle cancellation specifically
}
```

---

## 3. STK Push Polling Helper

The Daraja docs show that STK Push is asynchronous. Many developers need to poll for status without receiving a callback (e.g. mobile apps). A built-in polling utility removes a major boilerplate burden.

```ts
// src/mpesa/stk-push/polling.ts

export interface PollOptions {
  /** How often to check in milliseconds (default: 3000) */
  intervalMs?: number;
  /** Maximum total wait time in milliseconds (default: 120_000 = 2 minutes) */
  timeoutMs?: number;
  /** Called on each poll attempt */
  onPoll?: (attempt: number) => void;
}

export async function pollStkStatus(
  mpesa: Mpesa,
  checkoutRequestId: string,
  options: PollOptions = {}
): Promise<StkQueryResponse> {
  const { intervalMs = 3000, timeoutMs = 120_000, onPoll } = options;
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    onPoll?.(attempt);

    const result = await mpesa.stkQuery({ checkoutRequestId });

    // ResultCode 0 = success, anything else that is not "pending" = terminal
    if (result.ResultCode !== undefined) {
      return result; // terminal state reached
    }

    await sleep(intervalMs);
  }

  throw new PesafyError({
    code: "TIMEOUT",
    message: `STK Push polling timed out after ${timeoutMs}ms`,
  });
}
```

Usage:

```ts
const push = await mpesa.stkPush({ ... });

const result = await pollStkStatus(mpesa, push.CheckoutRequestID, {
  timeoutMs: 90_000,
  onPoll: (n) => console.log(`Poll attempt ${n}...`),
});
```

---

## 4. Framework-Agnostic Webhook Handler (Beyond Express)

The `express/` adapter is useful, but most modern Kenyan fintech startups use Hono, Fastify, Elysia (Bun-native), or Next.js API routes. A framework-agnostic core handler makes porting trivial.

### Proposed: `createMpesaWebhookHandler`

```ts
// src/adapters/core.ts

export interface WebhookRequest {
  body: unknown;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface WebhookResponse {
  status: number;
  body: { ResultCode: 0; ResultDesc: "Accepted" };
}

export function createMpesaWebhookHandler(config: { skipIPCheck?: boolean }) {
  return function handleRequest(req: WebhookRequest): WebhookResponse {
    // All framework-agnostic logic here
    const result = handleWebhook(req.body, {
      requestIP: extractIP(req),
      skipIPCheck: config.skipIPCheck,
    });

    return { status: 200, body: { ResultCode: 0, ResultDesc: "Accepted" } };
  };
}
```

Then adapters become thin wrappers:

```ts
// src/adapters/hono.ts
import { createMpesaWebhookHandler } from "./core";

export function createHonoMpesaRouter(app: Hono, config: MpesaExpressConfig) {
  const handle = createMpesaWebhookHandler(config);
  app.post("/mpesa/express/callback", (c) => {
    handle({ body: await c.req.json(), ip: c.req.header("x-forwarded-for") });
    return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
  });
}

// src/adapters/nextjs.ts — Next.js App Router
export function createNextMpesaHandler(config: MpesaExpressConfig) {
  return async function POST(req: Request) {
    const body = await req.json();
    // handle...
    return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
  };
}
```

---

## 5. Event Emitter Pattern for Webhooks

Rather than just logging inside the Express router, expose a typed event emitter so host apps can react to specific webhook events cleanly without coupling to the SDK internals.

```ts
// src/mpesa/events.ts
import { EventEmitter } from "node:events";

export interface MpesaEvents {
  "stk.success": (data: {
    receiptNumber: string;
    amount: number;
    phone: string;
    checkoutRequestId: string;
  }) => void;
  "stk.failed": (data: {
    resultCode: number;
    resultDesc: string;
    checkoutRequestId: string;
  }) => void;
  "stk.cancelled": (data: { checkoutRequestId: string }) => void;
  "transaction.status": (data: TransactionStatusResult["Result"]) => void;
  "webhook.rejected": (data: { ip: string; reason: string }) => void;
}

export class MpesaEmitter extends EventEmitter {
  emit<K extends keyof MpesaEvents>(
    event: K,
    ...args: Parameters<MpesaEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
  on<K extends keyof MpesaEvents>(event: K, listener: MpesaEvents[K]): this {
    return super.on(event, listener);
  }
}
```

Usage in a host application:

```ts
const { mpesa, events } = createMpesaExpressClient(config);

events.on("stk.success", async ({ receiptNumber, amount, phone }) => {
  await db.payments.update({ receiptNumber, amount, phone, status: "paid" });
  await sendSmsConfirmation(phone, amount);
});

events.on("stk.failed", ({ resultCode, resultDesc }) => {
  logger.warn("STK Push failed", { resultCode, resultDesc });
});
```

---

## 6. Idempotency Keys

Daraja has a "duplicate transaction" window (ResultCode 17 — same amount to same number within 2 minutes). The SDK should expose idempotency key support to prevent double-charges in retry scenarios.

```ts
// src/mpesa/idempotency.ts

const requestCache = new Map<string, { response: StkPushResponse; at: number }>();
const IDEMPOTENCY_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export function withIdempotency(
  key: string,
  fn: () => Promise<StkPushResponse>
): Promise<StkPushResponse> {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.at < IDEMPOTENCY_WINDOW_MS) {
    return Promise.resolve(cached.response); // return cached, don't double-charge
  }

  return fn().then((response) => {
    requestCache.set(key, { response, at: Date.now() });
    return response;
  });
}
```

Usage:

```ts
const result = await withIdempotency(`order:${orderId}`, () =>
  mpesa.stkPush({ amount, phoneNumber, ... })
);
```

For production, the in-memory cache should be replaceable with Redis:

```ts
// Allow custom idempotency store
await mpesa.stkPush({ ..., idempotencyKey: `order:${orderId}` });
```

---

## 7. OpenTelemetry / Observability

Every fintech SDK should emit spans for distributed tracing. Stripe, Braintree, and Adyen all do this. It lets engineering teams debug slow Daraja API calls in Datadog, Grafana Tempo, or Honeycomb without code changes.

```ts
// src/utils/telemetry.ts
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("pesafy", "1.0.0");

export async function withSpan<T>(
  name: string,
  attrs: Record<string, string | number>,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes(attrs);
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

Wrap every Daraja API call:

```ts
// Inside processStkPush()
return withSpan("mpesa.stkPush", {
  "mpesa.shortcode": request.shortCode,
  "mpesa.amount": amount,
  "mpesa.environment": "sandbox",
}, () => httpRequest<StkPushResponse>(...));
```

Zero config for users who don't use OTel. Automatic traces for those who do.

---

## 8. Zod Request Validation

Replace manual `if (!body.phoneNumber)` guards with a Zod schema. This gives better error messages, strips unknown fields, and coerces types (e.g. `"100"` string → `100` number).

```ts
// src/mpesa/stk-push/schema.ts
import { z } from "zod";

export const StkPushSchema = z.object({
  amount: z.number().positive().int({ message: "Amount must be a whole number" }),
  phoneNumber: z
    .string()
    .regex(/^(\+?254|0)7\d{8}$/, "Must be a valid Kenyan M-Pesa number"),
  accountReference: z.string().max(12).default(`PESAFY-${Date.now()}`),
  transactionDesc: z.string().max(13).default("Payment"),
  transactionType: z
    .enum(["CustomerPayBillOnline", "CustomerBuyGoodsOnline"])
    .default("CustomerPayBillOnline"),
  partyB: z.string().optional(),
});

export type StkPushInput = z.input<typeof StkPushSchema>;
```

Then in `processStkPush`:

```ts
const validated = StkPushSchema.parse(request);
// No more manual validation blocks needed
```

Zod errors automatically surface as `VALIDATION_ERROR` with field-level detail:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "phoneNumber: Must be a valid Kenyan M-Pesa number"
}
```

---

## 9. Structured Logger with Log Levels

The current SDK uses `console.log`, `console.warn`, and `console.info` directly. Production fintech systems need structured JSON logs that integrate with Datadog, CloudWatch, or Loki. Replace the console calls with an injectable logger interface.

```ts
// src/utils/logger.ts

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export const consoleLogger: Logger = {
  debug: (msg, meta) => console.debug(JSON.stringify({ level: "debug", msg, ...meta })),
  info:  (msg, meta) => console.info(JSON.stringify({ level: "info",  msg, ...meta })),
  warn:  (msg, meta) => console.warn(JSON.stringify({ level: "warn",  msg, ...meta })),
  error: (msg, meta) => console.error(JSON.stringify({ level: "error", msg, ...meta })),
};

export const noopLogger: Logger = {
  debug: () => {}, info: () => {}, warn: () => {}, error: () => {},
};
```

Users inject their own logger (Pino, Winston, etc.):

```ts
const mpesa = new Mpesa({
  consumerKey: "...",
  logger: pinoLogger, // drop-in replacement
});
```

---

## 10. Receipt Verification Utility

A very common fintech requirement: given an M-Pesa receipt number from a customer, verify it actually belongs to your shortcode and matches the expected amount. Currently developers have to build this themselves using Transaction Status.

```ts
// src/mpesa/verify-receipt.ts

export interface ReceiptVerificationResult {
  valid: boolean;
  transactionId: string;
  amount?: number;
  phone?: string;
  completedAt?: string;
  reason?: string; // if invalid
}

export async function verifyReceipt(
  mpesa: Mpesa,
  receiptNumber: string,
  expected: { amount?: number; shortCode: string }
): Promise<ReceiptVerificationResult> {
  const status = await mpesa.transactionStatus({
    transactionId: receiptNumber,
    partyA: expected.shortCode,
    identifierType: "4",
    resultUrl: "...", // caller must provide
    queueTimeOutUrl: "...",
  });

  // Parse async result once it arrives...
  return { valid: true, transactionId: receiptNumber };
}
```

This is a fundamental fintech primitive: M-Pesa confirmation codes are sent to customers via SMS and they often use them as payment proof. Merchants need to verify them programmatically.

---

## 11. React Hooks Package (`pesafy/react`)

For full-stack Kenyan startups using React/Next.js, a hooks package removes the need to manage STK Push state manually in every component.

```tsx
// pesafy/react — proposed package

import { useStkPush } from "pesafy/react";

function CheckoutButton() {
  const { initiate, status, receiptNumber, error } = useStkPush({
    apiUrl: "/api/mpesa/stk-push",  // your backend endpoint
    pollUrl: "/api/mpesa/stk-query",
    pollIntervalMs: 3000,
  });

  return (
    <div>
      <button
        onClick={() => initiate({ amount: 500, phoneNumber: "0712345678" })}
        disabled={status === "pending"}
      >
        {status === "pending" ? "Waiting for PIN..." : "Pay with M-Pesa"}
      </button>
      {status === "success" && <p>✅ Paid! Receipt: {receiptNumber}</p>}
      {status === "failed" && <p>❌ {error}</p>}
    </div>
  );
}
```

State machine: `idle → initiating → pending → success | failed | cancelled | timeout`

---

## 12. CLI Tool (`pesafy-cli`)

A developer CLI for running Daraja API calls directly from the terminal — invaluable for debugging production issues without writing a test script.

```bash
# Test STK Push from terminal
npx pesafy-cli stk-push \
  --consumer-key $MPESA_KEY \
  --consumer-secret $MPESA_SECRET \
  --shortcode 174379 \
  --passkey bfb279... \
  --amount 1 \
  --phone 0712345678 \
  --callback-url https://yourapp.ngrok.io/callback \
  --env sandbox

# Check token
npx pesafy-cli auth --consumer-key $KEY --consumer-secret $SECRET

# Decrypt a security credential
npx pesafy-cli encrypt-credential \
  --password Safaricom123! \
  --cert ./SandboxCertificate.cer
```

---

## 13. Embedded Sandbox Certificates

Currently the user must download `SandboxCertificate.cer` and `ProductionCertificate.cer` themselves and provide a file path. This is a friction point. Bundle both certificates directly into the package.

```ts
// src/core/encryption/certificates.ts

// Bundle certs at build time
import sandboxCert from "../../certs/SandboxCertificate.cer?raw";
import productionCert from "../../certs/ProductionCertificate.cer?raw";

export function getBuiltInCertificate(env: "sandbox" | "production"): string {
  return env === "sandbox" ? sandboxCert : productionCert;
}
```

Then `Mpesa` auto-selects the right cert if no custom cert is provided:

```ts
// Before: user must do this:
const mpesa = new Mpesa({
  certificatePath: "./SandboxCertificate.cer",
  // ...
});

// After: works out of the box:
const mpesa = new Mpesa({
  environment: "sandbox",
  // certificate auto-selected from embedded certs
});
```

This removes the #1 setup error for new developers (wrong cert for wrong environment, or missing cert entirely).

---

## 14. Rate Limit Awareness

The Daraja docs explicitly document several rate-limit error codes:

- `500.003.02` — Spike Arrest Violation (too many requests/second)
- `500.003.03` — Quota Violation (daily limit exceeded)
- ResultCode `17` — Same amount to same number within 2 minutes

The SDK should detect these and either auto-retry with backoff or surface them as distinct error codes.

```ts
// Extend ErrorCode
export type ErrorCode =
  | ... // existing codes
  | "RATE_LIMITED"      // Spike Arrest / Quota Violation
  | "DUPLICATE_REQUEST" // ResultCode 17

// In httpRequest():
if (daraja.errorCode === "500.003.02" || daraja.errorCode === "500.003.03") {
  throw new PesafyError({
    code: "RATE_LIMITED",
    message: "Daraja rate limit hit. Back off and retry.",
    statusCode: response.status,
    retryAfterMs: 60_000, // suggested wait
  });
}
```

---

## 15. `pesafy.config.ts` — Zero-Config Setup

Inspired by `next.config.ts` and `drizzle.config.ts`, allow a project-level config file so developers don't repeat credentials in every call.

```ts
// pesafy.config.ts  (project root)
import { defineConfig } from "pesafy";

export default defineConfig({
  consumerKey:          process.env.MPESA_CONSUMER_KEY!,
  consumerSecret:       process.env.MPESA_CONSUMER_SECRET!,
  environment:          "sandbox",
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey:   process.env.MPESA_PASSKEY!,
  callbackUrl:          process.env.MPESA_CALLBACK_URL!,
});
```

Then anywhere in the project:

```ts
import { mpesa } from "pesafy"; // auto-reads pesafy.config.ts
await mpesa.stkPush({ amount: 100, phoneNumber: "0712345678" });
```

---

## Priority Order

| Priority | Feature | Impact | Effort |
|---|---|---|---|
| 🔴 Critical | B2C Payments (§1.1) | Very High — unlocks payouts | Medium |
| 🔴 Critical | Embedded certificates (§13) | High — removes #1 DX friction | Low |
| 🔴 Critical | Result Code enum (§2) | High — prevents silent bugs | Low |
| 🟠 High | C2B Registration (§1.2) | High — passive payment capture | Medium |
| 🟠 High | Event emitter pattern (§5) | High — cleaner host-app integration | Medium |
| 🟠 High | Zod validation (§8) | High — better error messages | Low |
| 🟡 Medium | STK polling helper (§3) | Medium — big DX improvement | Low |
| 🟡 Medium | Framework adapters (§4) | Medium — Hono/Next.js users | Medium |
| 🟡 Medium | Structured logger (§9) | Medium — production observability | Low |
| 🟡 Medium | Rate limit handling (§14) | Medium — production resilience | Low |
| 🟢 Future | React hooks (§11) | High — frontend developers | High |
| 🟢 Future | OpenTelemetry (§7) | Medium — enterprise users | Medium |
| 🟢 Future | CLI tool (§12) | Medium — developer experience | High |
| 🟢 Future | `pesafy.config.ts` (§15) | Medium — zero-config DX | Medium |
| 🟢 Future | Reversal API (§1.3) | High — compliance requirement | Medium |
| 🟢 Future | Account Balance (§1.4) | Medium — treasury tooling | Medium |
| 🟢 Future | Tax Remittance (§1.5) | Medium — KRA compliance | Medium |

---

## Architecture Note

As the SDK grows, consider splitting into a monorepo:

```
pesafy/
├── packages/
│   ├── core/          — Mpesa class, auth, encryption, http
│   ├── express/       — Express adapter (current)
│   ├── hono/          — Hono adapter
│   ├── nextjs/        — Next.js App Router adapter
│   ├── react/         — React hooks
│   └── cli/           — pesafy-cli
```

Using Turborepo or Bun workspaces, with a single `tsup` config per package. This keeps tree-shaking clean — a Next.js user doesn't bundle the Express adapter.
