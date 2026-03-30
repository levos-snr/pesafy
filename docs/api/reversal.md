# Transaction Reversal

Reverse a completed M-PESA transaction. This is an **asynchronous** API — the sync response is an acknowledgement only. The reversal outcome is POSTed to your `resultUrl`.

::: info Required Role
Your initiator must have the **"Reversal ORG API initiator"** role on the M-PESA org portal.
:::

::: warning Amount must match
The `amount` you send must equal the **original transaction amount**. Partial reversals are not supported.
:::

## Usage

```ts
const response = await mpesa.reverseTransaction({
  transactionId: 'OEI2AK4XXXX',
  receiverParty: '174379',
  receiverIdentifierType: '4',
  amount: 100,
  resultUrl: 'https://yourdomain.com/mpesa/reversal/result',
  queueTimeOutUrl: 'https://yourdomain.com/mpesa/reversal/timeout',
  remarks: 'Customer requested refund',
})
```

## Parameters

| Parameter                | Type                | Required | Description                                               |
| ------------------------ | ------------------- | -------- | --------------------------------------------------------- |
| `transactionId`          | `string`            | ✅       | The M-PESA transaction ID to reverse (e.g. `OEI2AK4XXXX`) |
| `receiverParty`          | `string`            | ✅       | Your business shortcode requesting the reversal           |
| `receiverIdentifierType` | `"1" \| "2" \| "4"` | ✅       | `"1"` MSISDN · `"2"` Till · `"4"` Organisation ShortCode  |
| `amount`                 | `number`            | ✅       | Amount to reverse — must match the original transaction   |
| `resultUrl`              | `string`            | ✅       | Public URL Safaricom POSTs the reversal result to         |
| `queueTimeOutUrl`        | `string`            | ✅       | Public URL Safaricom calls on queue timeout               |
| `remarks`                | `string`            | —        | Short remarks (up to 100 characters)                      |
| `occasion`               | `string`            | —        | Additional occasion string                                |

## Sync Response

```json
{
  "OriginatorConversationID": "AG_20240101_...",
  "ConversationID": "AG_20240101_...",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

`ResponseCode: "0"` means the reversal request was accepted and queued. The final result arrives at your `resultUrl`.

## Async Result (POSTed to `resultUrl`)

### Success (`ResultCode: 0`)

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
        { "Key": "DebitAccountBalance", "Value": "Working Account|KES|945.00" },
        { "Key": "Amount", "Value": 50 },
        { "Key": "TransCompletedTime", "Value": 20240101123456 },
        { "Key": "OriginalTransactionID", "Value": "OEI2AK4XXXX" },
        { "Key": "Charge", "Value": "" },
        { "Key": "CreditPartyPublicName", "Value": "254712345678 - John Doe" },
        { "Key": "DebitPartyPublicName", "Value": "000001 - My Business" }
      ]
    }
  }
}
```

### Handling the result

```ts
import { isReversalSuccess, getReversalTransactionId } from 'pesafy'
import type { ReversalResult } from 'pesafy'

// In your result webhook handler:
app.post('/mpesa/reversal/result', (req, res) => {
  const body = req.body as ReversalResult

  if (isReversalSuccess(body)) {
    console.log('Reversed:', getReversalTransactionId(body))
  } else {
    console.warn('Reversal failed:', body.Result.ResultDesc)
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

## Helper Functions

```ts
import {
  isReversalSuccess,
  getReversalTransactionId,
  getReversalConversationId,
} from 'pesafy'
```

| Helper                      | Returns          | Description                          |
| --------------------------- | ---------------- | ------------------------------------ |
| `isReversalSuccess`         | `boolean`        | `true` when `ResultCode === 0`       |
| `getReversalTransactionId`  | `string \| null` | Extract `TransactionID` from result  |
| `getReversalConversationId` | `string`         | Extract `ConversationID` from result |

## Identifier Types

| Value | Meaning                | When to use                         |
| ----- | ---------------------- | ----------------------------------- |
| `"1"` | MSISDN                 | Customer phone number               |
| `"2"` | Till Number            | Buy Goods shortcode                 |
| `"4"` | Organisation ShortCode | Paybill / B2C shortcode _(default)_ |

## Error Handling

```ts
import { PesafyError } from 'pesafy'

try {
  await mpesa.reverseTransaction({ ... })
} catch (e) {
  if (e instanceof PesafyError) {
    console.error(e.code, e.message)
  }
}
```

## Types

```ts
interface ReversalRequest {
  transactionId: string
  receiverParty: string
  receiverIdentifierType: '1' | '2' | '4'
  amount: number
  resultUrl: string
  queueTimeOutUrl: string
  remarks?: string
  occasion?: string
}

interface ReversalResponse {
  OriginatorConversationID: string
  ConversationID: string
  ResponseCode: string
  ResponseDescription: string
}
```
