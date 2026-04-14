# B2C — Account Top-Up

Move funds from your MMF/Working account to a B2C shortcode for bulk
disbursement. This is different from [B2C Disbursement](./b2c-disbursement) —
this API loads a B2C shortcode; the disbursement API sends directly to
individual customer MSISDNs.

**Daraja endpoint:** `POST /mpesa/b2b/v1/paymentrequest`  
**CommandID:** `BusinessPayToBulk` (only supported value)  
**Type:** Asynchronous — result POSTed to `resultUrl`

::: info Required role Your initiator must have the **"Org Business Pay to Bulk
API initiator"** role on the M-PESA org portal. :::

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

## `b2cPayment()`

```ts
const response = await mpesa.b2cPayment({
  commandId: 'BusinessPayToBulk',
  amount: 50_000,
  partyA: '600979', // your MMF shortcode (sender)
  partyB: '600000', // target B2C shortcode (receiver)
  accountReference: 'BATCH-JAN-01',
  resultUrl: 'https://yourdomain.com/api/mpesa/b2c/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2c/timeout',
  remarks: 'January batch load',
})
```

### Parameters

| Parameter          | Type                  | Required | Description                                                                |
| ------------------ | --------------------- | -------- | -------------------------------------------------------------------------- |
| `commandId`        | `'BusinessPayToBulk'` | ✅       | Must be exactly `'BusinessPayToBulk'`. No other values are supported.      |
| `amount`           | `number`              | ✅       | Amount in KES. Minimum 1. Fractional values are rounded.                   |
| `partyA`           | `string`              | ✅       | Your sending shortcode (the MMF/Working account debited).                  |
| `partyB`           | `string`              | ✅       | The B2C shortcode receiving the funds.                                     |
| `accountReference` | `string`              | ✅       | Transaction reference (batch ID, invoice, etc.).                           |
| `resultUrl`        | `string`              | ✅       | Public URL Safaricom POSTs the result to.                                  |
| `queueTimeOutUrl`  | `string`              | ✅       | Public URL called when the request times out in the queue.                 |
| `remarks`          | `string`              | —        | Optional notes (up to 100 characters). Defaults to `'B2C Account Top Up'`. |
| `requester`        | `string`              | —        | Consumer MSISDN on whose behalf the transfer is made (`254XXXXXXXXX`).     |

::: info Fixed values `SenderIdentifierType` and `RecieverIdentifierType` are
both hardcoded to `"4"` (Organisation ShortCode) per the Daraja B2C spec. :::

### Sync response

```ts
interface B2CResponse {
  OriginatorConversationID: string // save this to correlate the async callback
  ConversationID: string
  ResponseCode: string // '0' = accepted
  ResponseDescription: string
}
```

`ResponseCode: '0'` means the request was queued. **Funds have not yet moved** —
the final result arrives at your `resultUrl`.

## Async result callback

Safaricom POSTs to your `resultUrl` after processing. Respond `200` immediately
and process in the background.

```json
{
  "Result": {
    "ResultType": "0",
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "AG_20240101_...",
    "ConversationID": "AG_20240101_...",
    "TransactionID": "OEI2AK4XXXX",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "DebitAccountBalance",
          "Value": "{Amount={CurrencyCode=KES, ...}}"
        },
        { "Key": "Amount", "Value": 50000 },
        { "Key": "Currency", "Value": "KES" },
        {
          "Key": "ReceiverPartyPublicName",
          "Value": "600000 - My B2C Shortcode"
        },
        { "Key": "TransactionCompletedTime", "Value": 20240101123456 },
        { "Key": "DebitPartyCharges", "Value": "" }
      ]
    }
  }
}
```

### Handling the result

