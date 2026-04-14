# Introduction

**pesafy** is a type-safe, framework-agnostic SDK for Safaricom's Daraja 2.0
API. It runs on Node.js (≥18), Bun, Deno, Cloudflare Workers, and integrates
with Next.js, Fastify, Hono, and Express through purpose-built adapters.

## What pesafy covers

Every Safaricom Daraja API is implemented and fully typed:

| Category                   | APIs                                                                        |
| -------------------------- | --------------------------------------------------------------------------- |
| **Customer Payments**      | STK Push (M-PESA Express), C2B Register URLs, C2B Simulate                  |
| **Business Disbursements** | B2C Account Top-Up, B2C Disbursement (Salary / BusinessPayment / Promotion) |
| **Business-to-Business**   | B2B Express Checkout, B2B Buy Goods, B2B Pay Bill                           |
| **Account & Transactions** | Account Balance, Transaction Status, Transaction Reversal                   |
| **Compliance**             | Tax Remittance to KRA                                                       |
| **Utilities**              | Dynamic QR Code, Bill Manager (opt-in, invoices, reconciliation)            |

## Why pesafy?

**Type-safe by default.** Every request, response, webhook payload, and result
code has a TypeScript type. Branded primitives (`KesAmount`, `MsisdnKE`) catch
argument-order bugs at compile time.

**Framework adapters.** Mount every M-PESA route — including webhook handlers —
with a single function call in Express, Hono, Next.js App Router, or Fastify.

**Result\<T\> pattern.** `stkPushSafe()` and `accountBalanceSafe()` return a
discriminated `{ ok: true, data }` / `{ ok: false, error }` union instead of
throwing. No try/catch required.

**Auto-retry.** Transient Daraja 5xx errors are retried automatically with
exponential backoff and ±25% jitter. 4xx errors are never retried.

**Powerful CLI.** Scaffold config, send test payments, query transaction status,
and encrypt initiator credentials from your terminal without writing a single
line of code.

## Quick example

```ts
import { Mpesa } from 'pesafy'

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
})

// STK Push — sends a PIN prompt to the customer's phone
const response = await mpesa.stkPush({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourapp.com/api/mpesa/callback',
  accountReference: 'INV-001',
  transactionDesc: 'Payment',
})

console.log(response.CheckoutRequestID)
// ws_CO_260520241133524545
```

::: tip The constructor is `new Mpesa(config)` — not `createPesafy()`. The
`Mpesa` class is the single entry point for all Daraja APIs. :::

## Next steps

- [Installation](./installation) — prerequisites and environment setup
- [Quick Start](./quick-start) — STK Push end-to-end in 5 minutes
- [Configuration](./configuration) — every `MpesaConfig` option explained
- [Error Handling](./error-handling) — `PesafyError`, `Result<T>`, and retry
  behaviour
- [CLI](./cli) — terminal commands reference
- [Webhooks & IP Verification](./webhooks) — handling Safaricom callbacks safely
- [Branded Types](./branded-types) — compile-time type safety
