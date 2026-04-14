# STK Push (M-PESA Express)

Sends a USSD payment prompt to a customer's phone. The customer sees a PIN
dialog and approves the charge from their M-PESA balance.

**Daraja endpoint:** `POST /mpesa/stkpush/v1/processrequest`

## Prerequisites

```ts
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  lipaNaMpesaShortCode: process.env.MPESA_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
})
```

## `stkPush()`

```ts
const response = await mpesa.stkPush({
  amount: 100,
  phoneNumber: '0712345678', // any Kenyan format accepted
  callbackUrl: 'https://yourdomain.com/api/mpesa/stk/callback',
  accountReference: 'INV-001', // max 12 chars, shown in USSD prompt
  transactionDesc: 'Checkout', // max 13 chars
})

// response.CheckoutRequestID — save this to query status or match the callback
console.log(response.CheckoutRequestID) // 'ws_CO_260520211133524545'
```

### Parameters

| Parameter          | Type                                                  | Required | Description                                                                                |
| ------------------ | ----------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `amount`           | `number`                                              | ✅       | Amount in KES. Minimum 1, maximum 250 000. Fractional values are rounded.                  |
| `phoneNumber`      | `string`                                              | ✅       | Customer's M-PESA number. Accepts `07XXXXXXXX`, `2547XXXXXXXX`, `+2547XXXXXXXX`.           |
| `callbackUrl`      | `string`                                              | ✅       | Public URL Safaricom POSTs the payment result to.                                          |
| `accountReference` | `string`                                              | ✅       | Reference shown in the USSD PIN prompt and SMS. Truncated to 12 chars.                     |
| `transactionDesc`  | `string`                                              | ✅       | Short description. Truncated to 13 chars.                                                  |
| `transactionType`  | `'CustomerPayBillOnline' \| 'CustomerBuyGoodsOnline'` | —        | Defaults to `'CustomerPayBillOnline'`. Use `'CustomerBuyGoodsOnline'` for till numbers.    |
| `partyB`           | `string`                                              | —        | Credit party. Defaults to your `lipaNaMpesaShortCode`. Set to a till number for Buy Goods. |

### Transaction limits

| Limit          | Value       |
| -------------- | ----------- |
| Minimum amount | KES 1       |
| Maximum amount | KES 250 000 |

### Response

```ts
interface StkPushResponse {
  MerchantRequestID: string // pesafy internal request ID
  CheckoutRequestID: string // use this to match callbacks and run queries
  ResponseCode: string // '0' = accepted
  ResponseDescription: string
  CustomerMessage: string
}
```

`ResponseCode: '0'` means the prompt was sent to the customer's phone. **The
payment has not yet been made** — the result arrives in your `callbackUrl`.

## `stkQuery()`

Check whether a pending STK Push was paid:

```ts
const status = await mpesa.stkQuery({
  checkoutRequestId: 'ws_CO_260520211133524545',
})

if (status.ResultCode === 0) {
  console.log('Confirmed — payment received!')
} else {
  console.log('Not paid yet:', status.ResultDesc)
}
```

### Parameters

| Parameter           | Type     | Required | Description                                        |
| ------------------- | -------- | -------- | -------------------------------------------------- |
| `checkoutRequestId` | `string` | ✅       | `CheckoutRequestID` from the `stkPush()` response. |

### Response

```ts
interface StkQueryResponse {
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: number // 0 = confirmed, non-zero = not yet complete
  ResultDesc: string
}
```

### Result codes

| Code   | Meaning                                   |
| ------ | ----------------------------------------- |
| `0`    | Payment confirmed successfully            |
| `1`    | Insufficient balance                      |
| `1032` | Customer cancelled the prompt             |
| `1037` | Customer's phone unreachable / DS timeout |
| `2001` | Wrong PIN entered                         |

## Safe variant

`stkPushSafe()` returns a `Result<T>` instead of throwing — useful when you
prefer the discriminated union pattern over `try/catch`:

