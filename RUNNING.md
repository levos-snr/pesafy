# Pesafy - How to Run & Test

This guide covers running and testing **Pesafy** as both a **library** (npm package) and **SaaS** (Dashboard).

---

## Prerequisites

- **Bun** >= 1.0.0 ([install](https://bun.sh))
- **Node.js** >= 18 (optional, for npm users)

---

## 1. Library (npm package)

### Build

```bash
cd /home/levos_snr/Dev/pesafy
bun install
bun run build
```

### Run Tests

```bash
bun test
```

### Type Check

```bash
bun run typecheck
```

### Use as Library

After publishing to npm:

```bash
npm install pesafy
# or
bun add pesafy
```

```typescript
import { Mpesa } from "pesafy";

const mpesa = new Mpesa({
  consumerKey: "your-key",
  consumerSecret: "your-secret",
  environment: "sandbox",
});

const result = await mpesa.stkPush({ ... });
```

---

## 2. Dashboard (SaaS)

The Dashboard is a standalone app for monitoring payments and managing webhooks.

### Run Dashboard

```bash
cd dashboard
bun install
bun run dev
```

Dashboard runs on **http://localhost:3000** (or `PORT` env var).

### Test as User

1. Open http://localhost:3000 in your browser
2. You should see:
   - **Pesafy Dashboard** header (green)
   - **Payment Transactions** section
   - **Refresh** button
   - "No payments yet" (until you connect M-Pesa API)
3. Click **Refresh** – it fetches from `/api/payments`
4. API returns `{ payments: [] }` by default (no backend/database yet)

### API Endpoints

| Endpoint        | Method | Description    |
| --------------- | ------ | -------------- |
| `/`             | GET    | Dashboard UI   |
| `/api/payments` | GET    | List payments  |
| `/api/webhooks` | GET    | List webhooks  |
| `/api/webhooks` | POST   | Create webhook |

### Custom Port

```bash
PORT=3001 bun run dev
```

---

## 3. Phase Verification Checklist

### Phase 1 ✅

- [x] Project structure
- [x] Build (tsup)
- [x] CI/CD (npm-publish.yml)
- [x] Tests

### Phase 2 ✅

- [x] STK Push, STK Query
- [x] B2C, B2B, C2B
- [x] Dynamic QR, Transaction Status, Reversal
- [x] Auth, Encryption, HTTP client

### Phase 3 ✅

- [x] Webhook types & parsing
- [x] IP verification
- [x] Retry with backoff

### Phase 4 ✅

- [x] Dashboard server
- [x] Payment UI
- [x] API routes

### Phase 5 ✅

- [x] React components (PaymentButton, PaymentForm, QRCode, PaymentStatus)
- [x] Vue components
- [x] Component docs

---

## 4. Quick Test Commands

```bash
# From project root
bun run build    # Build library
bun test         # Run tests
bun run typecheck # Type check

# Dashboard
cd dashboard && bun run dev   # Start dashboard
curl http://localhost:3000/api/payments  # Test API
```

---

## 5. NPM Publishing

```bash
# Tag and push to trigger publish
git tag v0.0.1
git push origin v0.0.1
```

Requires `NPM_TOKEN` secret in GitHub.

---

## 6. Dashboard + Library Integration (Future)

To connect the Dashboard to real M-Pesa data:

1. Add a database (SQLite/Postgres) for payments
2. Add webhook endpoint that receives Daraja callbacks
3. Use `pesafy` library in API routes to process payments
4. Store credentials securely (env vars)

The Dashboard UI is ready; it needs a backend with persistence.
