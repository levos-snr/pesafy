# Quick Start

Get an STK Push running in under 5 minutes.

## 1. Install & Configure

```sh
pnpm add pesafy
npx pesafy init     # scaffold .env interactively
npx pesafy doctor   # validate your config
```

## 2. Create the Client

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
  amount: 1, // KES, minimum 1
  phoneNumber: '0712345678', // any Kenyan format
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'INV-001', // max 12 chars
  transactionDesc: 'Payment', // max 13 chars
})

console.log(response.CheckoutRequestID)
// → ws_CO_260520211133524545
```

The customer receives a PIN prompt on their phone. Save `CheckoutRequestID` to query later.

## 4. Handle the Callback

Safaricom POSTs the result to your `callbackUrl`:

```ts
import {
  isStkCallbackSuccess,
  getCallbackValue,
  type StkPushCallback,
} from 'pesafy'

// Express / Hono / Fastify / Next.js — same logic
app.post('/api/mpesa/callback', (req, res) => {
  const body = req.body as StkPushCallback

  if (isStkCallbackSuccess(body.Body.stkCallback)) {
    const receipt = getCallbackValue(body, 'MpesaReceiptNumber') // string
    const amount = getCallbackValue(body, 'Amount') // number
    const phone = getCallbackValue(body, 'PhoneNumber') // number

    console.log('Payment received:', { receipt, amount, phone })
    // → save to your database here
  } else {
    const { ResultCode, ResultDesc } = body.Body.stkCallback
    console.warn('Payment failed:', ResultCode, ResultDesc)
    // 1032 = cancelled, 1037 = timeout, 2001 = wrong PIN
  }

  // Always respond 200 to Safaricom
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

## 5. Query Status (Optional)

Poll the status if you need confirmation before the callback arrives:

```ts
const status = await mpesa.stkQuery({
  checkoutRequestId: response.CheckoutRequestID,
})

if (status.ResultCode === 0) {
  console.log('Confirmed!')
} else {
  console.log('Pending or failed:', status.ResultDesc)
}
```

## Using the Safe Variant

Prefer `Result<T>` over try/catch:

```ts
const result = await mpesa.stkPushSafe({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'ORDER-42',
  transactionDesc: 'Checkout',
})

if (result.ok) {
  console.log(result.data.CheckoutRequestID)
} else {
  // result.error is PesafyError
  if (result.error.retryable) {
    // schedule retry
  }
}
```

## Next Steps

- [Configuration Reference](/guide/configuration) — all `MpesaConfig` options
- [Error Handling](/guide/error-handling) — `PesafyError` and `Result<T>`
- [Adapters](/adapters/) — drop-in routers for Express, Hono, Next.js, Fastify
- [API Reference](/api/) — every Daraja API documented
