# Transaction Status

Query the status of any M-PESA transaction by its transaction ID. This is an **asynchronous** API — the sync response only acknowledges receipt. The full transaction details are POSTed to your `resultUrl`.

::: info Required Role
Your initiator must have the **"Transaction Status query ORG API"** role on the M-PESA org portal.
:::

## Usage

```ts
const response = await mpesa.transactionStatus({
  transactionId: 'OEI2AK4XXXX',
  partyA: '174379',
  identifierType: '4',
  resultUrl: 'https://yourdomain.com/mpesa/status/result',
  queueTimeOutUrl: 'https://yourdomain.com/mpesa/status/timeout',
  remarks: 'Check payment status',
  occasion: 'Order #1234',
})
```

## Parameters

| Parameter         | Type                | Required | Description                                               |
| ----------------- | ------------------- | -------- | --------------------------------------------------------- |
| `transactionId`   | `string`            | ✅       | The M-PESA transaction ID to look up (e.g. `OEI2AK4XXXX`) |
| `partyA`          | `string`            | ✅       | Your business shortcode, till, or MSISDN                  |
| `identifierType`  | `"1" \| "2" \| "4"` | ✅       | `"1"` MSISDN · `"2"` Till · `"4"` Organisation ShortCode  |
| `resultUrl`       | `string`            | ✅       | Public URL Safaricom POSTs the result to                  |
| `queueTimeOutUrl` | `string`            | ✅       | Public URL Safaricom calls on queue timeout               |
| `commandId`       | `string`            | —        | Defaults to `"TransactionStatusQuery"`                    |
| `remarks`         | `string`            | —        | Short remarks (up to 100 characters)                      |
| `occasion`        | `string`            | —        | Additional reference                                      |

## Sync Response

```json
{
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully.",
  "ConversationID": "AG_20240101_...",
  "OriginatorConversationID": "AG_20240101_..."
}
```

## Async Result (POSTed to `resultUrl`)

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
        { "Key": "DebitPartyName", "Value": "254712345678 - John Doe" },
        { "Key": "CreditPartyName", "Value": "000001 - My Business" },
        { "Key": "TransactionStatus", "Value": "Completed" },
        { "Key": "ReasonType", "Value": "Pay Bill" },
        { "Key": "TransactionReason", "Value": "" },
        { "Key": "DebitAccountBalance", "Value": "Working Account|KES|950.00" },
        { "Key": "Amount", "Value": 50 },
        { "Key": "DebitPartyCharges", "Value": "" },
        { "Key": "Currency", "Value": "KES" },
        { "Key": "TransactionDate", "Value": 20240101123000 },
        { "Key": "CustomerReference", "Value": "INV-001" },
        { "Key": "TransactionDetails", "Value": "pay bill" }
      ]
    }
  }
}
```

### Handling the result

```ts
import type { TransactionStatusResult } from 'pesafy'

// In your result webhook handler:
app.post('/mpesa/status/result', (req, res) => {
  const body = req.body as TransactionStatusResult
  const result = body.Result

  if (result.ResultCode === 0) {
    console.log('Transaction found:', result.TransactionID)

    const params = result.ResultParameters?.ResultParameter ?? []
    const get = (key: string) => params.find((p) => p.Key === key)?.Value

    console.log('Status:', get('TransactionStatus'))
    console.log('Amount:', get('Amount'))
  } else {
    console.warn('Query failed:', result.ResultDesc)
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

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
  await mpesa.transactionStatus({ ... })
} catch (e) {
  if (e instanceof PesafyError) {
    console.error(e.code, e.message)
  }
}
```

## Types

```ts
interface TransactionStatusRequest {
  transactionId: string
  partyA: string
  identifierType: '1' | '2' | '4'
  resultUrl: string
  queueTimeOutUrl: string
  commandId?: string
  remarks?: string
  occasion?: string
}

interface TransactionStatusResponse {
  ResponseCode: string
  ResponseDescription: string
  ConversationID?: string
  OriginatorConversationID?: string
}

interface TransactionStatusResultParameter {
  Key: string
  Value: string | number
}

interface TransactionStatusResult {
  Result: {
    ResultType: string
    ResultCode: number
    ResultDesc: string
    OriginatorConversationID: string
    ConversationID: string
    TransactionID: string
    ResultParameters?: {
      ResultParameter: TransactionStatusResultParameter[]
    }
  }
}
```
