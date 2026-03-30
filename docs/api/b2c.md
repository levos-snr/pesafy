# B2C — Business to Customer

Send money from your business to customers or load funds to a B2C shortcode for bulk disbursement.

**Daraja API:** `POST /mpesa/b2b/v1/paymentrequest`  
**Type:** Asynchronous — final result POSTed to `resultUrl` <Badge type="warning" text="Async" />

## b2cPayment()

### BusinessPayToBulk — Load a B2C Shortcode

Move funds from your MMF/Working account to a B2C shortcode for bulk disbursement (salaries, commissions, winnings):

```ts
await mpesa.b2cPayment({
  commandId: 'BusinessPayToBulk',
  amount: 50_000,
  partyA: '600979', // your MMF shortcode
  partyB: '600000', // target B2C shortcode
  accountReference: 'BATCH-JAN',
  resultUrl: 'https://yourdomain.com/api/mpesa/b2c/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/timeout',
})
```

### BusinessPayment / SalaryPayment / PromotionPayment — Direct to Customer

```ts
await mpesa.b2cPayment({
  commandId: 'SalaryPayment',
  amount: 5_000,
  partyA: '600979',
  partyB: '254712345678', // customer MSISDN
  accountReference: 'SALARY-JAN',
  remarks: 'January salary',
  resultUrl: 'https://yourdomain.com/api/mpesa/b2c/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/timeout',
  requester: '254712345678', // optional — consumer MSISDN
})
```

## Parameters

| Parameter          | Type           | Required | Description                     |
| ------------------ | -------------- | -------- | ------------------------------- |
| `commandId`        | `B2CCommandID` | ✅       | Transaction type (see below)    |
| `amount`           | `number`       | ✅       | Amount in KES (minimum 1)       |
| `partyA`           | `string`       | ✅       | Your business shortcode         |
| `partyB`           | `string`       | ✅       | Recipient shortcode or MSISDN   |
| `accountReference` | `string`       | ✅       | Batch or invoice reference      |
| `resultUrl`        | `string`       | ✅       | URL for the async result        |
| `queueTimeOutUrl`  | `string`       | ✅       | URL for queue timeout           |
| `remarks`          | `string`       | —        | Optional notes (max 100 chars)  |
| `requester`        | `string`       | —        | Consumer MSISDN on whose behalf |

## CommandIDs

| CommandID           | Use Case                 | Org Portal Role Required                 |
| ------------------- | ------------------------ | ---------------------------------------- |
| `BusinessPayToBulk` | Load B2C shortcode       | "Org Business Pay to Bulk API initiator" |
| `BusinessPayment`   | Direct unsecured payment | "Org Business Payment API initiator"     |
| `SalaryPayment`     | Salary disbursement      | "Org Salary Payment API initiator"       |
| `PromotionPayment`  | Promotions/bonuses       | "Org Promotion Payment API initiator"    |

## Result Callback

```ts
import {
  isB2CResult,
  isB2CSuccess,
  isB2CFailure,
  getB2CTransactionId,
  getB2CAmount,
  getB2CConversationId,
  getB2CReceiverPublicName,
  getB2CDebitAccountBalance,
} from 'pesafy'

app.post('/api/mpesa/b2c/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' }) // respond first!

  if (!isB2CResult(req.body)) return

  if (isB2CSuccess(req.body)) {
    const txId = getB2CTransactionId(req.body) // 'OEI2AK4XXXX'
    const amount = getB2CAmount(req.body) // number
    const balance = getB2CDebitAccountBalance(req.body) // remaining balance
    const name = getB2CReceiverPublicName(req.body) // 'Jane Doe'

    db.disbursements.markCompleted({ txId, amount }).catch(console.error)
  } else {
    const { ResultCode, ResultDesc } = req.body.Result
    // 2001 = invalid initiator info
    console.error('B2C failed:', ResultCode, ResultDesc)
  }
})
```

## Result Parameter Extractors

| Function                           | Returns          | Description                |
| ---------------------------------- | ---------------- | -------------------------- |
| `getB2CTransactionId()`            | `string \| null` | M-PESA receipt number      |
| `getB2CAmount()`                   | `number \| null` | Transaction amount         |
| `getB2CConversationId()`           | `string`         | ConversationID             |
| `getB2COriginatorConversationId()` | `string`         | OriginatorConversationID   |
| `getB2CReceiverPublicName()`       | `string \| null` | Receiver's name            |
| `getB2CCurrency()`                 | `string`         | Currency (usually `'KES'`) |
| `getB2CDebitAccountBalance()`      | `string \| null` | Remaining balance          |
| `getB2CDebitPartyCharges()`        | `string \| null` | Transaction charges        |
| `getB2CTransactionCompletedTime()` | `string \| null` | Completion timestamp       |
