# Next.js App Router

The Next.js adapter provides typed **Route Handlers** for the App Router. It does not import `next/server` at build time, so it works with any Next.js 13+ project.

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
})

export const POST = handlers.POST
```

The catch-all handler dispatches based on `pathname`:

| Pathname ending | Handled by           |
| --------------- | -------------------- |
| `stk-push`      | STK Push handler     |
| `stk-query`     | STK Query handler    |
| `callback`      | STK Callback handler |
| `balance`       | Account Balance      |

## Configuration

```ts
interface MpesaNextConfig extends MpesaConfig {
  callbackUrl: string
  resultUrl?: string
  queueTimeOutUrl?: string
  skipIPCheck?: boolean
}
```

## Callback Handlers

### `createStkCallbackHandler`

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

## Client-side Checkout

Trigger the STK Push from a form action or API call:

```ts
// actions/checkout.ts (Server Action)
'use server'

export async function initiateCheckout(amount: number, phone: string) {
  const res = await fetch('/api/mpesa/stk-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      phoneNumber: phone,
      accountReference: 'ORDER-001',
    }),
  })
  return res.json()
}
```

## `next.config.js` — No extra config needed

pesafy does not require any Next.js config changes. All route handlers are plain `Response`-based functions compatible with the App Router.

## IP Verification

Safaricom callback IPs are verified automatically in production. Disable only for local dev:

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
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_RESULT_URL=https://yourdomain.com/api/mpesa/result
MPESA_QUEUE_TIMEOUT_URL=https://yourdomain.com/api/mpesa/timeout
```
