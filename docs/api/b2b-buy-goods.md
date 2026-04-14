# B2B Buy Goods

Move funds from your MMF/Working account to a merchant's till number or merchant
store. This is a shortcode-to-shortcode payment where the debit and credit
parties are both identified by `"4"` (Organisation ShortCode).

**Daraja endpoint:** `POST /mpesa/b2b/v1/paymentrequest`  
**CommandID:** `BusinessBuyGoods` (only supported value)  
**Type:** Asynchronous — result POSTed to `resultUrl`

::: info Required role Your initiator must have a B2B Buy Goods API initiator
role on the M-PESA org portal. :::

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

## `b2bBuyGoods()`

```ts
const response = await mpesa.b2bBuyGoods({
  commandId: 'BusinessBuyGoods',
  amount: 10_000,
  partyA: '123456', // your shortcode (debited)
  partyB: '000000', // merchant till / store number (credited)
  accountReference: '353353', // up to 13 characters
  resultUrl: 'https://yourdomain.com/api/mpesa/b2b/buy-goods/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2b/buy-goods/timeout',
  remarks: 'Stock purchase',
  requester: '254712345678', // consumer MSISDN (optional)
})
```

### Parameters

| Parameter          | Type                 | Required | Description                                                                                                      |
| ------------------ | -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `commandId`        | `'BusinessBuyGoods'` | ✅       | Must be exactly `'BusinessBuyGoods'`.                                                                            |
| `amount`           | `number`             | ✅       | Amount in KES. Minimum 1. Fractional values are rounded. Sent as a string in the payload per Daraja spec.        |
| `partyA`           | `string`             | ✅       | Your shortcode from which money is deducted. `SenderIdentifierType` is always `"4"`.                             |
| `partyB`           | `string`             | ✅       | Merchant till number, merchant store number, or Merchant HO to credit. `RecieverIdentifierType` is always `"4"`. |
| `accountReference` | `string`             | ✅       | Account number associated with the payment. Truncated to 13 characters per Daraja docs.                          |
| `resultUrl`        | `string`             | ✅       | Public URL Safaricom POSTs the result to.                                                                        |
| `queueTimeOutUrl`  | `string`             | ✅       | Public URL called on queue timeout.                                                                              |
| `remarks`          | `string`             | —        | Additional info. Defaults to `'Business Buy Goods'`.                                                             |
| `requester`        | `string`             | —        | Consumer MSISDN on whose behalf you are paying (`254XXXXXXXXX`).                                                 |
| `occasion`         | `string`             | —        | Additional occasion info.                                                                                        |

::: info Fixed identifier types Both `SenderIdentifierType` and
`RecieverIdentifierType` are hardcoded to `"4"` (Organisation ShortCode) per
Daraja docs and cannot be changed. :::

### Sync response

```ts
interface B2BBuyGoodsResponse {
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
    "OriginatorConversationID": "5118-111210482-1",
    "ConversationID": "AG_20230420_...",
    "TransactionID": "QKA81LK5CY",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "Amount", "Value": "10000.00" },
        { "Key": "TransCompletedTime", "Value": "20221110110717" },
        {
          "Key": "ReceiverPartyPublicName",
          "Value": "000000 - Merchant Store Name"
        },
        { "Key": "Currency", "Value": "KES" },
        {
          "Key": "DebitPartyAffectedAccountBalance",
          "Value": "Working Account|KES|346568.83|..."
        },
        {
          "Key": "DebitAccountBalance",
          "Value": "{Amount={CurrencyCode=KES, ...}}"
        },
        { "Key": "DebitPartyCharges", "Value": "" },
        {
          "Key": "InitiatorAccountCurrentBalance",
          "Value": "{Amount={CurrencyCode=KES, ...}}"
        }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": [
        { "Key": "BillReferenceNumber", "Value": "353353" },
        { "Key": "QueueTimeoutURL", "Value": "https://..." }
      ]
    }
  }
}
```

### Handling the result

```ts
import {
  isB2BBuyGoodsResult,
  isB2BBuyGoodsSuccess,
  isB2BBuyGoodsFailure,
  isKnownB2BBuyGoodsResultCode,
  getB2BBuyGoodsTransactionId,
  getB2BBuyGoodsConversationId,
  getB2BBuyGoodsOriginatorConversationId,
  getB2BBuyGoodsResultCode,
  getB2BBuyGoodsResultDesc,
  getB2BBuyGoodsAmount,
  getB2BBuyGoodsCompletedTime,
  getB2BBuyGoodsReceiverName,
  getB2BBuyGoodsDebitPartyCharges,
  getB2BBuyGoodsCurrency,
  getB2BBuyGoodsDebitPartyAffectedBalance,
  getB2BBuyGoodsDebitAccountBalance,
  getB2BBuyGoodsInitiatorBalance,
  getB2BBuyGoodsBillReferenceNumber,
  getB2BBuyGoodsQueueTimeoutUrl,
} from 'pesafy'

app.post('/api/mpesa/b2b/buy-goods/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body

  if (!isB2BBuyGoodsResult(body)) return

  if (isB2BBuyGoodsSuccess(body)) {
    const txId = getB2BBuyGoodsTransactionId(body) // 'QKA81LK5CY'
    const origId = getB2BBuyGoodsOriginatorConversationId(body) // correlate with request
    const amount = getB2BBuyGoodsAmount(body) // number | null
    const merchant = getB2BBuyGoodsReceiverName(body) // '000000 - Merchant' | null
    const time = getB2BBuyGoodsCompletedTime(body) // 'YYYYMMDDHHmmss' | null
    const currency = getB2BBuyGoodsCurrency(body) // 'KES'
    const charges = getB2BBuyGoodsDebitPartyCharges(body) // string | null
    const billRef = getB2BBuyGoodsBillReferenceNumber(body) // from ReferenceData | null
    const balance = getB2BBuyGoodsDebitPartyAffectedBalance(body) // pipe-delimited | null

    db.purchases.record({ txId, origId, amount, merchant }).catch(console.error)
  } else {
    const code = getB2BBuyGoodsResultCode(body)
    const desc = getB2BBuyGoodsResultDesc(body)
    console.error(`B2B Buy Goods failed [${code}]: ${desc}`)
  }
})
```

