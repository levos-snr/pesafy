# Webhooks & IP Verification

Safaricom POSTs result payloads to your server for every asynchronous Daraja API
— STK Push callbacks, C2B confirmations and validations, B2C results, account
balance results, reversal results, transaction status results, and tax
remittance results.

## The golden rule

::: danger Always respond HTTP 200 immediately Return
`{ ResultCode: 0, ResultDesc: 'Accepted' }` as soon as the request arrives —
before any database writes or downstream calls. If Safaricom receives a non-200
response, it retries the callback and may eventually blacklist your URL. :::

## IP Verification

Daraja does **not** use HMAC webhook signatures like Stripe or GitHub. Instead,
you verify that callbacks originate from Safaricom's officially documented IP
range.

```ts
import { verifyWebhookIP, SAFARICOM_IPS } from 'pesafy'

app.post('/api/mpesa/callback', (req, res) => {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.ip ??
    ''

  if (ip && !verifyWebhookIP(ip)) {
    // Log but still respond 200 — Safaricom's IPs can vary with infrastructure changes
    console.warn('[mpesa] Callback from unlisted IP:', ip)
  }

  // ... process callback
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

### Official Safaricom IP whitelist

```ts
import { SAFARICOM_IPS } from 'pesafy'
// [
//   '196.201.214.200', '196.201.214.206', '196.201.213.114',
//   '196.201.214.207', '196.201.214.208', '196.201.213.44',
//   '196.201.212.127', '196.201.212.138', '196.201.212.129',
//   '196.201.212.136', '196.201.212.74',  '196.201.212.69'
// ]
```

::: tip Local development Use `skipIPCheck: true` in your adapter config, or
simply skip the `verifyWebhookIP` call during development. Never skip IP checks
in production. :::

## STK Push callback

```ts
import {
  isSuccessfulCallback,
  isStkCallbackSuccess,
  getCallbackValue,
  extractTransactionId,
  extractAmount,
  extractPhoneNumber,
  type StkPushWebhook,
} from 'pesafy'

app.post('/api/mpesa/stk/callback', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const webhook = req.body as StkPushWebhook
  const cb = webhook?.Body?.stkCallback
  if (!cb) return

  if (isSuccessfulCallback(webhook)) {
    // These helpers null-safely extract values from CallbackMetadata.Item
    const receipt = extractTransactionId(webhook) // 'NLJ7RT61SV' | null
    const amount = extractAmount(webhook) // 100 | null
    const phone = extractPhoneNumber(webhook) // '254712345678' | null

    // Or use getCallbackValue for any metadata key:
    const date = getCallbackValue(webhook as any, 'TransactionDate')
    // → 20241219102115

    console.log('Payment received:', { receipt, amount, phone })
  } else {
    const { ResultCode, ResultDesc } = cb
    // ResultCode 1032 = user cancelled
    // ResultCode 1037 = phone unreachable / timed out
    // ResultCode 2001 = wrong PIN
    console.warn('STK failed:', ResultCode, ResultDesc)
  }
})
```

### Extracting values explicitly

Use `getCallbackValue` for any of the five documented metadata fields:

| Name                 | Type     | Description                                |
| -------------------- | -------- | ------------------------------------------ |
| `Amount`             | `number` | Transaction amount in KES                  |
| `MpesaReceiptNumber` | `string` | M-PESA receipt / transaction ID            |
| `TransactionDate`    | `number` | Timestamp `YYYYMMDDHHmmss` as a number     |
| `PhoneNumber`        | `number` | Customer MSISDN as a number                |
| `Balance`            | `string` | Account balance (present on some accounts) |

## C2B callbacks

### Validation (optional)

The validation URL is only called when you have **external validation enabled**
on your shortcode (contact apisupport@safaricom.co.ke to enable). You must
respond within ~8 seconds.

```ts
import {
  isC2BPayload,
  acceptC2BValidation,
  rejectC2BValidation,
  getC2BAmount,
  getC2BAccountRef,
  getC2BCustomerName,
  isPaybillPayment,
  isBuyGoodsPayment,
  C2B_VALIDATION_RESULT_CODES,
} from 'pesafy'

app.post('/api/mpesa/c2b/validation', async (req, res) => {
  const payload = req.body

  if (!isC2BPayload(payload)) {
    return res.json(rejectC2BValidation('C2B00016'))
  }

  const amount = getC2BAmount(payload) // number
  const ref = getC2BAccountRef(payload) // e.g. 'invoice008'
  const name = getC2BCustomerName(payload) // 'John Doe'
  const type = isPaybillPayment(payload) ? 'paybill' : 'buy-goods'

  // Validate against your business logic
  const accountExists = await db.accounts.exists(ref)

  if (!accountExists) {
    // Reject with a specific code — customer sees "Invalid account"
    return res.json(
      rejectC2BValidation(C2B_VALIDATION_RESULT_CODES.INVALID_ACCOUNT_NUMBER),
    )
  }

  // Echo ThirdPartyTransID to correlate with the confirmation callback
  return res.json(acceptC2BValidation(payload.ThirdPartyTransID))
})
```

**Validation rejection codes:**

| Code         | Meaning                           |
| ------------ | --------------------------------- |
| `'0'`        | Accept the payment                |
| `'C2B00011'` | Invalid MSISDN                    |
| `'C2B00012'` | Invalid Account Number            |
| `'C2B00013'` | Invalid Amount                    |
| `'C2B00014'` | Invalid KYC Details               |
| `'C2B00015'` | Invalid Shortcode                 |
| `'C2B00016'` | Other error (catch-all rejection) |

### Confirmation

```ts
import {
  isC2BPayload,
  acknowledgeC2BConfirmation,
  getC2BTransactionId,
  getC2BAmount,
  getC2BAccountRef,
  getC2BCustomerName,
  type C2BConfirmationPayload,
} from 'pesafy'

