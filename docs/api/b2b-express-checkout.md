# B2B Express Checkout

Initiates a USSD Push to a merchant's till, prompting the merchant to approve a
payment from their till to your Paybill. The merchant sees a USSD screen, enters
their operator ID and M-PESA PIN, and funds are transferred automatically.

**Daraja endpoint:** `POST /v1/ussdpush/get-msisdn`

## Prerequisites

```ts
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
})
```

No initiator credentials required. Authentication is OAuth only.

## `b2bExpressCheckout()`

```ts
const response = await mpesa.b2bExpressCheckout({
  primaryShortCode: '000001', // merchant's till (debit party)
  receiverShortCode: '000002', // your Paybill (credit party)
  amount: 5_000,
  paymentRef: 'INV-2024-042', // shown in merchant's USSD prompt
  callbackUrl: 'https://yourdomain.com/api/mpesa/b2b/callback',
  partnerName: 'Acme Supplies', // your name shown in USSD
  requestRefId: 'uuid-v4', // auto-generated if omitted
})

// response.code === '0' means the USSD push was initiated
console.log(response.status) // 'USSD Initiated Successfully'
```

### Parameters

| Parameter           | Type     | Required | Description                                                                                                        |
| ------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `primaryShortCode`  | `string` | ✅       | Merchant's till number that will be charged (debit party).                                                         |
| `receiverShortCode` | `string` | ✅       | Your Paybill shortcode that receives the funds (credit party).                                                     |
| `amount`            | `number` | ✅       | Amount in KES. Minimum 1. Fractional values are rounded.                                                           |
| `paymentRef`        | `string` | ✅       | Reference shown in the merchant's USSD payment prompt.                                                             |
| `callbackUrl`       | `string` | ✅       | Public URL Safaricom POSTs the transaction result to.                                                              |
| `partnerName`       | `string` | ✅       | Your vendor name shown in the merchant's USSD screen: "You are about to send Ksh {{amount}} to {{partnerName}}..." |
| `requestRefId`      | `string` | —        | Unique request ID for idempotency. Defaults to a UUID v4.                                                          |

### Sync response

```ts
interface B2BExpressCheckoutResponse {
  code: string // '0' = USSD push initiated
  status: string // 'USSD Initiated Successfully'
}
```

`code: '0'` only means the USSD was pushed to the merchant's device. **The
transaction result comes later** via `callbackUrl`.

## Callback payloads

### Success

```json
{
  "resultCode": "0",
  "resultDesc": "The service request is processed successfully.",
  "amount": "5000.0",
  "requestId": "404e1aec-19e0-4ce3-973d-bd92e94c8021",
  "resultType": "0",
  "conversationID": "AG_20230426_...",
  "transactionId": "RDQ01NFT1Q",
  "status": "SUCCESS"
}
```

### Cancelled

```json
{
  "resultCode": "4001",
  "resultDesc": "User cancelled transaction",
  "requestId": "c2a9ba32-9e11-4b90-892c-7bc54944609a",
  "amount": "5000.0",
  "paymentReference": "INV-2024-042"
}
```

### Failed

```json
{
  "resultCode": "4102",
  "resultDesc": "Merchant KYC failure",
  "requestId": "...",
  "amount": "5000.0"
}
```

## Handling the callback

```ts
import {
  isB2BCheckoutCallback,
  isB2BCheckoutSuccess,
  isB2BCheckoutCancelled,
  isB2BCheckoutFailed,
  isKnownB2BResultCode,
  getB2BTransactionId,
  getB2BConversationId,
  getB2BAmount,
  getB2BRequestId,
  getB2BResultCode,
  getB2BResultDesc,
  getB2BPaymentReference,
  isB2BStatusSuccess,
} from 'pesafy'

app.post('/api/mpesa/b2b/callback', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body

  if (!isB2BCheckoutCallback(body)) {
    console.warn('Unknown B2B callback payload')
    return
  }

  const requestId = getB2BRequestId(body) // correlate with your request
  const amount = getB2BAmount(body) // number

  if (isB2BCheckoutSuccess(body)) {
    const txId = getB2BTransactionId(body) // 'RDQ01NFT1Q' | null
    const convId = getB2BConversationId(body) // 'AG_...' | null
    const status = isB2BStatusSuccess(body) // true

    db.orders.markPaid({ requestId, txId, amount }).catch(console.error)
  } else if (isB2BCheckoutCancelled(body)) {
    const paymentRef = getB2BPaymentReference(body) // your original paymentRef | null
    console.warn(`Merchant cancelled payment for ref: ${paymentRef}`)
  } else {
    // Any other non-zero code
    const code = getB2BResultCode(body)
    const desc = getB2BResultDesc(body)
    console.error(`B2B failed [${code}]: ${desc}`)
  }
})
```