```ts
import {
  isB2CResult,
  isB2CSuccess,
  isB2CFailure,
  getB2CTransactionId,
  getB2CAmount,
  getB2CCurrency,
  getB2CConversationId,
  getB2COriginatorConversationId,
  getB2CReceiverPublicName,
  getB2CDebitAccountBalance,
  getB2CDebitPartyCharges,
  getB2CTransactionCompletedTime,
  getB2CResultDesc,
} from 'pesafy'

app.post('/api/mpesa/b2c/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' }) // respond first

  const body = req.body

  if (!isB2CResult(body)) return // not a B2C callback

  if (isB2CSuccess(body)) {
    const txId = getB2CTransactionId(body) // 'OEI2AK4XXXX' | null
    const amount = getB2CAmount(body) // number | null
    const name = getB2CReceiverPublicName(body) // '600000 - My B2C Shortcode' | null
    const balance = getB2CDebitAccountBalance(body) // balance string | null
    const time = getB2CTransactionCompletedTime(body) // 'YYYYMMDDHHmmss' | null

    db.batches.markCompleted({ txId, amount }).catch(console.error)
  } else {
    const code = body.Result.ResultCode // e.g. 2001
    const desc = getB2CResultDesc(body)
    console.error(`B2C failed [${code}]: ${desc}`)
  }
})
```

## Helper functions

| Function                                 | Returns                         | Description                                           |
| ---------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `isB2CResult(body)`                      | `body is B2CResult`             | Runtime type guard — checks the Result envelope shape |
| `isB2CSuccess(result)`                   | `boolean`                       | `true` when `ResultCode === 0`                        |
| `isB2CFailure(result)`                   | `boolean`                       | `true` when `ResultCode !== 0`                        |
| `isKnownB2CResultCode(code)`             | `boolean`                       | `true` for a documented result code                   |
| `getB2CTransactionId(result)`            | `string \| null`                | M-PESA receipt number                                 |
| `getB2CConversationId(result)`           | `string`                        | `ConversationID`                                      |
| `getB2COriginatorConversationId(result)` | `string`                        | `OriginatorConversationID`                            |
| `getB2CResultDesc(result)`               | `string`                        | Human-readable result description                     |
| `getB2CAmount(result)`                   | `number \| null`                | Transaction amount                                    |
| `getB2CCurrency(result)`                 | `string`                        | Currency (usually `'KES'`)                            |
| `getB2CReceiverPublicName(result)`       | `string \| null`                | Receiver's public name                                |
| `getB2CDebitAccountBalance(result)`      | `string \| null`                | Remaining debit account balance                       |
| `getB2CDebitPartyCharges(result)`        | `string \| null`                | Transaction charges                                   |
| `getB2CTransactionCompletedTime(result)` | `string \| null`                | Completion timestamp (YYYYMMDDHHmmss)                 |
| `getB2CResultParam(result, key)`         | `string \| number \| undefined` | Extract any `ResultParameter` by key                  |

## Result codes

| Code   | Meaning                            |
| ------ | ---------------------------------- |
| `0`    | Transaction processed successfully |
| `2001` | Invalid initiator information      |

## Error codes (sync response)

| Code             | Description                     |
| ---------------- | ------------------------------- |
| `'500.003.1001'` | Internal server error           |
| `'400.003.01'`   | Invalid or expired access token |
| `'400.003.02'`   | Bad request                     |
| `'500.003.03'`   | Quota violation                 |
| `'500.003.02'`   | Spike arrest                    |
| `'404.003.01'`   | Resource not found              |
| `'404.001.04'`   | Invalid authentication header   |
| `'400.002.05'`   | Invalid request payload         |

## Types

```ts
type B2CCommandID = 'BusinessPayToBulk' // only supported value

interface B2CRequest {
  commandId: B2CCommandID
  amount: number
  partyA: string
  partyB: string
  accountReference: string
  resultUrl: string
  queueTimeOutUrl: string
  remarks?: string
  requester?: string // consumer MSISDN
}

interface B2CResponse {
  OriginatorConversationID: string
  ConversationID: string
  ResponseCode: string
  ResponseDescription: string
}

interface B2CResult {
  Result: {
    ResultType: string | number
    ResultCode: string | number // 0 | '0' = success
    ResultDesc: string
    OriginatorConversationID: string
    ConversationID: string
    TransactionID: string
    ResultParameters?: {
      ResultParameter: B2CResultParameter | B2CResultParameter[]
    }
  }
}

type B2CResultParameterKey =
  | 'DebitAccountBalance'
  | 'Amount'
  | 'Currency'
  | 'ReceiverPartyPublicName'
  | 'TransactionCompletedTime'
  | 'DebitPartyCharges'
  | (string & {})
```