```ts
const result = await mpesa.stkPushSafe({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/stk/callback',
  accountReference: 'ORDER-42',
  transactionDesc: 'Checkout',
})

if (result.ok) {
  console.log(result.data.CheckoutRequestID)
} else {
  // result.error is a PesafyError
  if (result.error.retryable) {
    // safe to retry — 503, network error, etc.
  } else if (result.error.isValidation) {
    // code bug — fix the request
  }
}
```

## Callback payload

Safaricom POSTs to your `callbackUrl` once the customer responds (success or
failure):

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1.0 },
          { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
          { "Name": "TransactionDate", "Value": 20191219102115 },
          { "Name": "PhoneNumber", "Value": 254708374149 }
        ]
      }
    }
  }
}
```

On failure, `CallbackMetadata` is absent and `ResultCode` is non-zero.

### Handling the callback

```ts
import {
  isStkCallbackSuccess,
  getCallbackValue,
  type StkPushCallback,
} from 'pesafy'

app.post('/api/mpesa/stk/callback', (req, res) => {
  // Always respond 200 to Safaricom first
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body as StkPushCallback
  const cb = body.Body.stkCallback

  if (isStkCallbackSuccess(cb)) {
    const receipt = getCallbackValue(body, 'MpesaReceiptNumber') // string
    const amount = getCallbackValue(body, 'Amount') // number
    const phone = getCallbackValue(body, 'PhoneNumber') // number
    const date = getCallbackValue(body, 'TransactionDate') // number (YYYYMMDDHHmmss)

    // save to your database
    db.orders.markPaid({ receipt, amount, phone }).catch(console.error)
  } else {
    const { ResultCode, ResultDesc } = cb
    // 1032 = user cancelled | 1037 = timeout | 2001 = wrong PIN
    console.warn(`STK failed [${ResultCode}]: ${ResultDesc}`)
  }
})
```

### Helper functions

| Function                       | Signature                                                                | Description                         |
| ------------------------------ | ------------------------------------------------------------------------ | ----------------------------------- |
| `isStkCallbackSuccess(cb)`     | `(cb: StkCallbackInner) => cb is StkCallbackSuccess`                     | `true` when `ResultCode === 0`      |
| `getCallbackValue(body, name)` | `(body: StkPushCallback, name: string) => string \| number \| undefined` | Extract a metadata item by name     |
| `isKnownStkResultCode(code)`   | `(code: number) => code is StkResultCode`                                | `true` for a documented result code |

### Metadata item names

| Name                   | Type                      | Present                     |
| ---------------------- | ------------------------- | --------------------------- |
| `'Amount'`             | `number`                  | Success only                |
| `'MpesaReceiptNumber'` | `string`                  | Success only                |
| `'TransactionDate'`    | `number` (YYYYMMDDHHmmss) | Success only                |
| `'PhoneNumber'`        | `number`                  | Success only                |
| `'Balance'`            | `string`                  | Success only, some accounts |

## Buy Goods (Till) example

```ts
await mpesa.stkPush({
  amount: 50,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/stk/callback',
  accountReference: 'TABLE-9',
  transactionDesc: 'Coffee',
  transactionType: 'CustomerBuyGoodsOnline',
  partyB: '600000', // your till number
})
```

## Types

```ts
type TransactionType = 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'

interface StkPushRequest {
  amount: number
  phoneNumber: string
  callbackUrl: string
  accountReference: string
  transactionDesc: string
  transactionType?: TransactionType
  partyB?: string
}

interface StkPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

interface StkQueryResponse {
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: number
  ResultDesc: string
}

type StkResultCode = 0 | 1 | 1032 | 1037 | 2001

const STK_RESULT_CODES = {
  SUCCESS: 0,
  INSUFFICIENT_BALANCE: 1,
  CANCELLED_BY_USER: 1032,
  PHONE_UNREACHABLE: 1037,
  INVALID_PIN: 2001,
} as const

const STK_PUSH_LIMITS = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 250_000,
} as const
```
