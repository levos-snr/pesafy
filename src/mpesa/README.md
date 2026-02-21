# M-Pesa Module

M-Pesa-specific API implementations for the Daraja API.

## Available APIs

### STK Push (`stk-push/`)

M-Pesa Express (STK Push) implementation for initiating payments via USSD.

### B2C (`b2c/`)

Business to Customer payments for sending money to customers.

### B2B (`b2b/`)

Business to Business payments for sending money between businesses.

### C2B (`c2b/`)

Customer to Business payments for receiving payments from customers.

### QR Code (`qr-code/`)

Dynamic QR code generation for LIPA NA M-PESA payments.

### Transaction Status (`transaction-status/`)

Query transaction status and details.

### Reversal (`reversal/`)

Reverse completed transactions.

### Webhooks (`webhooks/`)

Webhook handling and signature verification.

## Usage

```typescript
import { Pesafy } from 'pesafy';

const pesafy = new Pesafy(config);

// Use M-Pesa APIs
await pesafy.mpesa.stkPush({ ... });
await pesafy.mpesa.b2c({ ... });
await pesafy.mpesa.b2b({ ... });
```