## Helper functions

| Function                                          | Returns                         | Description                                         |
| ------------------------------------------------- | ------------------------------- | --------------------------------------------------- |
| `isB2BBuyGoodsResult(body)`                       | `body is B2BBuyGoodsResult`     | Runtime type guard                                  |
| `isB2BBuyGoodsSuccess(result)`                    | `boolean`                       | `true` when `ResultCode === 0` or `'0'`             |
| `isB2BBuyGoodsFailure(result)`                    | `boolean`                       | `true` when `ResultCode !== 0`                      |
| `isKnownB2BBuyGoodsResultCode(code)`              | `boolean`                       | `true` for a documented result code                 |
| `getB2BBuyGoodsTransactionId(result)`             | `string`                        | M-PESA receipt number                               |
| `getB2BBuyGoodsConversationId(result)`            | `string`                        | `ConversationID`                                    |
| `getB2BBuyGoodsOriginatorConversationId(result)`  | `string`                        | Your `OriginatorConversationID`                     |
| `getB2BBuyGoodsResultCode(result)`                | `string \| number`              | Result code                                         |
| `getB2BBuyGoodsResultDesc(result)`                | `string`                        | Human-readable description                          |
| `getB2BBuyGoodsAmount(result)`                    | `number \| null`                | Transaction amount                                  |
| `getB2BBuyGoodsCompletedTime(result)`             | `string \| null`                | `TransCompletedTime` (YYYYMMDDHHmmss)               |
| `getB2BBuyGoodsReceiverName(result)`              | `string \| null`                | `ReceiverPartyPublicName`                           |
| `getB2BBuyGoodsDebitPartyCharges(result)`         | `string \| null`                | `DebitPartyCharges` (null when no charge)           |
| `getB2BBuyGoodsCurrency(result)`                  | `string`                        | `Currency` (defaults to `'KES'`)                    |
| `getB2BBuyGoodsDebitPartyAffectedBalance(result)` | `string \| null`                | `DebitPartyAffectedAccountBalance` (pipe-delimited) |
| `getB2BBuyGoodsDebitAccountBalance(result)`       | `string \| null`                | `DebitAccountBalance` (JSON-like string)            |
| `getB2BBuyGoodsInitiatorBalance(result)`          | `string \| null`                | `InitiatorAccountCurrentBalance`                    |
| `getB2BBuyGoodsBillReferenceNumber(result)`       | `string \| null`                | `BillReferenceNumber` from `ReferenceData`          |
| `getB2BBuyGoodsQueueTimeoutUrl(result)`           | `string \| null`                | `QueueTimeoutURL` from `ReferenceData`              |
| `getB2BBuyGoodsResultParam(result, key)`          | `string \| number \| undefined` | Extract any `ResultParameter` by key                |

## Result codes

| Code   | Meaning                                      |
| ------ | -------------------------------------------- |
| `0`    | Transaction processed successfully           |
| `1`    | Insufficient balance                         |
| `2`    | Amount below minimum transaction value       |
| `3`    | Amount above maximum transaction value       |
| `4`    | Would exceed daily transaction limit         |
| `8`    | Would exceed maximum account balance         |
| `2001` | Initiator information invalid                |
| `2006` | Account inactive                             |
| `2028` | Product not permitted for this shortcode     |
| `2040` | Receiver is not a registered M-PESA customer |

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
type B2BBuyGoodsCommandID = 'BusinessBuyGoods'

interface B2BBuyGoodsRequest {
  commandId: B2BBuyGoodsCommandID
  amount: number
  partyA: string
  partyB: string
  accountReference: string
  resultUrl: string
  queueTimeOutUrl: string
  remarks?: string
  requester?: string // 254XXXXXXXXX
  occasion?: string
}

interface B2BBuyGoodsResponse {
  OriginatorConversationID: string
  ConversationID: string
  ResponseCode: string
  ResponseDescription: string
}

const B2B_BUY_GOODS_RESULT_CODES = {
  SUCCESS: 0,
  INSUFFICIENT_FUNDS: 1,
  AMOUNT_TOO_SMALL: 2,
  AMOUNT_TOO_LARGE: 3,
  DAILY_LIMIT_EXCEEDED: 4,
  MAX_BALANCE_EXCEEDED: 8,
  INVALID_INITIATOR_INFO: 2001,
  ACCOUNT_INACTIVE: 2006,
  PRODUCT_NOT_PERMITTED: 2028,
  CUSTOMER_NOT_REGISTERED: 2040,
} as const
```
