# API Reference

All APIs are accessed through the `Mpesa` class. Instantiate once and reuse:

```ts
import { Mpesa } from 'pesafy'

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  // ... other options
})
```

## API Overview

### Synchronous APIs (respond immediately)

| Method                                              | Description                                        |
| --------------------------------------------------- | -------------------------------------------------- |
| [`mpesa.stkPush()`](/api/stk-push)                  | Send a payment prompt to a customer's phone        |
| [`mpesa.stkQuery()`](/api/stk-push#stk-query)       | Check if an STK Push was paid                      |
| [`mpesa.stkPushSafe()`](/api/stk-push#safe-variant) | STK Push returning `Result<T>` instead of throwing |
| [`mpesa.generateDynamicQR()`](/api/dynamic-qr)      | Generate an M-PESA QR code                         |
| [`mpesa.registerC2BUrls()`](/api/c2b)               | Register Confirmation + Validation URLs            |
| [`mpesa.simulateC2B()`](/api/c2b#simulate)          | Simulate a C2B payment (sandbox only)              |
| [`mpesa.b2bExpressCheckout()`](/api/b2b)            | USSD Push to a merchant's till                     |

### Asynchronous APIs (result POSTed to your ResultURL) <Badge type="warning" text="Async" />

| Method                                                 | Description                                   |
| ------------------------------------------------------ | --------------------------------------------- |
| [`mpesa.b2cPayment()`](/api/b2c)                       | Send money to customers or load B2C shortcode |
| [`mpesa.accountBalance()`](/api/account-balance)       | Query shortcode balance                       |
| [`mpesa.transactionStatus()`](/api/transaction-status) | Query any completed transaction               |
| [`mpesa.reverseTransaction()`](/api/reversal)          | Reverse a completed transaction               |
| [`mpesa.remitTax()`](/api/tax-remittance)              | Remit tax to KRA                              |

### Bill Manager APIs

| Method                                                        | Description                       |
| ------------------------------------------------------------- | --------------------------------- |
| [`mpesa.billManagerOptIn()`](/api/bill-manager)               | Opt-in shortcode for Bill Manager |
| [`mpesa.sendInvoice()`](/api/bill-manager#single-invoice)     | Send a single invoice             |
| [`mpesa.sendBulkInvoices()`](/api/bill-manager#bulk-invoices) | Send up to 1,000 invoices         |
| [`mpesa.cancelInvoice()`](/api/bill-manager#cancel-invoice)   | Cancel an issued invoice          |

## Utilities

```ts
import {
  formatSafaricomPhone, // phone normalisation
  encryptSecurityCredential, // RSA encryption
  verifyWebhookIP, // IP whitelist check
  SAFARICOM_IPS, // official IP list
  retryWithBackoff, // exponential backoff helper
  isPesafyError, // type guard
} from 'pesafy'
```
