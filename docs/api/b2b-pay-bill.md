# B2B Pay Bill

Move funds from your MMF/Working account to a recipient's utility account
(Paybill shortcode). This is shortcode-to-shortcode, similar to a business
paying another business's Paybill.

**Daraja endpoint:** `POST /mpesa/b2b/v1/paymentrequest`  
**CommandID:** `BusinessPayBill` (only supported value)  
**Type:** Asynchronous — result POSTed to `resultUrl`

::: info Required role Your initiator must have a B2B Pay Bill API initiator
role on the M-PESA org portal. :::

::: tip B2B Pay Bill vs B2B Buy Goods Both use the same Daraja endpoint
(`/mpesa/b2b/v1/paymentrequest`) but different `commandId` values:

- **[B2B Buy Goods](./b2b-buy-goods)** — `BusinessBuyGoods` — credits a merchant
  till / store account
- **B2B Pay Bill** (this page) — `BusinessPayBill` — credits a Paybill utility
  account :::

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

## `b2bPayBill()`

```ts
const response = await mpesa.b2bPayBill({
  commandId: 'BusinessPayBill',
  amount: 50_000,
  partyA: '123456', // your shortcode (debited)
  partyB: '000000', // recipient Paybill shortcode (credited)
  accountReference: '353353', // account number — up to 13 characters
  resultUrl: 'https://yourdomain.com/api/mpesa/b2b/pay-bill/result',
  queueTimeOutUrl: 'https://yourdomain.com/api/mpesa/b2b/pay-bill/timeout',
  remarks: 'Invoice settlement',
  requester: '254712345678', // consumer MSISDN (optional)
})
```

### Parameters

| Parameter          | Type                | Required | Description                                                                              |
| ------------------ | ------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `commandId`        | `'BusinessPayBill'` | ✅       | Must be exactly `'BusinessPayBill'`.                                                     |
| `amount`           | `number`            | ✅       | Amount in KES. Minimum 1. Fractional values are rounded. Sent as string per Daraja spec. |
| `partyA`           | `string`            | ✅       | Your shortcode from which money is deducted. `SenderIdentifierType` always `"4"`.        |
| `partyB`           | `string`            | ✅       | Recipient Paybill shortcode credited. `RecieverIdentifierType` always `"4"`.             |
| `accountReference` | `string`            | ✅       | Account number for this payment. Truncated to 13 characters.                             |
| `resultUrl`        | `string`            | ✅       | Public URL Safaricom POSTs the result to.                                                |
| `queueTimeOutUrl`  | `string`            | ✅       | Public URL called on queue timeout.                                                      |
| `remarks`          | `string`            | —        | Additional info. Defaults to `'Business Pay Bill'`.                                      |
| `requester`        | `string`            | —        | Consumer MSISDN on whose behalf the payment is made (`254XXXXXXXXX`).                    |
| `occasion`         | `string`            | —        | Additional occasion string.                                                              |

::: info Fixed identifier types Both `SenderIdentifierType` and
`RecieverIdentifierType` are hardcoded to `"4"` per Daraja docs. :::

### Sync response

```ts
interface B2BPayBillResponse {
  OriginatorConversationID: string
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
    "ConversationID": "AG_20221110_...",
    "TransactionID": "QKA81LK5CY",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "Amount", "Value": "50000.00" },
        { "Key": "TransCompletedTime", "Value": "20221110110717" },
        {
          "Key": "ReceiverPartyPublicName",
          "Value": "000000 - Recipient Business"
        },
        { "Key": "Currency", "Value": "KES" },
        {
          "Key": "DebitPartyAffectedAccountBalance",
          "Value": "Working Account|KES|950000.00|..."
        },
        {
          "Key": "DebitAccountCurrentBalance",
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
      "ReferenceItem": [{ "Key": "BillReferenceNumber", "Value": "353353" }]
    }
  }
}
```

### Handling the result

