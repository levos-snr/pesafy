# Tax Remittance (KRA)

Remit tax to the Kenya Revenue Authority (KRA) via M-PESA. This is an **asynchronous** API — the sync response is an acknowledgement only. The remittance result is POSTed to your `resultUrl`.

::: info Prerequisites

- Prior integration with KRA for tax declaration and PRN generation.
- Your initiator must have the **"Tax Remittance ORG API"** role on the M-PESA org portal.
- A valid **Payment Registration Number (PRN)** issued by KRA.
  :::

## Usage

```ts
const response = await mpesa.remitTax({
  amount: 5000,
  partyA: '174379',
  accountReference: 'KRA-PRN-12345678',
  resultUrl: 'https://yourdomain.com/mpesa/tax/result',
  queueTimeOutUrl: 'https://yourdomain.com/mpesa/tax/timeout',
  remarks: 'Monthly VAT remittance',
})
```

## Parameters

| Parameter          | Type     | Required | Description                                                  |
| ------------------ | -------- | -------- | ------------------------------------------------------------ |
| `amount`           | `number` | ✅       | Amount to remit to KRA. Must be a whole number ≥ 1           |
| `partyA`           | `string` | ✅       | Your M-PESA business shortcode (money is deducted from this) |
| `accountReference` | `string` | ✅       | The KRA Payment Registration Number (PRN)                    |
| `resultUrl`        | `string` | ✅       | Public URL Safaricom POSTs the result to                     |
| `queueTimeOutUrl`  | `string` | ✅       | Public URL Safaricom calls on queue timeout                  |
| `partyB`           | `string` | —        | KRA shortcode — defaults to `"572572"`. Do not change.       |
| `remarks`          | `string` | —        | Short remarks (up to 100 characters)                         |

::: tip PartyB is always KRA
`partyB` is hardcoded to KRA's M-PESA shortcode `572572`. You don't need to set it.
:::

## Fixed API Values

The following Daraja fields are fixed by the Tax Remittance API spec and are set automatically:

| Daraja Field             | Fixed Value    |
| ------------------------ | -------------- |
| `CommandID`              | `PayTaxToKRA`  |
| `SenderIdentifierType`   | `4`            |
| `RecieverIdentifierType` | `4`            |
| `PartyB`                 | `572572` (KRA) |

## Sync Response

```json
{
  "OriginatorConversationID": "AG_20240101_...",
  "ConversationID": "AG_20240101_...",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

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
        {
          "Key": "DebitAccountBalance",
          "Value": "Working Account|KES|40000.00"
        },
        { "Key": "Amount", "Value": 5000 },
        { "Key": "TransCompletedTime", "Value": 20240101123456 },
        {
          "Key": "ReceiverPartyPublicName",
          "Value": "572572 - Kenya Revenue Authority"
        },
        { "Key": "Currency", "Value": "KES" }
      ]
    }
  }
}
```

### Handling the result

```ts
import type { TaxRemittanceResult } from 'pesafy'

// In your result webhook handler:
app.post('/mpesa/tax/result', (req, res) => {
  const body = req.body as TaxRemittanceResult
  const result = body.Result

  if (result.ResultCode === 0) {
    console.log('Tax remitted successfully:', result.TransactionID)

    const params = result.ResultParameters?.ResultParameter ?? []
    const get = (key: string) => params.find((p) => p.Key === key)?.Value

    console.log('Amount remitted:', get('Amount'))
    console.log('Completed at:', get('TransCompletedTime'))
  } else {
    console.warn('Tax remittance failed:', result.ResultDesc)
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})
```

## Constants

```ts
import { KRA_SHORTCODE, TAX_COMMAND_ID } from 'pesafy'

console.log(KRA_SHORTCODE) // "572572"
console.log(TAX_COMMAND_ID) // "PayTaxToKRA"
```

## Error Handling

```ts
import { PesafyError } from 'pesafy'

try {
  await mpesa.remitTax({ ... })
} catch (e) {
  if (e instanceof PesafyError) {
    console.error(e.code, e.message)
  }
}
```

## Types

```ts
interface TaxRemittanceRequest {
  amount: number
  partyA: string
  accountReference: string
  resultUrl: string
  queueTimeOutUrl: string
  partyB?: string
  remarks?: string
}

interface TaxRemittanceResponse {
  OriginatorConversationID: string
  ConversationID: string
  ResponseCode: string
  ResponseDescription: string
}
```
