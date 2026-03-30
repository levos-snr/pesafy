# Introduction

**pesafy** is a type-safe, zero-dependency M-PESA Daraja SDK for JavaScript and TypeScript. It works in every JS runtime — Node.js, Bun, Deno, Cloudflare Workers, and any JS framework.

## Why pesafy?

The Safaricom Daraja API is powerful but notoriously tricky to integrate correctly. `pesafy` handles the hard parts:

- **OAuth token caching** — tokens are fetched once and refreshed automatically before expiry.
- **RSA credential encryption** — `SecurityCredential` is encrypted on the fly from your initiator password and certificate.
- **Phone normalisation** — `0712345678`, `+254712345678`, and `254712345678` all work transparently.
- **Auto-retry** — transient 503/429 errors are retried with exponential backoff and jitter.
- **Webhook IP verification** — incoming callbacks are verified against Safaricom's official IP whitelist.
- **Full TypeScript** — every request body, response, and webhook payload is typed.

## Supported APIs

| API                       | Method                       | Type               |
| ------------------------- | ---------------------------- | ------------------ |
| STK Push (M-PESA Express) | `mpesa.stkPush()`            | Synchronous prompt |
| STK Query                 | `mpesa.stkQuery()`           | Status check       |
| C2B Register URLs         | `mpesa.registerC2BUrls()`    | One-time setup     |
| C2B Simulate              | `mpesa.simulateC2B()`        | Sandbox only       |
| B2C Payment               | `mpesa.b2cPayment()`         | Async              |
| B2B Express Checkout      | `mpesa.b2bExpressCheckout()` | USSD Push          |
| Account Balance           | `mpesa.accountBalance()`     | Async              |
| Transaction Status        | `mpesa.transactionStatus()`  | Async              |
| Transaction Reversal      | `mpesa.reverseTransaction()` | Async              |
| Tax Remittance (KRA)      | `mpesa.remitTax()`           | Async              |
| Dynamic QR Code           | `mpesa.generateDynamicQR()`  | Synchronous        |
| Bill Manager              | `mpesa.sendInvoice()` etc.   | Push notification  |

## Supported Runtimes

| Runtime             | Support                               |
| ------------------- | ------------------------------------- |
| Node.js ≥ 18        | ✅ Full                               |
| Bun                 | ✅ Full                               |
| Deno                | ✅ Full                               |
| Cloudflare Workers  | ✅ (via Hono adapter)                 |
| Vercel Edge Runtime | ✅                                    |
| Browser             | ⚠️ Not recommended (secrets exposure) |

## Next Steps

- [Install pesafy](/guide/installation) and configure your environment
- [Quick Start](/guide/quick-start) — send your first STK Push in minutes
- [CLI](/guide/cli) — validate config and test from the terminal
