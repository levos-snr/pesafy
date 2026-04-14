# B2B Express Checkout

Initiates a USSD Push to a merchant's till, prompting the merchant to pay from
their till to your Paybill.

**Daraja API:** `POST /v1/ussdpush/get-msisdn`

## b2bExpressCheckout()

```ts
const ack = await mpesa.b2bExpressCheckout({
  primaryShortCode: '000001', // merchant's till (debit party)
  receiverShortCode: '000002', // your Paybill (credit party)
  amount: 5000,
  paymentRef: 'INV-001',
  callbackUrl: 'https://yourdomain.com/api/mpesa/b2b/callback',
  partnerName: 'Acme Supplies',
  requestRefId: 'unique-uuid', // auto-generated (UUID v4) if omitted
})

// ack.code === '0' means USSD Push initiated
```

## Parameters

| Parameter           | Required | Description                                   |
| ------------------- | -------- | --------------------------------------------- |
| `primaryShortCode`  | ✅       | Merchant's till (debit party)                 |
| `receiverShortCode` | ✅       | Your Paybill account (credit party)           |
| `amount`            | ✅       | Whole number ≥ 1                              |
| `paymentRef`        | ✅       | Reference shown in merchant USSD prompt       |
| `callbackUrl`       | ✅       | URL for the async result                      |
| `partnerName`       | ✅       | Your name shown in merchant's USSD            |
| `requestRefId`      | —        | Unique request ID (auto-generated if omitted) |

## Callback Handler

```ts
import {
  isB2BCheckoutCallback,
  isB2BCheckoutSuccess,
  isB2BCheckoutCancelled,
  getB2BTransactionId,
  getB2BAmount,
  getB2BConversationId,
} from 'pesafy'

app.post('/api/mpesa/b2b/callback', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  if (!isB2BCheckoutCallback(req.body)) return

  if (isB2BCheckoutSuccess(req.body)) {
    const txId = getB2BTransactionId(req.body) // M-PESA receipt
    const amount = getB2BAmount(req.body) // number
    console.log('B2B paid:', { txId, amount })
  } else if (isB2BCheckoutCancelled(req.body)) {
    console.log('Merchant cancelled the payment')
  }
})
```

## Error Codes

| Code   | Meaning                                                   |
| ------ | --------------------------------------------------------- |
| `4001` | Merchant cancelled (not an error — async callback only)   |
| `4102` | Merchant KYC fail — provide valid KYC                     |
| `4104` | Missing Nominated Number — configure in M-PESA Web Portal |
| `4201` | USSD Network Error — retry                                |
| `4203` | USSD Exception Error — retry                              |

::: tip Nominated Number Error 4104 means the merchant's till doesn't have a
Nominated Number set up. They need to configure it in the M-PESA Web Portal →
Organization Details. :::
