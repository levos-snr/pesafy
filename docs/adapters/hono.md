# Hono

The Hono adapter works on **Node.js, Bun, Deno, Cloudflare Workers**, and any
other Hono-compatible runtime. It covers STK Push, Account Balance, and
Transaction Reversal out of the box.

## Installation

```bash
npm install pesafy hono
```

## Quick Start

```ts
import { Hono } from 'hono'
import { createMpesaHonoRouter } from 'pesafy/adapters/hono'

const app = new Hono()

createMpesaHonoRouter(app, {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/mpesa/express/callback',
  skipIPCheck: true, // local dev only
})

export default app
```

## Configuration

```ts
interface MpesaHonoConfig extends MpesaConfig {
  // ── STK Push ───────────────────────────────────────────────────────────────
  callbackUrl: string // STK Push callback URL (required)

  onStkSuccess?: (data: {
    receiptNumber: string | null
    amount: number | null
    phone: string | null
  }) => void | Promise<void>

  onStkFailure?: (data: {
    resultCode: number
    resultDesc: string
  }) => void | Promise<void>

  // ── Async APIs (Balance, Reversal) ─────────────────────────────────────────
  resultUrl?: string
  queueTimeOutUrl?: string

  onAccountBalanceResult?: (body: unknown) => void | Promise<void>
  onReversalResult?: (body: unknown) => void | Promise<void>

  // ── Dev ───────────────────────────────────────────────────────────────────
  skipIPCheck?: boolean // NEVER true in production
}
```

## Mounted Routes

| Method | Path                       | Description                              |
| ------ | -------------------------- | ---------------------------------------- |
| `POST` | `/mpesa/express/stk-push`  | Initiate STK Push                        |
| `POST` | `/mpesa/express/stk-query` | Query STK Push status                    |
| `POST` | `/mpesa/express/callback`  | Receive STK Push callback from Safaricom |
| `POST` | `/mpesa/balance/query`     | Query account balance                    |
| `POST` | `/mpesa/balance/result`    | Receive account balance result           |
| `POST` | `/mpesa/reversal/request`  | Initiate transaction reversal            |
| `POST` | `/mpesa/reversal/result`   | Receive reversal result                  |

## STK Push

Trigger a payment prompt on the customer's phone:

```bash
POST /mpesa/express/stk-push
Content-Type: application/json

{
  "amount":           100,
  "phoneNumber":      "254712345678",
  "accountReference": "ORDER-001",
  "transactionDesc":  "Checkout"
}
```

Query the status of an outstanding STK Push:

```bash
POST /mpesa/express/stk-query
Content-Type: application/json

{
  "checkoutRequestId": "ws_CO_XXXXXXXXXXXXXXXXX"
}
```

## STK Callbacks

Handle success and failure events with hooks. The `200` response to Safaricom is
sent immediately; your hook runs in the background:

```ts
createMpesaHonoRouter(app, {
  // ...
  onStkSuccess: async ({ receiptNumber, amount, phone }) => {
    await db.orders.markPaid({
      receipt: receiptNumber,
      amount,
      phone,
    })
  },

  onStkFailure: async ({ resultCode, resultDesc }) => {
    console.warn(`Payment failed [${resultCode}]: ${resultDesc}`)
  },
})
```

## Account Balance

Query the balance of a registered shortcode. `resultUrl` and `queueTimeOutUrl`
must be set in config for this route to work:

```ts
createMpesaHonoRouter(app, {
  // ...
  resultUrl: 'https://yourdomain.com/mpesa/balance/result',
  queueTimeOutUrl: 'https://yourdomain.com/mpesa/balance/timeout',
  onAccountBalanceResult: async (body) => {
    console.log('Balance result:', body)
  },
})
```

```bash
POST /mpesa/balance/query
Content-Type: application/json

{
  "partyA":         "174379",
  "identifierType": "4",
  "remarks":        "Monthly check"
}
```

::: info `resultUrl` and `queueTimeOutUrl` must be set in config for the
`/mpesa/balance/query` route to work. :::

## Transaction Reversal

Reverse a completed M-PESA transaction. `resultUrl` and `queueTimeOutUrl` must
be set in config:

```ts
createMpesaHonoRouter(app, {
  // ...
  resultUrl: 'https://yourdomain.com/mpesa/reversal/result',
  queueTimeOutUrl: 'https://yourdomain.com/mpesa/reversal/timeout',
  onReversalResult: async (body) => {
    await db.refunds.markProcessed(body)
  },
})
```

```bash
POST /mpesa/reversal/request
Content-Type: application/json

{
  "transactionId":          "OEI2AK4XXXX",
  "receiverParty":          "174379",
  "receiverIdentifierType": "4",
  "amount":                 100,
  "remarks":                "Customer refund"
}
```

::: info `resultUrl` and `queueTimeOutUrl` must be set in config for this route
to work. :::

## Cloudflare Workers

The Hono adapter is fully compatible with Cloudflare Workers. Export your app as
the default:

```ts
// src/index.ts
import { Hono } from 'hono'
import { createMpesaHonoRouter } from 'pesafy/adapters/hono'

const app = new Hono<{ Bindings: Env }>()

createMpesaHonoRouter(app, {
  consumerKey: 'YOUR_KEY',
  consumerSecret: 'YOUR_SECRET',
  environment: 'production',
  lipaNaMpesaShortCode: 'YOUR_SHORTCODE',
  lipaNaMpesaPassKey: 'YOUR_PASSKEY',
  callbackUrl: 'https://your-worker.workers.dev/mpesa/express/callback',
})

export default app
```

## Bun

```ts
import { Hono } from 'hono'
import { createMpesaHonoRouter } from 'pesafy/adapters/hono'

const app = new Hono()

createMpesaHonoRouter(app, {
  /* config */
})

Bun.serve({ fetch: app.fetch, port: 3000 })
```

## Deno

```ts
import { Hono } from 'npm:hono'
import { createMpesaHonoRouter } from 'npm:pesafy/adapters/hono'

const app = new Hono()

createMpesaHonoRouter(app, {
  /* config */
})

Deno.serve(app.fetch)
```

## Using a Route Prefix

Mount the M-PESA routes under a sub-path using Hono's `basePath` or by nesting a
sub-app:

```ts
const api = new Hono().basePath('/api')
createMpesaHonoRouter(api, {
  /* config */
})

// Routes are now at /api/mpesa/express/stk-push, etc.
app.route('/', api)
```

## IP Verification

Safaricom callback IPs are verified automatically in production. Use
`skipIPCheck: true` only during local development:

```ts
createMpesaHonoRouter(app, {
  // ...
  skipIPCheck: process.env.NODE_ENV !== 'production',
})
```

::: warning Never set `skipIPCheck: true` in a production deployment. :::

## Environment Variables

```bash
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_ENVIRONMENT=sandbox
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279...
MPESA_CALLBACK_URL=https://yourdomain.com/mpesa/express/callback
MPESA_RESULT_URL=https://yourdomain.com/mpesa/result
MPESA_QUEUE_TIMEOUT_URL=https://yourdomain.com/mpesa/timeout
```
