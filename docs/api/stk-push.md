# STK Push (M-PESA Express)

Sends a payment prompt to a customer's phone. The customer enters their M-PESA PIN to authorise the payment.

**Daraja API:** `POST /mpesa/stkpush/v1/processrequest`

## stkPush()

```ts
const response = await mpesa.stkPush({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'INV-001', // max 12 chars
  transactionDesc: 'Payment', // max 13 chars

  // Optional
  transactionType: 'CustomerPayBillOnline', // default
  partyB: '174379', // defaults to shortCode
})
```

### Parameters

| Parameter          | Type              | Required | Description                                                                 |
| ------------------ | ----------------- | -------- | --------------------------------------------------------------------------- |
| `amount`           | `number`          | ✅       | Amount in KES (minimum 1, whole numbers only)                               |
| `phoneNumber`      | `string`          | ✅       | Customer phone — any Kenyan format accepted                                 |
| `callbackUrl`      | `string`          | ✅       | URL Safaricom POSTs the result to                                           |
| `accountReference` | `string`          | ✅       | Shown to customer in prompt (max 12 chars)                                  |
| `transactionDesc`  | `string`          | ✅       | Short description (max 13 chars)                                            |
| `transactionType`  | `TransactionType` | —        | `'CustomerPayBillOnline'` (default) or `'CustomerBuyGoodsOnline'`           |
| `partyB`           | `string`          | —        | Credit party — defaults to your shortCode; set to till number for Buy Goods |

### Response

```ts
{
  MerchantRequestID:  'string', // unique identifier
  CheckoutRequestID:  'string', // use this to query status
  ResponseCode:       '0',      // '0' = accepted
  ResponseDescription: 'string',
  CustomerMessage:    'string',
}
```

Save `CheckoutRequestID` — you'll need it to query status or match the callback.

## STK Query

Check if an STK Push was paid:

```ts
const status = await mpesa.stkQuery({
  checkoutRequestId: 'ws_CO_260520211133524545',
})

if (status.ResultCode === 0) {
  console.log('Payment confirmed!')
} else {
  console.log('Not completed:', status.ResultDesc)
}
```

### ResultCodes

| Code   | Meaning                           |
| ------ | --------------------------------- |
| `0`    | Success                           |
| `1`    | Insufficient balance              |
| `1032` | Cancelled by user                 |
| `1037` | DS timeout — customer unreachable |
| `2001` | Wrong PIN                         |

## Safe Variant

Returns `Result<T>` instead of throwing:

```ts
const result = await mpesa.stkPushSafe({
  amount: 100,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'INV-001',
  transactionDesc: 'Payment',
})

if (result.ok) {
  console.log(result.data.CheckoutRequestID)
} else {
  console.error(result.error.code, result.error.message)
}
```

## Callback Payload

Safaricom POSTs to your `callbackUrl` after the customer responds:

```ts
import {
  isStkCallbackSuccess,
  getCallbackValue,
  type StkPushCallback,
} from 'pesafy'

app.post('/api/mpesa/callback', (req, res) => {
  const body = req.body as StkPushCallback

  if (isStkCallbackSuccess(body.Body.stkCallback)) {
    const receipt = getCallbackValue(body, 'MpesaReceiptNumber') // string
    const amount = getCallbackValue(body, 'Amount') // number
    const phone = getCallbackValue(body, 'PhoneNumber') // number
    const date = getCallbackValue(body, 'TransactionDate') // number
  } else {
    const { ResultCode, ResultDesc } = body.Body.stkCallback
    // handle failure
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

## Buy Goods (Till) Example

```ts
await mpesa.stkPush({
  amount: 50,
  phoneNumber: '0712345678',
  callbackUrl: 'https://yourdomain.com/api/mpesa/callback',
  accountReference: 'ORDER-99',
  transactionDesc: 'Coffee',
  transactionType: 'CustomerBuyGoodsOnline',
  partyB: '600000', // your Till number
})
```
