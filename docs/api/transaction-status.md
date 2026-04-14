# Transaction Status

Look up the status, amount, and parties of any M-PESA transaction by its receipt
number or conversation ID.

**Daraja endpoint:** `POST /mpesa/transactionstatus/v1/query`  
**Type:** Asynchronous — result POSTed to `resultUrl`

::: info Required role Your initiator must have the **"Transaction Status query
ORG API"** role on the M-PESA org portal. :::

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

## `transactionStatus()`

```ts
// Query by M-PESA receipt number
const response = await mpesa.transactionStatus({
  transactionId: 'OEI2AK4XXXX',
  partyA: '174379',
  identifierType: '4',
  resultUrl: 'https://yourdomain.com/api/mpesa/tx-status/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/tx-status/timeout',
  remarks: 'Reconciliation check',
})

// Query by OriginatorConversationID (when you don't have the receipt)
const response2 = await mpesa.transactionStatus({
  originalConversationId: '7071-4170-a0e5-8345632bad4421',
  partyA: '174379',
  identifierType: '4',
  resultUrl: 'https://yourdomain.com/api/mpesa/tx-status/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/tx-status/timeout',
})
```

::: tip At least one ID is required Either `transactionId` (M-PESA receipt
number, e.g. `'OEI2AK4XXXX'`) or `originalConversationId` (the
`OriginatorConversationID` from your original API call) must be provided. :::

### Parameters

| Parameter                | Type                       | Required                         | Description                                                                           |
| ------------------------ | -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| `transactionId`          | `string`                   | ✅ (or `originalConversationId`) | M-PESA receipt number (e.g. `'NEF61H8J60'`).                                          |
| `originalConversationId` | `string`                   | ✅ (or `transactionId`)          | `OriginatorConversationID` from the original request when you don't have the receipt. |
| `partyA`                 | `string`                   | ✅                               | Your business shortcode, till, or MSISDN.                                             |
| `identifierType`         | `'1' \| '2' \| '4'`        | ✅                               | Type of `partyA` — see table below.                                                   |
| `resultUrl`              | `string`                   | ✅                               | Public URL Safaricom POSTs the result to.                                             |
| `queueTimeOutUrl`        | `string`                   | ✅                               | Public URL called on queue timeout.                                                   |
| `commandId`              | `'TransactionStatusQuery'` | —                                | Defaults to `'TransactionStatusQuery'`.                                               |
| `remarks`                | `string`                   | —                                | Optional notes (up to 100 characters).                                                |
| `occasion`               | `string`                   | —                                | Additional reference (up to 100 characters).                                          |

### Identifier types

| Value | Meaning                                |
| ----- | -------------------------------------- |
| `'1'` | MSISDN (customer phone number)         |
| `'2'` | Till Number (Buy Goods)                |
| `'4'` | Organisation ShortCode (Paybill / B2C) |

### Sync response

```ts
interface TransactionStatusResponse {
  OriginatorConversationID: string
  ConversationID: string
  ResponseCode: string // '0' = accepted
  ResponseDescription: string
}
```

## Async result callback

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
        { "Key": "DebitPartyName", "Value": "600310 - Safaricom333" },
        { "Key": "CreditPartyName", "Value": "254712345678 - Jane Doe" },
        { "Key": "TransactionStatus", "Value": "Completed" },
        { "Key": "Amount", "Value": 1500 },
        { "Key": "ReceiptNo", "Value": "OEI2AK4XXXX" },
        {
          "Key": "DebitAccountBalance",
          "Value": "Working Account|KES|98500.00|..."
        },
        { "Key": "TransactionDate", "Value": 20240101123000 }
      ]
    }
  }
}
```

### Handling the result

```ts
import {
  isTransactionStatusResult,
  isTransactionStatusSuccess,
  isTransactionStatusFailure,
  isKnownTransactionStatusResultCode,
  getTransactionStatusTransactionId,
  getTransactionStatusConversationId,
  getTransactionStatusOriginatorConversationId,
  getTransactionStatusResultCode,
  getTransactionStatusResultDesc,
  getTransactionStatusAmount,
  getTransactionStatusReceiptNo,
  getTransactionStatusStatus,
  getTransactionStatusDebitPartyName,
  getTransactionStatusCreditPartyName,
  getTransactionStatusDebitAccountBalance,
  getTransactionStatusTransactionDate,
  getTransactionStatusResultParam,
  type TransactionStatusResult,
} from 'pesafy'

