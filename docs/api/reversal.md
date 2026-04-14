# Transaction Reversal

Reverse a completed M-PESA C2B transaction, refunding the original amount to the
customer.

**Daraja endpoint:** `POST /mpesa/reversal/v1/request`  
**Type:** Asynchronous — result POSTed to `resultUrl`

::: info Required role Your initiator must have the **"Org Reversals
Initiator"** role on the M-PESA org portal. :::

::: warning C2B only The Reversals API is for **Customer-to-Business (C2B)**
transactions only. B2C reversals must be handled manually through the M-PESA
organisation portal. :::

::: warning Amount must match exactly `amount` must equal the **original
transaction amount**. Partial reversals are not supported. :::

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

## `reverseTransaction()`

```ts
const response = await mpesa.reverseTransaction({
  transactionId: 'OEI2AK4XXXX', // M-PESA receipt of the original transaction
  receiverParty: '174379', // your shortcode
  amount: 200, // must match the original amount exactly
  resultUrl: 'https://yourdomain.com/api/mpesa/reversal/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/reversal/timeout',
  remarks: 'Customer requested refund',
})
```

### Parameters

| Parameter                | Type     | Required | Description                                                                |
| ------------------------ | -------- | -------- | -------------------------------------------------------------------------- |
| `transactionId`          | `string` | ✅       | M-PESA receipt number of the transaction to reverse (e.g. `'PDU91HIVIT'`). |
| `receiverParty`          | `string` | ✅       | Your organisation shortcode (Paybill or Till number).                      |
| `amount`                 | `number` | ✅       | Amount to reverse. Must equal the original transaction amount exactly.     |
| `resultUrl`              | `string` | ✅       | Public URL Safaricom POSTs the reversal result to.                         |
| `queueTimeOutUrl`        | `string` | ✅       | Public URL called on queue timeout.                                        |
| `receiverIdentifierType` | `'11'`   | —        | Always `'11'` per Daraja docs. pesafy validates and enforces this.         |
| `remarks`                | `string` | —        | 2–100 characters. Defaults to `'Transaction Reversal'`.                    |
| `occasion`               | `string` | —        | Optional additional reference.                                             |

::: info Fixed values `CommandID` is always `'TransactionReversal'` and
`RecieverIdentifierType` is always `'11'` per Daraja documentation. These are
set automatically. :::

### Sync response

```ts
interface ReversalResponse {
  OriginatorConversationID: string // save to correlate the async callback
  ConversationID: string
  ResponseCode: string // '0' = accepted
  ResponseDescription: string
}
```

## Async result callback

### Success

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "f1e2-4b95-a71d-...",
    "ConversationID": "AG_20211106_...",
    "TransactionID": "SKE52PAWR9",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "DebitAccountBalance",
          "Value": "Utility Account|KES|7722179.62|..."
        },
        { "Key": "Amount", "Value": 1.0 },
        { "Key": "TransCompletedTime", "Value": 20211114132711 },
        { "Key": "OriginalTransactionID", "Value": "SKC82PACB8" },
        { "Key": "Charge", "Value": 0.0 },
        {
          "Key": "CreditPartyPublicName",
          "Value": "254705912645 - Nicholas Songok"
        },
        { "Key": "DebitPartyPublicName", "Value": "600992 - My Business" }
      ]
    }
  }
}
```

### Failure

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": "R000002",
    "ResultDesc": "The OriginalTransactionID is invalid.",
    "OriginatorConversationID": "...",
    "ConversationID": "..."
  }
}
```

Note: `ResultCode` is `0` (number) on success and a string like `'R000002'` on
failure.

### Handling the result

```ts
import {
  isReversalResult,
  isReversalSuccess,
  isReversalFailure,
  isKnownReversalResultCode,
  getReversalTransactionId,
  getReversalConversationId,
  getReversalOriginatorConversationId,
  getReversalResultCode,
  getReversalResultDesc,
  getReversalAmount,
  getReversalOriginalTransactionId,
  getReversalCreditPartyPublicName,
  getReversalDebitPartyPublicName,
  getReversalDebitAccountBalance,
  getReversalCompletedTime,
  getReversalCharge,
  getReversalResultParam,
  type ReversalResult,
} from 'pesafy'

app.post('/api/mpesa/reversal/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body

  if (!isReversalResult(body)) return

  if (isReversalSuccess(body)) {
    const txId = getReversalTransactionId(body) // reversal receipt | null
    const origId = getReversalOriginatorConversationId(body)
    const amount = getReversalAmount(body) // number | undefined
    const origTxId = getReversalOriginalTransactionId(body) // original txId | undefined
    const credit = getReversalCreditPartyPublicName(body) // customer name | undefined
    const debit = getReversalDebitPartyPublicName(body) // your business | undefined
    const balance = getReversalDebitAccountBalance(body) // pipe-delimited | undefined
    const time = getReversalCompletedTime(body) // number (YYYYMMDDHHmmss) | undefined
    const charge = getReversalCharge(body) // number | undefined

    console.log(
      `Reversed ${origTxId} → receipt ${txId}: KES ${amount} refunded to ${credit}`,
    )
    db.refunds
      .markComplete({ origId, txId, origTxId, amount })
      .catch(console.error)
  } else {
    const code = getReversalResultCode(body) // 'R000002' | number
    const desc = getReversalResultDesc(body)
    console.error(`Reversal failed [${code}]: ${desc}`)
  }
})
```

