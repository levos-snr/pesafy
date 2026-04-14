# Dynamic QR Code

Generate a dynamic M-PESA QR code that customers can scan with the Safaricom App
or M-PESA App to pay instantly. The QR image is returned as a base64-encoded
PNG.

**Daraja endpoint:** `POST /mpesa/qrcode/v1/generate`  
**Type:** Synchronous — QR image returned immediately

## Prerequisites

```ts
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
})
```

No initiator credentials required.

## `generateDynamicQR()`

```ts
const response = await mpesa.generateDynamicQR({
  merchantName: 'Test Supermarket',
  refNo: 'INV-2024-001',
  amount: 500,
  trxCode: 'BG', // Buy Goods — till number
  cpi: '373132', // your till number
  size: 300, // QR image size in pixels (square)
})

// response.QRCode is a base64-encoded PNG
```

### Parameters

| Parameter      | Type                | Required | Description                                                                      |
| -------------- | ------------------- | -------- | -------------------------------------------------------------------------------- |
| `merchantName` | `string`            | ✅       | Your company or M-PESA merchant name shown in the payment prompt.                |
| `refNo`        | `string`            | ✅       | Transaction reference shown to the customer on their phone.                      |
| `amount`       | `number`            | ✅       | Amount in KES. Minimum 1. Fractional values are rounded.                         |
| `trxCode`      | `QRTransactionCode` | ✅       | Transaction type. See table below.                                               |
| `cpi`          | `string`            | ✅       | Credit Party Identifier — the destination of funds. Format depends on `trxCode`. |
| `size`         | `number`            | —        | QR image width and height in pixels (square). Range 1–1000. Defaults to `300`.   |

### Transaction codes

| `trxCode` | Full name                   | `cpi` value                      |
| --------- | --------------------------- | -------------------------------- |
| `'BG'`    | Pay Merchant — Buy Goods    | Till number                      |
| `'WA'`    | Withdraw Cash at Agent Till | Agent till number                |
| `'PB'`    | Paybill / Business number   | Paybill shortcode                |
| `'SM'`    | Send Money                  | Customer MSISDN (`254XXXXXXXXX`) |
| `'SB'`    | Send to Business            | Business number in MSISDN format |

### Response

```ts
interface DynamicQRResponse {
  ResponseCode: string // 'AG_...' (Daraja convention)
  RequestID: string // Daraja tracing ID
  ResponseDescription: string // 'QR Code Successfully Generated.'
  QRCode: string // base64-encoded PNG
}
```

## Rendering the QR code

### In a browser / React

```tsx
const { QRCode } = await mpesa.generateDynamicQR({ ... })

// Option 1: data URI
const src = `data:image/png;base64,${QRCode}`
return <img src={src} alt="M-PESA QR Code" width={300} height={300} />

// Option 2: Blob URL (avoids large attribute values)
const blob    = await (await fetch(`data:image/png;base64,${QRCode}`)).blob()
const blobUrl = URL.createObjectURL(blob)
```

### In Node.js / Bun

```ts
import { writeFileSync } from 'node:fs'

const { QRCode } = await mpesa.generateDynamicQR({ ... })
writeFileSync('mpesa-qr.png', Buffer.from(QRCode, 'base64'))
```

### Sending to a customer's receipt

```ts
// In an email (base64 inline image)
const imgTag = `<img src="data:image/png;base64,${QRCode}" />`

// In a PDF invoice (write to temp file, then include)
const tmpPath = '/tmp/mpesa-qr.png'
writeFileSync(tmpPath, Buffer.from(QRCode, 'base64'))
```

## Examples

### Buy Goods (Till)

```ts
const { QRCode } = await mpesa.generateDynamicQR({
  merchantName: 'My Shop',
  refNo: 'POS-TABLE-9',
  amount: 250,
  trxCode: 'BG',
  cpi: '373132', // your till number
  size: 400,
})
```

### Paybill

```ts
const { QRCode } = await mpesa.generateDynamicQR({
  merchantName: 'My Business',
  refNo: 'INV-2024-042',
  amount: 3_500,
  trxCode: 'PB',
  cpi: '174379', // your paybill shortcode
})
```

### Send Money (MSISDN)

```ts
const { QRCode } = await mpesa.generateDynamicQR({
  merchantName: 'Jane Doe',
  refNo: 'Personal transfer',
  amount: 1_000,
  trxCode: 'SM',
  cpi: '254712345678', // recipient MSISDN
})
```

## Validation

pesafy validates the entire request before sending to Daraja. You can also run
validation independently:

```ts
import {
  validateDynamicQRRequest,
  validateMerchantName,
  validateRefNo,
  validateAmount,
  validateTrxCode,
  validateCpi,
  validateSize,
  DEFAULT_QR_SIZE,
  MIN_QR_SIZE,
  MAX_QR_SIZE,
  MIN_AMOUNT,
} from 'pesafy'

// Validate a full request
const result = validateDynamicQRRequest(payload)
if (!result.valid) {
  console.error(result.errors)
  // {
  //   amount:      'amount must be at least 1 KES (got 0)',
  //   merchantName:'merchantName is required and must be a non-empty string',
  // }
}

// Validate individual fields
const amtErr = validateAmount(0) // 'amount must be at least 1 KES (got 0)'
const codeErr = validateTrxCode('XX') // 'trxCode must be one of: BG, WA, PB, SM, SB...'
const sizeErr = validateSize(2000) // 'size must not exceed 1000 pixels (got 2000)'
```

### Validation constraints

| Constant          | Value  | Description                         |
| ----------------- | ------ | ----------------------------------- |
| `MIN_AMOUNT`      | `1`    | Minimum KES amount                  |
| `MIN_QR_SIZE`     | `1`    | Minimum QR pixel size               |
| `MAX_QR_SIZE`     | `1000` | Maximum QR pixel size               |
| `DEFAULT_QR_SIZE` | `300`  | Default size when `size` is omitted |

## Error handling

```ts
import { PesafyError } from 'pesafy'

try {
  await mpesa.generateDynamicQR({ ... })
} catch (e) {
  if (e instanceof PesafyError) {
    // Common codes:
    // 'VALIDATION_ERROR' — bad request params (caught before HTTP call)
    // 'AUTH_FAILED'      — bad/expired token, or wrong HTTP method (404.001.04 / 400.003.01)
    // 'REQUEST_FAILED'   — Daraja returned an error (400.002.05)
    console.error(e.code, e.message)
  }
}
```

### Daraja error codes

| Code           | Description                                                                          |
| -------------- | ------------------------------------------------------------------------------------ |
| `'404.001.04'` | Invalid authentication header — check POST method and `Authorization: Bearer` header |
| `'400.002.05'` | Invalid request payload — check all required fields are present and correctly typed  |
| `'400.003.01'` | Invalid or expired access token                                                      |

## Types

```ts
type QRTransactionCode = 'BG' | 'WA' | 'PB' | 'SM' | 'SB'

const QR_TRANSACTION_CODES = ['BG', 'WA', 'PB', 'SM', 'SB'] as const

interface DynamicQRRequest {
  merchantName: string
  refNo: string
  amount: number
  trxCode: QRTransactionCode
  cpi: string
  size?: number // 1–1000, default 300
}

interface DynamicQRResponse {
  ResponseCode: string
  RequestID: string
  ResponseDescription: string
  QRCode: string // base64-encoded PNG
}

// Validation result types
type ValidationOk = { readonly valid: true }
type ValidationFail = {
  readonly valid: false
  readonly errors: Readonly<Record<string, string>>
}
type ValidationResult = ValidationOk | ValidationFail
```
