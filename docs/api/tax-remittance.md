# Tax Remittance (KRA)

Remit tax directly to the Kenya Revenue Authority (KRA) from your M-PESA
shortcode using a KRA Payment Registration Number (PRN).

**Daraja endpoint:** `POST /mpesa/b2b/v1/remittax`  
**CommandID:** `PayTaxToKRA` (only supported value)  
**Type:** Asynchronous — result POSTed to `resultUrl`

::: info Prerequisites

- You must have a prior KRA integration for tax declaration and PRN generation.
- Your initiator must have the **"Tax Remittance ORG API"** role on the M-PESA
  org portal.
- You must have a valid **Payment Registration Number (PRN)** from KRA. :::

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

## `remitTax()`

```ts
const response = await mpesa.remitTax({
  amount: 239,
  partyA: '888880', // your M-PESA business shortcode
  accountReference: 'KRA-PRN-12345678', // the PRN from KRA
  resultUrl: 'https://yourdomain.com/api/mpesa/tax/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/tax/timeout',
  remarks: 'March VAT',
})
```

### Parameters

| Parameter          | Type     | Required | Description                                                                    |
| ------------------ | -------- | -------- | ------------------------------------------------------------------------------ |
| `amount`           | `number` | ✅       | Amount to remit in KES. Minimum 1. Fractional values are rounded.              |
| `partyA`           | `string` | ✅       | Your M-PESA business shortcode (money is deducted from here).                  |
| `accountReference` | `string` | ✅       | The **Payment Registration Number (PRN)** issued by KRA for this tax payment.  |
| `resultUrl`        | `string` | ✅       | Public URL Safaricom POSTs the result to.                                      |
| `queueTimeOutUrl`  | `string` | ✅       | Public URL called on queue timeout.                                            |
| `partyB`           | `string` | —        | KRA shortcode. Defaults to `'572572'`. Do not change unless instructed by KRA. |
| `remarks`          | `string` | —        | Optional notes. Defaults to `'Tax Remittance'`.                                |

### Fixed API values

These are set automatically and cannot be overridden:

| Daraja field             | Value                        |
| ------------------------ | ---------------------------- |
| `CommandID`              | `PayTaxToKRA`                |
| `SenderIdentifierType`   | `'4'`                        |
| `RecieverIdentifierType` | `'4'`                        |
| `PartyB` (default)       | `'572572'` (KRA's shortcode) |

### Sync response

```ts
interface TaxRemittanceResponse {
  OriginatorConversationID: string // save to correlate the async result
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
    "ResultType": "0",
    "ResultCode": "0",
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "AG_20240101_...",
    "ConversationID": "AG_20240101_...",
    "TransactionID": "OEI2AK4XXXX",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "Amount", "Value": "239.00" },
        { "Key": "TransactionCompletedTime", "Value": "20221110110717" },
        {
          "Key": "ReceiverPartyPublicName",
          "Value": "572572 - Kenya Revenue Authority"
        }
      ]
    }
  }
}
```

### Handling the result

```ts
import {
  isTaxRemittanceResult,
  isTaxRemittanceSuccess,
  isTaxRemittanceFailure,
  getTaxTransactionId,
  getTaxConversationId,
  getTaxOriginatorConversationId,
  getTaxResultCode,
  getTaxResultDesc,
  getTaxAmount,
  getTaxCompletedTime,
  getTaxReceiverName,
  getTaxResultParam,
  type TaxRemittanceResult,
} from 'pesafy'

app.post('/api/mpesa/tax/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body

  if (!isTaxRemittanceResult(body)) return

  if (isTaxRemittanceSuccess(body)) {
    const txId = getTaxTransactionId(body) // 'OEI2AK4XXXX'
    const origId = getTaxOriginatorConversationId(body)
    const amount = getTaxAmount(body) // number | null
    const time = getTaxCompletedTime(body) // 'YYYYMMDDHHmmss' | null
    const rcvr = getTaxReceiverName(body) // 'Kenya Revenue Authority' | null

    console.log(`Tax remitted: KES ${amount} to ${rcvr} — receipt ${txId}`)
    db.taxRemittances
      .markComplete({ origId, txId, amount })
      .catch(console.error)
  } else {
    const code = getTaxResultCode(body)
    const desc = getTaxResultDesc(body)
    console.error(`Tax remittance failed [${code}]: ${desc}`)
  }
})
```

## Helper functions

| Function                                 | Returns                         | Description                                                           |
| ---------------------------------------- | ------------------------------- | --------------------------------------------------------------------- |
| `isTaxRemittanceResult(body)`            | `body is TaxRemittanceResult`   | Runtime type guard                                                    |
| `isTaxRemittanceSuccess(result)`         | `boolean`                       | `true` when `ResultCode === 0` or `'0'`                               |
| `isTaxRemittanceFailure(result)`         | `boolean`                       | `true` when `ResultCode !== 0`                                        |
| `getTaxTransactionId(result)`            | `string`                        | M-PESA receipt number                                                 |
| `getTaxConversationId(result)`           | `string`                        | `ConversationID`                                                      |
| `getTaxOriginatorConversationId(result)` | `string`                        | `OriginatorConversationID`                                            |
| `getTaxResultCode(result)`               | `string \| number`              | Result code                                                           |
| `getTaxResultDesc(result)`               | `string`                        | Human-readable description                                            |
| `getTaxAmount(result)`                   | `number \| null`                | Remitted amount                                                       |
| `getTaxCompletedTime(result)`            | `string \| null`                | `TransactionCompletedTime` (YYYYMMDDHHmmss)                           |
| `getTaxReceiverName(result)`             | `string \| null`                | `ReceiverPartyPublicName` (e.g. `'572572 - Kenya Revenue Authority'`) |
| `getTaxResultParam(result, key)`         | `string \| number \| undefined` | Extract any `ResultParameter` by key                                  |

## Constants

```ts
import { KRA_SHORTCODE, TAX_COMMAND_ID } from 'pesafy'

console.log(KRA_SHORTCODE) // '572572'
console.log(TAX_COMMAND_ID) // 'PayTaxToKRA'
```

## Types

```ts
interface TaxRemittanceRequest {
  amount: number
  partyA: string
  accountReference: string // KRA PRN
  resultUrl: string
  queueTimeOutUrl: string
  partyB?: string // defaults to '572572' (KRA)
  remarks?: string
}

interface TaxRemittanceResponse {
  OriginatorConversationID: string
  ConversationID: string
  ResponseCode: string
  ResponseDescription: string
}

type TaxRemittanceResultParameterKey =
  | 'Amount'
  | 'TransactionCompletedTime'
  | 'ReceiverPartyPublicName'
  | (string & {})
```
