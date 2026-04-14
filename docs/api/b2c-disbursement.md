# B2C Disbursement

Send money directly from your business shortcode to individual customer MSISDNs
— for salaries, cashback, promotions, and general business payments.

**Daraja endpoint:** `POST /mpesa/b2c/v3/paymentrequest`  
**Type:** Asynchronous — result POSTed to `resultUrl`

::: tip B2C Disbursement vs B2C Account Top-Up These are two distinct APIs:

- **[B2C Account Top-Up](./b2c)** — loads a B2C shortcode using
  `BusinessPayToBulk`. Use this to fund a B2C wallet.
- **B2C Disbursement** (this page) — sends directly to customer MSISDNs using
  `BusinessPayment`, `SalaryPayment`, or `PromotionPayment`. Use this for
  payroll, commissions, and prizes. :::

## Prerequisites

```ts
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD!,
  certificatePath: './SandboxCertificate.cer',
})
```

Each `commandId` requires a separate org-portal role:

| CommandID          | Required role                         |
| ------------------ | ------------------------------------- |
| `BusinessPayment`  | "Org Business Payment API initiator"  |
| `SalaryPayment`    | "Org Salary Payment API initiator"    |
| `PromotionPayment` | "Org Promotion Payment API initiator" |

## `b2cDisbursement()`

```ts
// Salary payment
const response = await mpesa.b2cDisbursement({
  originatorConversationId: 'salary-jan-001', // unique per request
  commandId: 'SalaryPayment',
  amount: 25_000,
  partyA: '600979', // your shortcode
  partyB: '254712345678', // employee MSISDN
  remarks: 'January salary',
  resultUrl: 'https://yourdomain.com/api/mpesa/b2c/disburse/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/disburse/timeout',
})

// Business payment (ad-hoc)
await mpesa.b2cDisbursement({
  originatorConversationId: `payout-${Date.now()}`,
  commandId: 'BusinessPayment',
  amount: 1_000,
  partyA: '600979',
  partyB: '254798765432',
  remarks: 'Referral bonus',
  resultUrl: 'https://yourdomain.com/api/mpesa/b2c/disburse/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/disburse/timeout',
})

// Promotion payment
await mpesa.b2cDisbursement({
  originatorConversationId: `promo-win-${orderId}`,
  commandId: 'PromotionPayment',
  amount: 500,
  partyA: '600979',
  partyB: '254711223344',
  remarks: 'Lucky draw prize',
  resultUrl: 'https://yourdomain.com/api/mpesa/b2c/disburse/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/disburse/timeout',
})
```

### Parameters

| Parameter                  | Type                                                         | Required | Description                                                                                                     |
| -------------------------- | ------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------- |
| `originatorConversationId` | `string`                                                     | ✅       | Your unique identifier for this request. Used for idempotency — resending the same ID replays the same request. |
| `commandId`                | `'BusinessPayment' \| 'SalaryPayment' \| 'PromotionPayment'` | ✅       | Transaction type.                                                                                               |
| `amount`                   | `number`                                                     | ✅       | Amount in KES. Minimum 10.                                                                                      |
| `partyA`                   | `string`                                                     | ✅       | Your sending organisation shortcode.                                                                            |
| `partyB`                   | `string`                                                     | ✅       | Receiving customer MSISDN (`2547XXXXXXXX`).                                                                     |
| `remarks`                  | `string`                                                     | ✅       | Transaction description (2–100 characters).                                                                     |
| `resultUrl`                | `string`                                                     | ✅       | Public URL Safaricom POSTs the result to.                                                                       |
| `queueTimeOutUrl`          | `string`                                                     | ✅       | Public URL called on queue timeout.                                                                             |
| `occasion`                 | `string`                                                     | —        | Additional reference. Optional.                                                                                 |

### Sync response

```ts
interface B2CDisbursementResponse {
  ConversationID: string // M-PESA assigned ID
  OriginatorConversationID: string // echoes back your request ID
  ResponseCode: string // '0' = accepted
  ResponseDescription: string
}
```

## Async result callback

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "salary-jan-001",
    "ConversationID": "AG_20240101_...",
    "TransactionID": "OEI2AK4XXXX",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "TransactionAmount", "Value": 25000 },
        { "Key": "TransactionReceipt", "Value": "OEI2AK4XXXX" },
        {
          "Key": "ReceiverPartyPublicName",
          "Value": "254712345678 - Jane Doe"
        },
        {
          "Key": "TransactionCompletedDateTime",
          "Value": "01.01.2024 12:34:56"
        },
        { "Key": "B2CWorkingAccountAvailableFunds", "Value": 175000.0 },
        { "Key": "B2CUtilityAccountAvailableFunds", "Value": 0.0 },
        { "Key": "B2CChargesPaidAccountAvailableFunds", "Value": 0.0 },
        { "Key": "B2CRecipientIsRegisteredCustomer", "Value": "Y" }
      ]
    }
  }
}
```

### Handling the result

```ts
import {
  isB2CDisbursementResult,
  isB2CDisbursementSuccess,
  isB2CDisbursementFailure,
  getB2CDisbursementTransactionId,
  getB2CDisbursementAmount,
  getB2CDisbursementReceiptNumber,
  getB2CDisbursementReceiverName,
  getB2CDisbursementCompletedTime,
  getB2CDisbursementWorkingBalance,
  getB2CDisbursementUtilityBalance,
  isB2CDisbursementRecipientRegistered,
  getB2CDisbursementResultCode,
  getB2CDisbursementResultDesc,
  getB2CDisbursementOriginatorConversationId,
} from 'pesafy'

