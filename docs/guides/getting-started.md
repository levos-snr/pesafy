# Getting Started with Pesafy

## Installation

```bash
bun add pesafy
# or
npm install pesafy
```

## Configuration

Create an M-Pesa client with your Daraja API credentials:

```typescript
import { Mpesa } from "pesafy";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox", // or "production"

  // For STK Push (Lipa Na M-Pesa):
  lipaNaMpesaShortCode: "174379",
  lipaNaMpesaPassKey: process.env.LIPA_NA_MPESA_PASSKEY!,

  // For B2C, B2B, Reversal (optional):
  initiatorName: "testapi",
  initiatorPassword: process.env.INITIATOR_PASSWORD!,
  certificatePem: process.env.MPESA_CERTIFICATE_PEM!, // or certificatePath
});
```

## STK Push (M-Pesa Express)

Initiate a payment on the customer's phone:

```typescript
const result = await mpesa.stkPush({
  amount: 100,
  phoneNumber: "254712345678",
  callbackUrl: "https://yourdomain.com/callback",
  accountReference: "ORDER-123",
  transactionDesc: "Payment for order",
});

console.log(result.CheckoutRequestID); // Use this to query status
```

## C2B (Customer to Business)

### Register URLs

Register validation and confirmation URLs for C2B payments:

```typescript
const result = await mpesa.c2bRegisterUrls({
  shortCode: "174379",
  confirmationUrl: "https://yoursite.com/c2b/confirmation",
  validationUrl: "https://yoursite.com/c2b/validation",
});
```

### Simulate Payment (Sandbox Only)

Simulate a C2B payment in sandbox environment:

```typescript
const result = await mpesa.c2bSimulate({
  shortCode: "174379",
  amount: 100,
  phoneNumber: "254712345678",
  billRefNumber: "ORDER-123",
});
```

## Transaction Status Query

Query the status of a transaction:

```typescript
const result = await mpesa.transactionStatus({
  shortCode: "174379",
  transactionId: "QGH4R5J1",
  resultUrl: "https://yoursite.com/transaction/result",
  timeoutUrl: "https://yoursite.com/transaction/timeout",
});
```

## Reversal

Reverse a transaction:

```typescript
const result = await mpesa.reversal({
  transactionId: "QGH4R5J1",
  amount: 100,
  shortCode: "174379",
  resultUrl: "https://yoursite.com/reversal/result",
  timeoutUrl: "https://yoursite.com/reversal/timeout",
  remarks: "Refund request",
});
```

## STK Query

Check the status of an STK Push:

```typescript
const status = await mpesa.stkQuery({
  checkoutRequestId: "ws_CO_...",
});
```

## B2C (Business to Customer)

Send money to a customer:

```typescript
await mpesa.b2c({
  amount: 500,
  phoneNumber: "254712345678",
  shortCode: "600000",
  resultUrl: "https://yourdomain.com/b2c/result",
  timeoutUrl: "https://yourdomain.com/b2c/timeout",
  commandId: "BusinessPayment",
  remarks: "Salary payment",
});
```

## C2B (Customer to Business)

Register URLs for receiving payments:

```typescript
await mpesa.c2bRegisterUrls({
  shortCode: "600000",
  confirmationUrl: "https://yourdomain.com/c2b/confirm",
  validationUrl: "https://yourdomain.com/c2b/validate",
});
```

## Dynamic QR Code

Generate a QR code for LIPA NA M-PESA:

```typescript
const qr = await mpesa.qrCode({
  merchantName: "My Store",
  refNo: "INV-001",
  amount: 500,
  trxCode: "BG",
  cpi: "174379",
  size: "300",
});

// qr.QRCode is base64 image data
```

## Webhooks

Configure your server to receive callbacks at the URLs you provide. Safaricom will send POST requests with transaction results. Whitelist these IPs: 196.201.214.200, 196.201.214.206, and others from the [Daraja documentation](https://developer.safaricom.co.ke).

## Error Handling

```typescript
import { Mpesa, PesafyError } from "pesafy";

try {
  await mpesa.stkPush({ ... });
} catch (error) {
  if (error instanceof PesafyError) {
    console.error(error.code, error.message);
    console.error(error.response); // API response if available
  }
  throw error;
}
```
