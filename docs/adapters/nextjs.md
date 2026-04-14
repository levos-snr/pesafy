# Next.js App Router

The Next.js adapter provides typed **Route Handlers** for the App Router. It
does not import `next/server` at build time, so it works with any Next.js 13+
project.

## Installation

```bash
npm install pesafy
```

## Quick Start

Create individual route files under `app/api/mpesa/`:

### `app/api/mpesa/stk-push/route.ts`

```ts
import { createStkPushHandler } from 'pesafy/adapters/nextjs'

export const POST = createStkPushHandler({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
})
```

### `app/api/mpesa/stk-query/route.ts`

```ts
import { createStkQueryHandler } from 'pesafy/adapters/nextjs'

export const POST = createStkQueryHandler({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
})
```

### `app/api/mpesa/callback/route.ts`

```ts
import { createStkCallbackHandler } from 'pesafy/adapters/nextjs'

export const POST = createStkCallbackHandler({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',

  onSuccess: async ({ receiptNumber, amount, phone }) => {
    await db.orders.markPaid({ receiptNumber, amount, phone })
  },

  onFailure: async ({ resultCode, resultDesc }) => {
    console.warn(`Payment failed [${resultCode}]: ${resultDesc}`)
  },

  skipIPCheck: process.env.NODE_ENV !== 'production',
})
```

### `app/api/mpesa/balance/route.ts`

```ts
import { createAccountBalanceHandler } from 'pesafy/adapters/nextjs'

export const POST = createAccountBalanceHandler({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  resultUrl: 'https://yourdomain.com/api/mpesa/balance/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/timeout',
})
```

### `app/api/mpesa/balance/result/route.ts`

```ts
import { createAccountBalanceResultHandler } from 'pesafy/adapters/nextjs'

export const POST = createAccountBalanceResultHandler({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',

  onResult: async (body) => {
    console.log('Balance result:', body)
  },

  skipIPCheck: process.env.NODE_ENV !== 'production',
})
```

## Catch-all Route (Single File)

Alternatively, mount all handlers with one catch-all route:

### `app/api/mpesa/[[...route]]/route.ts`

```ts
import { createMpesaNextHandlers } from 'pesafy/adapters/nextjs'

const handlers = createMpesaNextHandlers({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  resultUrl: 'https://yourdomain.com/api/mpesa/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/timeout',

  onSuccess: async ({ receiptNumber, amount, phone }) => {
    await db.orders.markPaid({ receiptNumber, amount, phone })
  },

  onFailure: async ({ resultCode, resultDesc }) => {
    console.warn(`Payment failed [${resultCode}]: ${resultDesc}`)
  },
})

export const POST = handlers.POST
```

The catch-all handler dispatches based on the request pathname:

| Pathname ending  | Handled by                     |
| ---------------- | ------------------------------ |
| `stk-push`       | STK Push handler               |
| `stk-query`      | STK Query handler              |
| `callback`       | STK Callback handler           |
| `balance`        | Account Balance query handler  |
| `balance/result` | Account Balance result handler |

## Configuration

```ts
interface MpesaNextConfig extends MpesaConfig {
  // ── STK Push ───────────────────────────────────────────────────────────────
  callbackUrl: string // STK Push callback URL (required)

  onSuccess?: (data: {
    receiptNumber: string | null
    amount: number | null
    phone: string | null
  }) => void | Promise<void>

  onFailure?: (data: {
    resultCode: number
    resultDesc: string
  }) => void | Promise<void>

  // ── Async APIs ─────────────────────────────────────────────────────────────
  resultUrl?: string
  queueTimeOutUrl?: string

  onResult?: (body: unknown) => void | Promise<void>

  // ── Dev ───────────────────────────────────────────────────────────────────
  skipIPCheck?: boolean // NEVER true in production
}
```

## Callback Handlers Reference

### `createStkPushHandler`

Accepts `amount`, `phoneNumber`, `accountReference`, and `transactionDesc` in
the request body and initiates an STK Push.

### `createStkQueryHandler`

Accepts `checkoutRequestId` in the request body and queries the status of the
STK Push.

### `createStkCallbackHandler`

Receives Safaricom's callback, runs `onSuccess` or `onFailure`, and responds
with `200`. The response to Safaricom is sent immediately; hooks run in the
background.

```ts
createStkCallbackHandler({
  // ...MpesaNextConfig

  onSuccess?: (data: {
    receiptNumber: string | null
    amount:        number | null
    phone:         string | null
  }) => void | Promise<void>

  onFailure?: (data: {
    resultCode: number
    resultDesc: string
  }) => void | Promise<void>
})
```

### `createAccountBalanceHandler`

Initiates an Account Balance query. Requires `resultUrl` and `queueTimeOutUrl`
in config.

### `createAccountBalanceResultHandler`

Receives the asynchronous Account Balance result from Safaricom and runs
`onResult`.

```ts
createAccountBalanceResultHandler({
  // ...MpesaNextConfig
  onResult?: (body: unknown) => void | Promise<void>
})
```

## Client-side Checkout

Trigger the STK Push from a Server Action:

```ts
// actions/checkout.ts
'use server'

export async function initiateCheckout(amount: number, phone: string) {
  const res = await fetch('/api/mpesa/stk-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      phoneNumber: phone,
      accountReference: 'ORDER-001',
      transactionDesc: 'Checkout',
    }),
  })
  return res.json()
}
```

## `next.config.js` — No extra config needed

pesafy does not require any Next.js config changes. All route handlers are plain
`Response`-based functions compatible with the App Router.

## IP Verification

Safaricom callback IPs are verified automatically in production. Disable only
for local development:

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
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_RESULT_URL=https://yourdomain.com/api/mpesa/result
MPESA_QUEUE_TIMEOUT_URL=https://yourdomain.com/api/mpesa/timeout
```
