# Hono

The Hono adapter works on **Node.js, Bun, Deno, Cloudflare Workers**, and any other Hono-compatible runtime.

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
  callbackUrl: string

  resultUrl?: string
  queueTimeOutUrl?: string
  skipIPCheck?: boolean

  onStkSuccess?: (data: {
    receiptNumber: string | null
    amount: number | null
    phone: string | null
  }) => void | Promise<void>

  onStkFailure?: (data: {
    resultCode: number
    resultDesc: string
  }) => void | Promise<void>

  onAccountBalanceResult?: (body: unknown) => void | Promise<void>
  onReversalResult?: (body: unknown) => void | Promise<void>
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

## STK Callbacks

Handle success and failure events with hooks:

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

```bash
POST /mpesa/balance/query
Content-Type: application/json

{
  "partyA":         "174379",
  "identifierType": "4",
  "remarks":        "Monthly check"
}
```

::: info
`resultUrl` and `queueTimeOutUrl` must be set in config for this route to work.
:::

## Cloudflare Workers

The Hono adapter is fully compatible with Cloudflare Workers. Export your app normally:

```ts
// src/index.ts
import { Hono } from 'hono'
import { createMpesaHonoRouter } from 'pesafy/adapters/hono'

const app = new Hono<{ Bindings: Env }>()

// Mount routes
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

## IP Verification

In production, Safaricom callback IPs are verified automatically. Use `skipIPCheck: true` only during local development:

```ts
createMpesaHonoRouter(app, {
  // ...
  skipIPCheck: process.env.NODE_ENV !== 'production',
})
```

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
