# C2B — Customer to Business

Receive M-PESA payments to your Paybill or Till number. C2B requires registering webhook URLs with Safaricom once per shortcode.

## Register URLs

```ts
await mpesa.registerC2BUrls({
  shortCode: '600984',
  responseType: 'Completed', // 'Completed' | 'Cancelled'
  confirmationUrl: 'https://yourdomain.com/api/mpesa/c2b/confirmation',
  validationUrl: 'https://yourdomain.com/api/mpesa/c2b/validation',
  apiVersion: 'v2', // default — masks MSISDN in callbacks
})
```

::: warning Production URLs are permanent
In production, URLs can only be registered once. To change them, delete via the Daraja portal → Self Services → URL Management.
:::

### `responseType`

| Value         | Behaviour when Validation URL is unreachable   |
| ------------- | ---------------------------------------------- |
| `'Completed'` | M-PESA automatically completes the transaction |
| `'Cancelled'` | M-PESA automatically cancels the transaction   |

## Simulate

Trigger a test payment in the **sandbox only**:

```ts
// Paybill payment
await mpesa.simulateC2B({
  shortCode: '600984',
  commandId: 'CustomerPayBillOnline',
  amount: 10,
  msisdn: 254708374149, // test MSISDN from Daraja simulator
  billRefNumber: 'ACC-001', // account reference
  apiVersion: 'v2',
})

// Till / Buy Goods — DO NOT pass billRefNumber
await mpesa.simulateC2B({
  shortCode: '600000',
  commandId: 'CustomerBuyGoodsOnline',
  amount: 10,
  msisdn: 254708374149,
})
```

::: danger BillRefNumber for Buy Goods
Never pass `billRefNumber` (even as `null` or `""`) for `CustomerBuyGoodsOnline`. Daraja rejects the request with "The element AccountReference is invalid."
:::

## Validation Callback

Safaricom POSTs to your `validationUrl` **before** processing the payment (only if External Validation is enabled on your shortcode). You must respond within ~8 seconds.

```ts
import {
  acceptC2BValidation,
  rejectC2BValidation,
  getC2BAmount,
  type C2BValidationPayload,
} from 'pesafy'

app.post('/api/mpesa/c2b/validation', async (req, res) => {
  const payload = req.body as C2BValidationPayload
  const amount = getC2BAmount(payload)

  if (amount > 100_000) {
    return res.json(rejectC2BValidation('C2B00013')) // Invalid Amount
  }

  res.json(acceptC2BValidation())
  // optionally pass a correlation ID:
  // res.json(acceptC2BValidation('MY-TX-ID'))
})
```

### Validation Result Codes

| Code         | Meaning                |
| ------------ | ---------------------- |
| `'0'`        | Accept the transaction |
| `'C2B00011'` | Invalid MSISDN         |
| `'C2B00012'` | Invalid Account Number |
| `'C2B00013'` | Invalid Amount         |
| `'C2B00014'` | Invalid KYC Details    |
| `'C2B00015'` | Invalid ShortCode      |
| `'C2B00016'` | Other Error            |

## Confirmation Callback

Safaricom POSTs to your `confirmationUrl` after every successful payment. Always respond 200 immediately.

```ts
import {
  getC2BTransactionId,
  getC2BAmount,
  getC2BAccountRef,
  getC2BCustomerName,
  isPaybillPayment,
  isBuyGoodsPayment,
  type C2BConfirmationPayload,
} from 'pesafy'

app.post('/api/mpesa/c2b/confirmation', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Success' })

  const payload = req.body as C2BConfirmationPayload

  const txId = getC2BTransactionId(payload) // e.g. 'OEI2AK4XXXX'
  const amount = getC2BAmount(payload) // number
  const ref = getC2BAccountRef(payload) // BillRefNumber
  const name = getC2BCustomerName(payload) // 'Jane Doe'

  if (isPaybillPayment(payload)) {
    /* ... */
  }
  if (isBuyGoodsPayment(payload)) {
    /* ... */
  }

  // save to database
  db.payments.create({ txId, amount, ref, name }).catch(console.error)
})
```

## v1 vs v2 API

| Version | MSISDN in callback                      |
| ------- | --------------------------------------- |
| `v1`    | SHA256-hashed                           |
| `v2`    | Masked — `2547 ***** 126` (recommended) |

Use `v2` for new integrations.