app.post('/api/mpesa/c2b/confirmation', (req, res) => {
  res.json(acknowledgeC2BConfirmation()) // → { ResultCode: 0, ResultDesc: 'Success' }

  const payload = req.body as C2BConfirmationPayload
  if (!isC2BPayload(payload)) return

  const txId = getC2BTransactionId(payload) // M-PESA receipt
  const amount = getC2BAmount(payload) // number
  const ref = getC2BAccountRef(payload) // account reference
  const name = getC2BCustomerName(payload) // full name

  // Fulfill the payment
  void db.payments.create({ txId, amount, ref, name })
})
```

## Async result callbacks

All initiator-based APIs (Account Balance, B2C, Reversal, Transaction Status,
Tax Remittance, B2B Buy Goods, B2B Pay Bill) are asynchronous. Daraja POSTs the
result to your `resultUrl`.

### Account Balance result

```ts
import {
  isAccountBalanceResult,
  isAccountBalanceSuccess,
  getAccountBalanceRawBalance,
  parseAccountBalance,
  getAccountBalanceTransactionId,
} from 'pesafy'

app.post('/api/mpesa/balance/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body
  if (!isAccountBalanceResult(body)) return

  if (isAccountBalanceSuccess(body)) {
    const raw = getAccountBalanceRawBalance(body)
    const accounts = raw ? parseAccountBalance(raw) : []
    // accounts: [{ name: 'Utility Account', currency: 'KES', amount: '228037.00' }, ...]
  } else {
    console.warn('Balance query failed:', body.Result.ResultDesc)
  }
})
```

### Reversal result

```ts
import {
  isReversalResult,
  isReversalSuccess,
  getReversalTransactionId,
  getReversalAmount,
  getReversalOriginalTransactionId,
} from 'pesafy'

app.post('/api/mpesa/reversal/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body
  if (!isReversalResult(body)) return

  if (isReversalSuccess(body)) {
    console.log('Reversed:', {
      receipt: getReversalTransactionId(body),
      amount: getReversalAmount(body),
      origTx: getReversalOriginalTransactionId(body),
    })
  } else {
    console.warn(
      'Reversal failed:',
      body.Result.ResultCode,
      body.Result.ResultDesc,
    )
  }
})
```

## Generic webhook handler

If you want a single catch-all with built-in IP checking:

```ts
import {
  handleWebhook,
  isSuccessfulCallback,
  extractTransactionId,
  extractAmount,
} from 'pesafy'

app.post('/api/mpesa/callback', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const result = handleWebhook(req.body, {
    requestIP: req.ip,
    skipIPCheck: false, // set true in development
  })

  if (result.success && result.eventType === 'stk_push') {
    const webhook = result.data
    if (isSuccessfulCallback(webhook)) {
      const receipt = extractTransactionId(webhook)
      const amount = extractAmount(webhook)
      console.log('Paid:', receipt, amount)
    }
  } else if (!result.success) {
    console.warn('Webhook error:', result.error)
  }
})
```

## Retrying your own processing

Safaricom delivers webhooks once (with limited retries on non-200). Use
`retryWithBackoff` to protect your downstream processing independently:

```ts
import { retryWithBackoff } from 'pesafy'

app.post('/api/mpesa/stk/callback', async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' }) // respond first

  await retryWithBackoff(() => db.payments.upsert({ receipt, amount, phone }), {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 30_000,
  })
})
```

## Using adapters

When you use a framework adapter (`createMpesaRouter`, `createMpesaHono`,
`registerMpesaPlugin`, `createMpesaHandlers`), all callback routes are wired
automatically. You provide lifecycle hooks:

```ts
createMpesaRouter({
  // ...config...
  skipIPCheck: false,

  onStkSuccess: async ({ receiptNumber, amount, phone, checkoutRequestId }) => {
    await db.payments.create({ receiptNumber, amount, phone })
  },
  onStkFailure: async ({ resultCode, resultDesc, checkoutRequestId }) => {
    await db.paymentAttempts.update(checkoutRequestId, {
      failed: true,
      reason: resultDesc,
    })
  },
  onC2BValidation: async (payload) => {
    const ok = await db.accounts.exists(payload.BillRefNumber)
    return ok ? acceptC2BValidation() : rejectC2BValidation('C2B00012')
  },
  onC2BConfirmation: async (payload) => {
    await db.payments.create({
      txId: payload.TransID,
      amount: payload.TransAmount,
    })
  },
  onAccountBalanceResult: async (result) => {
    const raw = getAccountBalanceRawBalance(result)
    if (raw) await db.balances.upsert(parseAccountBalance(raw))
  },
  onReversalResult: async (result) => {
    if (isReversalSuccess(result)) {
      await db.reversals.markComplete(getReversalTransactionId(result))
    }
  },
})
```
