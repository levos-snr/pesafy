# Pesafy Vue Components

Reusable Vue 3 components for M-Pesa payment integration.

## Installation

```bash
npm install pesafy vue
```

**Note**: Vue components are distributed as source `.vue` files. Your bundler (Vite, Webpack, etc.) must be configured to handle `.vue` files. This is standard for Vue projects.

## Components

### PaymentButton

Simple button to trigger payment.

```vue
<template>
  <PaymentButton :amount="100" @pay="handlePay" />
</template>

<script setup>
import { PaymentButton } from "pesafy/components/vue";

const handlePay = async ({ amount }) => {
  // Call your backend API which uses Pesafy
  await fetch("/api/payments/stk-push", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
};
</script>
```

### PaymentForm

Complete form for collecting payment details.

```vue
<template>
  <PaymentForm @submit="handleSubmit" :default-amount="100" />
</template>

<script setup>
import { PaymentForm } from "pesafy/components/vue";

const handleSubmit = async (data) => {
  // data: { amount, phoneNumber, accountReference, transactionDesc }
  await fetch("/api/payments/stk-push", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
</script>
```

### QRCode

Display M-Pesa Dynamic QR code.

```vue
<template>
  <QRCode :base64="qrCode" :size="300" />
</template>

<script setup>
import { QRCode } from "pesafy/components/vue";

// After calling mpesa.qrCode() on backend
const qrCode = "iVBORw0KGgo..."; // Base64 from API
</script>
```

### PaymentStatus

Display payment status.

```vue
<template>
  <PaymentStatus status="pending" message="Waiting for payment confirmation" />
</template>

<script setup>
import { PaymentStatus } from "pesafy/components/vue";
</script>
```

## Security

**Never expose your Daraja API credentials in client-side code!**

Components call your backend API, which uses Pesafy with credentials.