app.post('/api/mpesa/b2c/disburse/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body

  if (!isB2CDisbursementResult(body)) return

  if (isB2CDisbursementSuccess(body)) {
    const txId = getB2CDisbursementTransactionId(body) // 'OEI2AK4XXXX' | null
    const receipt = getB2CDisbursementReceiptNumber(body) // same as txId | null
    const amount = getB2CDisbursementAmount(body) // number | null
    const name = getB2CDisbursementReceiverName(body) // '254712345678 - Jane Doe' | null
    const time = getB2CDisbursementCompletedTime(body) // 'DD.MM.YYYY HH:MM:SS' | null
    const balance = getB2CDisbursementWorkingBalance(body) // number | null
    const registered = isB2CDisbursementRecipientRegistered(body) // boolean | null
    const origId = getB2CDisbursementOriginatorConversationId(body) // your request ID

    db.payroll.markPaid({ origId, txId, amount, name }).catch(console.error)

    if (registered === false) {
      console.warn('Recipient is not a registered M-PESA customer:', name)
    }
  } else {
    const code = getB2CDisbursementResultCode(body)
    const desc = getB2CDisbursementResultDesc(body)
    console.error(`Disbursement failed [${code}]: ${desc}`)
  }
})
```

## Helper functions

| Function                                             | Returns                         | Description                                                    |
| ---------------------------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| `isB2CDisbursementResult(body)`                      | `body is B2CDisbursementResult` | Runtime type guard                                             |
| `isB2CDisbursementSuccess(result)`                   | `boolean`                       | `true` when `ResultCode === 0`                                 |
| `isB2CDisbursementFailure(result)`                   | `boolean`                       | `true` when `ResultCode !== 0`                                 |
| `isKnownB2CDisbursementResultCode(code)`             | `boolean`                       | `true` for any documented result code (handles `'SFC_IC0003'`) |
| `getB2CDisbursementTransactionId(result)`            | `string \| null`                | M-PESA transaction ID                                          |
| `getB2CDisbursementConversationId(result)`           | `string`                        | M-PESA `ConversationID`                                        |
| `getB2CDisbursementOriginatorConversationId(result)` | `string`                        | Your `originatorConversationId` echoed back                    |
| `getB2CDisbursementResultCode(result)`               | `number \| string`              | Result code                                                    |
| `getB2CDisbursementResultDesc(result)`               | `string`                        | Human-readable description                                     |
| `getB2CDisbursementAmount(result)`                   | `number \| null`                | Disbursed amount (`TransactionAmount`)                         |
| `getB2CDisbursementReceiptNumber(result)`            | `string \| null`                | M-PESA receipt number (`TransactionReceipt`)                   |
| `getB2CDisbursementReceiverName(result)`             | `string \| null`                | `ReceiverPartyPublicName` (e.g. `'254712... - Jane Doe'`)      |
| `getB2CDisbursementCompletedTime(result)`            | `string \| null`                | `TransactionCompletedDateTime`                                 |
| `getB2CDisbursementWorkingBalance(result)`           | `number \| null`                | `B2CWorkingAccountAvailableFunds`                              |
| `getB2CDisbursementUtilityBalance(result)`           | `number \| null`                | `B2CUtilityAccountAvailableFunds`                              |
| `isB2CDisbursementRecipientRegistered(result)`       | `boolean \| null`               | `true` when `B2CRecipientIsRegisteredCustomer === 'Y'`         |
| `getB2CDisbursementResultParam(result, key)`         | `string \| number \| undefined` | Extract any `ResultParameter` by key                           |

## Result codes

| Code           | Meaning                                            |
| -------------- | -------------------------------------------------- |
| `0`            | Transaction processed successfully                 |
| `1`            | Insufficient balance                               |
| `2`            | Amount below minimum                               |
| `3`            | Amount above maximum                               |
| `4`            | Daily disbursement limit exceeded                  |
| `8`            | Would exceed maximum account balance               |
| `11`           | Debit party in invalid state                       |
| `21`           | Initiator not allowed to initiate this transaction |
| `2001`         | Invalid initiator information                      |
| `2006`         | Account inactive                                   |
| `2028`         | Product not permitted for this shortcode           |
| `2040`         | Recipient is not a registered M-PESA customer      |
| `8006`         | Security credential locked                         |
| `'SFC_IC0003'` | Operator does not exist                            |

## Types

```ts
type B2CDisbursementCommandID =
  | 'BusinessPayment'
  | 'SalaryPayment'
  | 'PromotionPayment'

interface B2CDisbursementRequest {
  originatorConversationId: string
  commandId: B2CDisbursementCommandID
  amount: number
  partyA: string
  partyB: string
  remarks: string
  resultUrl: string
  queueTimeOutUrl: string
  occasion?: string
}

interface B2CDisbursementResponse {
  ConversationID: string
  OriginatorConversationID: string
  ResponseCode: string
  ResponseDescription: string
}

type B2CDisbursementResultParameterKey =
  | 'TransactionAmount'
  | 'TransactionReceipt'
  | 'ReceiverPartyPublicName'
  | 'TransactionCompletedDateTime'
  | 'B2CUtilityAccountAvailableFunds'
  | 'B2CWorkingAccountAvailableFunds'
  | 'B2CRecipientIsRegisteredCustomer'
  | 'B2CChargesPaidAccountAvailableFunds'
  | (string & {})
```
