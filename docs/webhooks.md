# Webhook Handling

Pesafy provides utilities for handling webhooks from Daraja API.

## IP Whitelisting

Safaricom sends webhooks from specific IP addresses. Always verify:

```typescript
import { verifyWebhookIP } from "pesafy";

// In your webhook endpoint
const requestIP = req.headers.get("x-forwarded-for") || req.ip;

if (!verifyWebhookIP(requestIP)) {
  return Response.json({ error: "Unauthorized" }, { status: 403 });
}
```

## Handling Webhooks

```typescript
import { handleWebhook, extractTransactionId, extractAmount } from "pesafy";

export async function POST(req: Request) {
  const body = await req.json();
  const requestIP = req.headers.get("x-forwarded-for") || "unknown";

  const result = handleWebhook(body, {
    requestIP,
    skipIPCheck: false, // Set true only for testing
  });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const transactionId = extractTransactionId(result.data);
  const amount = extractAmount(result.data);

  // Process webhook based on eventType
  switch (result.eventType) {
    case "stk_push":
      // Handle STK Push result
      break;
    case "b2c":
      // Handle B2C result
      break;
    case "c2b":
      // Handle C2B payment
      break;
  }

  return Response.json({ success: true });
}
```

## Retry Mechanism

For reliable webhook delivery:

```typescript
import { retryWithBackoff } from "pesafy";

async function processWebhook(webhookData: unknown) {
  const result = await retryWithBackoff(
    async () => {
      // Your webhook processing logic
      await saveToDatabase(webhookData);
      await sendNotification(webhookData);
    },
    {
      maxRetries: 10,
      initialDelay: 1000,
      maxDelay: 3600000, // 1 hour
      backoffMultiplier: 2,
    },
  );

  if (!result.success) {
    // Log for manual retry
    console.error("Webhook processing failed:", result.error);
  }
}
```

## Webhook Types

- **STK Push**: Payment confirmation from M-Pesa Express
- **B2C**: Business to Customer payment result
- **B2B**: Business to Business payment result
- **C2B**: Customer to Business payment notification
- **Transaction Status**: Query result
- **Reversal**: Reversal confirmation
