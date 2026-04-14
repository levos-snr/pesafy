# Quick Start

Get an STK Push running end-to-end in under 5 minutes.

## 1. Install and scaffold

```sh
pnpm add pesafy
npx pesafy init    # creates .env interactively
npx pesafy doctor  # validates config
```

## 2. Create the client

All configuration is passed once to the `Mpesa` constructor. The client handles
OAuth token caching and renewal automatically.

```ts
import { Mpesa } from 'pesafy'

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox', // 'sandbox' | 'production'
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
})
```

## 3. Send an STK Push

```ts
const response = await mpesa.stkPush({
  amount: 100, // KES — minimum 1, maximum 250,000
  phoneNumber: '0712345678', // any Kenyan format: 07xx, 2547xx, +2547xx
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'INV-001', // max 12 characters
  transactionDesc: 'Payment', // max 13 characters
})

console.log(response.CheckoutRequestID)
// → ws_CO_260520241133524545

console.log(response.ResponseCode)
// → '0' means the prompt was sent successfully
```

The customer immediately receives a PIN prompt on their phone. **Save
`CheckoutRequestID`** — you need it to query status and to match against the
callback.

::: info What `shortCode` and `passKey` are not in the request
`lipaNaMpesaShortCode` and `lipaNaMpesaPassKey` are set once in the `Mpesa`
constructor config, not per-request. The SDK computes the Daraja password
(`Base64(shortCode + passKey + timestamp)`) automatically on every call. :::

## 4. Handle the callback

Safaricom POSTs the payment result to your `callbackUrl` asynchronously. Always
respond HTTP 200 immediately:

```ts
import {
  isStkCallbackSuccess,
  getCallbackValue,
  type StkPushCallback,
} from 'pesafy'

// Works identically in Express, Hono, Fastify, and Next.js
app.post('/api/mpesa/callback', (req, res) => {
  // Respond 200 first — Safaricom expects an immediate acknowledgement
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body as StkPushCallback
  const cb = body.Body.stkCallback

  if (isStkCallbackSuccess(cb)) {
    // Payment succeeded
    const receipt = getCallbackValue(body, 'MpesaReceiptNumber') // e.g. 'NLJ7RT61SV'
    const amount = getCallbackValue(body, 'Amount') // e.g. 100
    const phone = getCallbackValue(body, 'PhoneNumber') // e.g. 254712345678
    const date = getCallbackValue(body, 'TransactionDate') // e.g. 20241219102115

    console.log('Payment received:', { receipt, amount, phone })
    // → save to database, fulfill order, etc.
  } else {
    // Payment failed or was cancelled
    const { ResultCode, ResultDesc } = cb
    console.warn('Payment failed:', ResultCode, ResultDesc)
    // ResultCode 1032 = cancelled by user
    // ResultCode 1037 = phone unreachable / timed out
    // ResultCode 2001 = wrong PIN
  }
})
```

::: danger Always respond 200 If your endpoint returns a non-200, Safaricom
retries the callback and may eventually blacklist your URL. Always return
`{ ResultCode: 0, ResultDesc: 'Accepted' }` immediately, then process
asynchronously. :::

## 5. Query status

Poll the payment status if you need to confirm before the callback arrives, or
if the callback is delayed:

```ts
const status = await mpesa.stkQuery({
  checkoutRequestId: response.CheckoutRequestID,
})

if (status.ResultCode === 0) {
  console.log('Payment confirmed!')
} else {
  console.log('Status:', status.ResultDesc)
  // ResultCode 1032 = cancelled, 1037 = timeout, 2001 = wrong PIN
}
```

## Using the safe variant (no exceptions)

`stkPushSafe()` returns a `Result<T, PesafyError>` discriminated union instead
of throwing:

```ts
import { type Result } from 'pesafy'

const result = await mpesa.stkPushSafe({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'ORDER-42',
  transactionDesc: 'Checkout',
})

if (result.ok) {
  // result.data: StkPushResponse
  console.log(result.data.CheckoutRequestID)
} else {
  // result.error: PesafyError
  const { code, message, retryable } = result.error
  if (retryable) {
    // schedule a retry — 503/429/network errors are retryable
  } else if (result.error.isValidation) {
    // fix the request — validation errors are never retryable
  }
}
```

## Framework adapters

If you want all M-PESA routes (STK push, all callbacks, B2C, balance, etc.)
mounted automatically, use a framework adapter instead of wiring routes
manually:

::: code-group

```ts [Express]
import express from 'express'
import { createMpesaRouter } from 'pesafy/adapters/express'

const app = express()
app.use(express.json())
app.use(
  '/api',
  createMpesaRouter({
    consumerKey: process.env.MPESA_CONSUMER_KEY!,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
    environment: 'sandbox',
    callbackUrl: 'https://yourdomain.com/api/mpesa/stk/callback',
    lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
    lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
    onStkSuccess: (data) => console.log('Paid:', data.receiptNumber),
  }),
)
```

```ts [Next.js App Router]
// app/api/mpesa/[[...route]]/route.ts
import { createMpesaHandlers } from 'pesafy/adapters/nextjs'

export const { POST, GET } = createMpesaHandlers({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  callbackUrl: 'https://yourdomain.com/api/mpesa/stk/callback',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
})
```

```ts [Hono]
import { Hono } from 'hono'
import { createMpesaHono } from 'pesafy/adapters/hono'

const app = new Hono()
app.route(
  '/api',
  createMpesaHono({
    consumerKey: process.env.MPESA_CONSUMER_KEY!,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
    environment: 'sandbox',
    callbackUrl: 'https://yourdomain.com/api/mpesa/stk/callback',
    lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
    lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
  }),
)
```

:::

See [Adapters](/adapters/) for the full route listing and lifecycle hooks.

## Next steps

- [Configuration Reference](./configuration) — every `MpesaConfig` option
- [Error Handling](./error-handling) — `PesafyError`, `Result<T>`, and retry
  behaviour
- [Webhooks & IP Verification](./webhooks) — safely handling Safaricom callbacks
- [Adapters](/adapters/) — drop-in routers for Express, Hono, Next.js, Fastify
- [API Reference](/api/) — every Daraja API
