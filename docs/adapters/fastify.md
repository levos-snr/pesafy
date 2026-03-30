# Fastify

The Fastify adapter registers all M-PESA routes onto an existing Fastify instance.

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
  callbackUrl: string

  resultUrl?: string
  queueTimeOutUrl?: string
  skipIPCheck?: boolean

  onStkSuccess?: (data: {
    receiptNumber: string | null
    amount: number | null
    phone: string | null
  }) => void | Promise<void>
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

## Handling the STK Callback

Use the `onStkSuccess` hook for fire-and-forget processing. The `200` response to Safaricom is sent immediately; your hook runs in the background:

```ts
await registerMpesaRoutes(app, {
  // ...
  onStkSuccess: async ({ receiptNumber, amount, phone }) => {
    await db.orders.markPaid({ receiptNumber, amount, phone })
  },
})
```

## Account Balance

```bash
POST /mpesa/balance
Content-Type: application/json

{
  "partyA":         "174379",
  "identifierType": "4",
  "remarks":        "Monthly check"
}
```

::: info
`resultUrl` and `queueTimeOutUrl` must be set in config for the `/mpesa/balance` route to work.
:::

## Transaction Reversal

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
```

## IP Verification

Safaricom callback IPs are verified automatically. Set `skipIPCheck: true` only for local development:

```ts
skipIPCheck: process.env.NODE_ENV !== 'production'
```

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