app.post('/api/mpesa/tx-status/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body

  if (!isTransactionStatusResult(body)) return

  if (isTransactionStatusSuccess(body)) {
    const txId = getTransactionStatusTransactionId(body) // 'OEI2AK4XXXX'
    const amount = getTransactionStatusAmount(body) // number | null
    const receipt = getTransactionStatusReceiptNo(body) // 'OEI2AK4XXXX' | null
    const status = getTransactionStatusStatus(body) // 'Completed' | null
    const debit = getTransactionStatusDebitPartyName(body) // '600310 - ...' | null
    const credit = getTransactionStatusCreditPartyName(body) // '254712... - Jane' | null
    const date = getTransactionStatusTransactionDate(body) // 'YYYYMMDDHHmmss' | null
    const balance = getTransactionStatusDebitAccountBalance(body) // pipe-delimited | null

    console.log(`Transaction ${txId}: ${status}, KES ${amount}`)
    console.log(`  From: ${debit}`)
    console.log(`  To:   ${credit}`)
  } else {
    const code = getTransactionStatusResultCode(body)
    const desc = getTransactionStatusResultDesc(body)
    console.error(`Status query failed [${code}]: ${desc}`)
  }
})
```

## Helper functions

| Function                                               | Returns                           | Description                              |
| ------------------------------------------------------ | --------------------------------- | ---------------------------------------- |
| `isTransactionStatusResult(body)`                      | `body is TransactionStatusResult` | Runtime type guard                       |
| `isTransactionStatusSuccess(result)`                   | `boolean`                         | `true` when `ResultCode === 0`           |
| `isTransactionStatusFailure(result)`                   | `boolean`                         | `true` when `ResultCode !== 0`           |
| `isKnownTransactionStatusResultCode(code)`             | `boolean`                         | `true` for a documented result code      |
| `getTransactionStatusTransactionId(result)`            | `string`                          | `TransactionID`                          |
| `getTransactionStatusConversationId(result)`           | `string`                          | `ConversationID`                         |
| `getTransactionStatusOriginatorConversationId(result)` | `string`                          | `OriginatorConversationID`               |
| `getTransactionStatusResultCode(result)`               | `string \| number`                | Result code                              |
| `getTransactionStatusResultDesc(result)`               | `string`                          | Human-readable description               |
| `getTransactionStatusAmount(result)`                   | `number \| null`                  | `Amount`                                 |
| `getTransactionStatusReceiptNo(result)`                | `string \| null`                  | `ReceiptNo`                              |
| `getTransactionStatusStatus(result)`                   | `string \| null`                  | `TransactionStatus` (e.g. `'Completed'`) |
| `getTransactionStatusDebitPartyName(result)`           | `string \| null`                  | `DebitPartyName`                         |
| `getTransactionStatusCreditPartyName(result)`          | `string \| null`                  | `CreditPartyName`                        |
| `getTransactionStatusDebitAccountBalance(result)`      | `string \| null`                  | `DebitAccountBalance` (pipe-delimited)   |
| `getTransactionStatusTransactionDate(result)`          | `string \| null`                  | `TransactionDate`                        |
| `getTransactionStatusResultParam(result, key)`         | `string \| number \| undefined`   | Extract any `ResultParameter` by key     |

## Result codes

| Code   | Meaning                                |
| ------ | -------------------------------------- |
| `0`    | Transaction found and details returned |
| `2001` | Invalid initiator information          |

## Error codes (sync response)

| Code             | Description                     |
| ---------------- | ------------------------------- |
| `'400.003.01'`   | Invalid or expired access token |
| `'400.003.02'`   | Bad request                     |
| `'500.003.1001'` | Internal server error           |
| `'500.003.03'`   | Quota violation                 |
| `'500.003.02'`   | Spike arrest                    |
| `'404.003.01'`   | Resource not found              |
| `'404.001.04'`   | Invalid authentication header   |
| `'400.002.05'`   | Invalid request payload         |

## Types

```ts
interface TransactionStatusRequest {
  transactionId?: string // M-PESA receipt number
  originalConversationId?: string // use when receipt not available
  partyA: string
  identifierType: '1' | '2' | '4'
  resultUrl: string
  queueTimeOutUrl: string
  commandId?: 'TransactionStatusQuery'
  remarks?: string
  occasion?: string
}

type TransactionStatusResultParameterKey =
  | 'DebitPartyName'
  | 'TransactionStatus'
  | 'Amount'
  | 'ReceiptNo'
  | 'DebitAccountBalance'
  | 'TransactionDate'
  | 'CreditPartyName'
  | (string & {})
```
