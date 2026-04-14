# Fastify

The Fastify adapter registers all M-PESA routes onto an existing Fastify
instance. It covers STK Push, Account Balance, and Transaction Reversal.

## Installation

```bash
npm install pesafy fastify
```

## Quick Start

```ts
import Fastify from 'fastify'
import { registerMpesaRoutes } from 'pesafy/adapters/fastify'

const app = Fastify({ logger: true })

await registerMpesaRoutes(app, {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/mpesa/callback',
  skipIPCheck: true, // local dev only
})

await app.listen({ port: 3000 })
```

## Configuration

```ts
interface MpesaFastifyConfig extends MpesaConfig {
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

| Method | Path                     | Description                              |
| ------ | ------------------------ | ---------------------------------------- |
| `POST` | `/mpesa/stk-push`        | Initiate STK Push                        |
| `POST` | `/mpesa/stk-query`       | Query STK Push status                    |
| `POST` | `/mpesa/callback`        | Receive STK Push callback from Safaricom |
| `POST` | `/mpesa/balance`         | Query account balance                    |
| `POST` | `/mpesa/balance/result`  | Receive account balance result           |
| `POST` | `/mpesa/reversal`        | Initiate transaction reversal            |
| `POST` | `/mpesa/reversal/result` | Receive reversal result                  |

## STK Push

Trigger a payment prompt on the customer's phone:

```bash
POST /mpesa/stk-push
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
POST /mpesa/stk-query
Content-Type: application/json

{
  "checkoutRequestId": "ws_CO_XXXXXXXXXXXXXXXXX"
}
```

## Handling the STK Callback

Use `onStkSuccess` and `onStkFailure` hooks for fire-and-forget processing. The
`200` response to Safaricom is sent immediately; your hook runs in the
background:

```ts
await registerMpesaRoutes(app, {
  // ...
  onStkSuccess: async ({ receiptNumber, amount, phone }) => {
    await db.orders.markPaid({ receiptNumber, amount, phone })
  },

  onStkFailure: async ({ resultCode, resultDesc }) => {
    console.warn(`Payment failed [${resultCode}]: ${resultDesc}`)
  },
})
```

## Account Balance

Query the balance of a registered shortcode. `resultUrl` and `queueTimeOutUrl`
must be set in config:

```ts
await registerMpesaRoutes(app, {
  // ...
  resultUrl: 'https://yourdomain.com/mpesa/balance/result',
  queueTimeOutUrl: 'https://yourdomain.com/mpesa/balance/timeout',
  onAccountBalanceResult: async (body) => {
    console.log('Balance result:', body)
  },
})
```

```bash
POST /mpesa/balance
Content-Type: application/json

{
  "partyA":         "174379",
  "identifierType": "4",
  "remarks":        "Monthly check"
}
```

::: info `resultUrl` and `queueTimeOutUrl` must be set in config for the
`/mpesa/balance` route to work. :::

## Transaction Reversal

Reverse a completed M-PESA transaction:

```ts
await registerMpesaRoutes(app, {
  // ...
  resultUrl: 'https://yourdomain.com/mpesa/reversal/result',
  queueTimeOutUrl: 'https://yourdomain.com/mpesa/reversal/timeout',
  onReversalResult: async (body) => {
    await db.refunds.markProcessed(body)
  },
})
```

```bash
POST /mpesa/reversal
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

## Using a Route Prefix

Register routes under a sub-path using Fastify's `register`:

```ts
import Fastify from 'fastify'
import { registerMpesaRoutes } from 'pesafy/adapters/fastify'

const app = Fastify()

app.register(
  async (instance) => {
    await registerMpesaRoutes(instance, {
      /* config */
    })
  },
  { prefix: '/api' },
)

// Routes are now at /api/mpesa/stk-push, etc.
await app.listen({ port: 3000 })
```

## IP Verification

Safaricom callback IPs are verified automatically in production. Set
`skipIPCheck: true` only for local development:

```ts
skipIPCheck: process.env.NODE_ENV !== 'production'
```

::: warning Never set `skipIPCheck: true` in a production deployment. :::

## Environment Variables

```bash
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_ENVIRONMENT=sandbox
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279...
MPESA_CALLBACK_URL=https://yourdomain.com/mpesa/callback
MPESA_INITIATOR_NAME=testapi
MPESA_INITIATOR_PASSWORD=Safaricom123!
MPESA_CERTIFICATE_PATH=./SandboxCertificate.cer
MPESA_RESULT_URL=https://yourdomain.com/mpesa/result
MPESA_QUEUE_TIMEOUT_URL=https://yourdomain.com/mpesa/timeout
```