```ts
import {
  isB2BPayBillResult,
  isB2BPayBillSuccess,
  isB2BPayBillFailure,
  isKnownB2BPayBillResultCode,
  getB2BPayBillTransactionId,
  getB2BPayBillConversationId,
  getB2BPayBillOriginatorConversationId,
  getB2BPayBillResultCode,
  getB2BPayBillResultDesc,
  getB2BPayBillAmount,
  getB2BPayBillCompletedTime,
  getB2BPayBillReceiverName,
  getB2BPayBillDebitPartyCharges,
  getB2BPayBillCurrency,
  getB2BPayBillDebitPartyAffectedBalance,
  getB2BPayBillDebitAccountBalance,
  getB2BPayBillInitiatorBalance,
  getB2BPayBillBillReferenceNumber,
} from 'pesafy'

app.post('/api/mpesa/b2b/pay-bill/result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const body = req.body

  if (!isB2BPayBillResult(body)) return

  if (isB2BPayBillSuccess(body)) {
    const txId = getB2BPayBillTransactionId(body) // 'QKA81LK5CY'
    const origId = getB2BPayBillOriginatorConversationId(body)
    const amount = getB2BPayBillAmount(body) // number | null
    const receiver = getB2BPayBillReceiverName(body) // '000000 - Recipient' | null
    const time = getB2BPayBillCompletedTime(body) // 'YYYYMMDDHHmmss' | null
    const currency = getB2BPayBillCurrency(body) // 'KES'
    const billRef = getB2BPayBillBillReferenceNumber(body) // from ReferenceData | null
    const charges = getB2BPayBillDebitPartyCharges(body) // string | null
    const balance = getB2BPayBillDebitPartyAffectedBalance(body)

    db.invoices.markSettled({ txId, origId, amount }).catch(console.error)
  } else {
    const code = getB2BPayBillResultCode(body)
    const desc = getB2BPayBillResultDesc(body)
    console.error(`B2B Pay Bill failed [${code}]: ${desc}`)
  }
})
```

## Helper functions

| Function                                         | Returns                         | Description                                |
| ------------------------------------------------ | ------------------------------- | ------------------------------------------ |
| `isB2BPayBillResult(body)`                       | `body is B2BPayBillResult`      | Runtime type guard                         |
| `isB2BPayBillSuccess(result)`                    | `boolean`                       | `true` when `ResultCode === 0` or `'0'`    |
| `isB2BPayBillFailure(result)`                    | `boolean`                       | `true` when `ResultCode !== 0`             |
| `isKnownB2BPayBillResultCode(code)`              | `boolean`                       | `true` for a documented result code        |
| `getB2BPayBillTransactionId(result)`             | `string`                        | M-PESA receipt number                      |
| `getB2BPayBillConversationId(result)`            | `string`                        | `ConversationID`                           |
| `getB2BPayBillOriginatorConversationId(result)`  | `string`                        | Your `OriginatorConversationID`            |
| `getB2BPayBillResultCode(result)`                | `string \| number`              | Result code                                |
| `getB2BPayBillResultDesc(result)`                | `string`                        | Human-readable description                 |
| `getB2BPayBillAmount(result)`                    | `number \| null`                | Transaction amount                         |
| `getB2BPayBillCompletedTime(result)`             | `string \| null`                | `TransCompletedTime` (YYYYMMDDHHmmss)      |
| `getB2BPayBillReceiverName(result)`              | `string \| null`                | `ReceiverPartyPublicName`                  |
| `getB2BPayBillDebitPartyCharges(result)`         | `string \| null`                | `DebitPartyCharges`                        |
| `getB2BPayBillCurrency(result)`                  | `string`                        | `Currency` (defaults to `'KES'`)           |
| `getB2BPayBillDebitPartyAffectedBalance(result)` | `string \| null`                | `DebitPartyAffectedAccountBalance`         |
| `getB2BPayBillDebitAccountBalance(result)`       | `string \| null`                | `DebitAccountCurrentBalance`               |
| `getB2BPayBillInitiatorBalance(result)`          | `string \| null`                | `InitiatorAccountCurrentBalance`           |
| `getB2BPayBillBillReferenceNumber(result)`       | `string \| null`                | `BillReferenceNumber` from `ReferenceData` |
| `getB2BPayBillResultParam(result, key)`          | `string \| number \| undefined` | Extract any `ResultParameter` by key       |

## Result codes

| Code   | Meaning                                   |
| ------ | ----------------------------------------- |
| `0`    | Transaction processed successfully        |
| `1`    | Insufficient balance                      |
| `2`    | Amount below minimum                      |
| `3`    | Amount above maximum                      |
| `4`    | Daily limit exceeded                      |
| `8`    | Would exceed maximum account balance      |
| `2001` | Initiator information invalid             |
| `2006` | Account inactive                          |
| `2028` | Product not permitted                     |
| `2040` | Receiver not a registered M-PESA customer |

## Types

```ts
type B2BPayBillCommandID = 'BusinessPayBill'

interface B2BPayBillRequest {
  commandId: B2BPayBillCommandID
  amount: number
  partyA: string
  partyB: string
  accountReference: string
  resultUrl: string
  queueTimeOutUrl: string
  remarks?: string
  requester?: string
  occasion?: string
}

const B2B_PAY_BILL_RESULT_CODES = {
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