## Helper functions

| Function                                      | Returns                         | Description                                                  |
| --------------------------------------------- | ------------------------------- | ------------------------------------------------------------ |
| `isReversalResult(body)`                      | `body is ReversalResult`        | Runtime type guard                                           |
| `isReversalSuccess(result)`                   | `boolean`                       | `true` when `ResultCode === 0` (number)                      |
| `isReversalFailure(result)`                   | `boolean`                       | `true` when `ResultCode !== 0`                               |
| `isKnownReversalResultCode(code)`             | `boolean`                       | `true` for a documented result code                          |
| `getReversalTransactionId(result)`            | `string \| null`                | Receipt number of the _reversal_ transaction                 |
| `getReversalConversationId(result)`           | `string`                        | `ConversationID`                                             |
| `getReversalOriginatorConversationId(result)` | `string`                        | `OriginatorConversationID`                                   |
| `getReversalResultCode(result)`               | `number \| string`              | Result code (`0` or e.g. `'R000002'`)                        |
| `getReversalResultDesc(result)`               | `string`                        | Human-readable description                                   |
| `getReversalAmount(result)`                   | `number \| undefined`           | Reversed amount                                              |
| `getReversalOriginalTransactionId(result)`    | `string \| undefined`           | Receipt of the original C2B transaction                      |
| `getReversalCreditPartyPublicName(result)`    | `string \| undefined`           | Customer's public name (formatted: `'254712... - Jane Doe'`) |
| `getReversalDebitPartyPublicName(result)`     | `string \| undefined`           | Your business name (formatted: `'600992 - My Business'`)     |
| `getReversalDebitAccountBalance(result)`      | `string \| undefined`           | Remaining balance (pipe-delimited)                           |
| `getReversalCompletedTime(result)`            | `number \| undefined`           | Completion timestamp (YYYYMMDDHHmmss as number)              |
| `getReversalCharge(result)`                   | `number \| undefined`           | Transaction charge (usually `0`)                             |
| `getReversalResultParam(result, key)`         | `string \| number \| undefined` | Extract any `ResultParameter` by key                         |

## Result codes

| Code        | Meaning                                                    |
| ----------- | ---------------------------------------------------------- |
| `0`         | Transaction reversed successfully                          |
| `1`         | Insufficient balance to complete the reversal              |
| `11`        | Shortcode is in an invalid state                           |
| `21`        | Initiator does not have the "Org Reversals Initiator" role |
| `2001`      | Invalid initiator credentials                              |
| `2006`      | Shortcode not active                                       |
| `2028`      | Shortcode has no permission for reversals                  |
| `8006`      | API user password locked                                   |
| `'R000001'` | Transaction ID has already been reversed                   |
| `'R000002'` | Transaction ID is invalid or does not exist                |

## Error codes (sync response)

| Code             | Description                         |
| ---------------- | ----------------------------------- |
| `'404.001.03'`   | Invalid or expired access token     |
| `'400.002.02'`   | Bad request — invalid payload field |
| `'404.001.01'`   | Resource not found — wrong endpoint |
| `'500.001.1001'` | Internal server error               |
| `'500.003.02'`   | Spike arrest                        |
| `'500.003.03'`   | Quota violation                     |

## Constants

```ts
import { REVERSAL_COMMAND_ID, REVERSAL_RECEIVER_IDENTIFIER_TYPE } from 'pesafy'

console.log(REVERSAL_COMMAND_ID) // 'TransactionReversal'
console.log(REVERSAL_RECEIVER_IDENTIFIER_TYPE) // '11'
```

## Types

```ts
interface ReversalRequest {
  transactionId: string
  receiverParty: string
  amount: number
  resultUrl: string
  queueTimeOutUrl: string
  receiverIdentifierType?: '11' // always '11', enforced by pesafy
  remarks?: string
  occasion?: string
}

interface ReversalResponse {
  OriginatorConversationID: string
  ConversationID: string
  ResponseCode: string
  ResponseDescription: string
}

const REVERSAL_RESULT_CODES = {
  SUCCESS: 0,
  INSUFFICIENT_BALANCE: 1,
  DEBIT_PARTY_INVALID_STATE: 11,
  INITIATOR_NOT_ALLOWED: 21,
  INITIATOR_INFORMATION_INVALID: 2001,
  DECLINED_ACCOUNT_RULE: 2006,
  NOT_PERMITTED: 2028,
  SECURITY_CREDENTIAL_LOCKED: 8006,
  ALREADY_REVERSED: 'R000001',
  INVALID_TRANSACTION_ID: 'R000002',
} as const
```
