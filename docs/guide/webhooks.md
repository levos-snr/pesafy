# Webhooks & IP Verification

Safaricom POSTs callback payloads to your server for all asynchronous APIs. pesafy provides helpers to verify, parse, and extract data from every callback type.

## IP Verification

Daraja does **not** use HMAC signatures like Stripe. Instead, verify that callbacks originate from Safaricom's IP whitelist:

```ts
import { verifyWebhookIP, SAFARICOM_IPS } from 'pesafy'

app.post('/api/mpesa/callback', (req, res) => {
  const ip = req.ip ?? (req.headers['x-forwarded-for'] as string)

  if (!verifyWebhookIP(ip)) {
    console.warn('[pesafy] Callback from unknown IP:', ip)
    // Still respond 200 — Safaricom may retry
  }

  // ... process callback
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

::: tip Local Development
Set `skipIPCheck: true` in your adapter config or skip the check manually during development. Never skip it in production.
:::

### Official Safaricom IP Whitelist

```ts
import { SAFARICOM_IPS } from 'pesafy'

console.log(SAFARICOM_IPS)
// [
//   '196.201.214.200', '196.201.214.206', '196.201.213.114',
//   '196.201.214.207', '196.201.214.208', '196.201.213.44',
//   '196.201.212.127', '196.201.212.138', '196.201.212.129',
//   '196.201.212.136', '196.201.212.74',  '196.201.212.69'
// ]
```

## Generic Webhook Handler

```ts
import {
  handleWebhook,
  isSuccessfulCallback,
  extractTransactionId,
  extractAmount,
} from 'pesafy'

app.post('/api/mpesa/callback', (req, res) => {
  const result = handleWebhook(req.body, {
    requestIP: req.ip,
    skipIPCheck: false,
  })

  if (result.success) {
    const webhook = result.data // StkPushWebhook

    if (isSuccessfulCallback(webhook)) {
      const receipt = extractTransactionId(webhook) // string | null
      const amount = extractAmount(webhook) // number | null
      const phone = extractPhoneNumber(webhook) // string | null
    }
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

## STK Push Callback

```ts
import {
  isStkCallbackSuccess,
  getCallbackValue,
  type StkPushCallback,
} from 'pesafy'

app.post('/api/mpesa/callback', (req, res) => {
  const body = req.body as StkPushCallback
  const cb = body.Body.stkCallback

  if (isStkCallbackSuccess(cb)) {
    const receipt = getCallbackValue(body, 'MpesaReceiptNumber')
    const amount = getCallbackValue(body, 'Amount')
    const phone = getCallbackValue(body, 'PhoneNumber')
    const date = getCallbackValue(body, 'TransactionDate')
  } else {
    console.warn('STK failed:', cb.ResultCode, cb.ResultDesc)
    // 1032 = user cancelled | 1037 = timeout | 2001 = wrong PIN
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

## Always Respond 200

::: danger Critical
Always respond HTTP 200 to Safaricom — even if you reject the payload internally. If your server returns a non-200, Safaricom will retry the callback and may blacklist your URL.
:::

```ts
// ✅ Correct
res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })

// ❌ Never do this for callbacks
res.status(400).json({ error: 'Invalid payload' })
```

## Retry Your Own Processing

Safaricom delivers webhooks **once** (with limited retries on non-200). Use `retryWithBackoff` to make your processing resilient independently:

```ts
import { retryWithBackoff } from 'pesafy'

app.post('/api/mpesa/callback', async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' }) // respond first!

  await retryWithBackoff(() => db.payments.upsert({ receipt, amount }), {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 30_000,
  })
})
```