## Helper functions

| Function                           | Returns                                           | Description                                                            |
| ---------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| `isB2BCheckoutCallback(body)`      | `body is B2BExpressCheckoutCallback`              | Runtime type guard — checks for `resultCode`, `requestId`, `amount`    |
| `isB2BCheckoutSuccess(callback)`   | `callback is B2BExpressCheckoutCallbackSuccess`   | `resultCode === '0'`                                                   |
| `isB2BCheckoutCancelled(callback)` | `callback is B2BExpressCheckoutCallbackCancelled` | `resultCode === '4001'`                                                |
| `isB2BCheckoutFailed(callback)`    | `boolean`                                         | Any non-success result (includes cancellation)                         |
| `isKnownB2BResultCode(code)`       | `boolean`                                         | `true` for any documented result code                                  |
| `isB2BStatusSuccess(callback)`     | `boolean`                                         | `true` when `status === 'SUCCESS'` on a success callback               |
| `getB2BResultCode(callback)`       | `string`                                          | `resultCode` field                                                     |
| `getB2BResultDesc(callback)`       | `string`                                          | `resultDesc` field                                                     |
| `getB2BRequestId(callback)`        | `string`                                          | `requestId` — correlate with your original request                     |
| `getB2BAmount(callback)`           | `number`                                          | `amount` parsed to number                                              |
| `getB2BTransactionId(callback)`    | `string \| null`                                  | M-PESA receipt (`transactionId`). `null` on non-success callbacks.     |
| `getB2BConversationId(callback)`   | `string \| null`                                  | M-PESA `conversationID`. `null` on non-success callbacks.              |
| `getB2BPaymentReference(callback)` | `string \| null`                                  | `paymentReference` echoed on cancellation callbacks. `null` otherwise. |

## Result codes

| Code     | Meaning                            | Action                                                              |
| -------- | ---------------------------------- | ------------------------------------------------------------------- |
| `'0'`    | Transaction completed successfully | —                                                                   |
| `'4001'` | Merchant cancelled the USSD prompt | Re-prompt or notify                                                 |
| `'4102'` | Merchant KYC failure               | Advise merchant to provide valid KYC                                |
| `'4104'` | Missing nominated number           | Merchant must configure in M-PESA Web Portal → Organisation Details |
| `'4201'` | USSD network error                 | Retry on stable network                                             |
| `'4203'` | USSD exception error               | Retry on stable network                                             |

## Types

```ts
interface B2BExpressCheckoutRequest {
  primaryShortCode: string
  receiverShortCode: string
  amount: number
  paymentRef: string
  callbackUrl: string
  partnerName: string
  requestRefId?: string // UUID v4, auto-generated if omitted
}

interface B2BExpressCheckoutResponse {
  code: string
  status: string
}

// Discriminated union of all callback shapes
type B2BExpressCheckoutCallback =
  | B2BExpressCheckoutCallbackSuccess
  | B2BExpressCheckoutCallbackCancelled
  | B2BExpressCheckoutCallbackFailed

const B2B_RESULT_CODES = {
  SUCCESS: '0',
  CANCELLED: '4001',
  KYC_FAIL: '4102',
  NO_NOMINATED_NUMBER: '4104',
  USSD_NETWORK_ERROR: '4201',
  USSD_EXCEPTION_ERROR: '4203',
} as const
```
