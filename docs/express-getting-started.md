# Express Integration with Pesafy

## Install

```bash
npm install pesafy express cors
```

## Configure Mpesa Express client

```ts
import express from "express";
import cors from "cors";
import {
  createMpesaExpressRouter,
  type MpesaExpressConfig,
} from "pesafy";

const app = express();
app.use(cors());
app.use(express.json());

const config: MpesaExpressConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox", // or "production"
  lipaNaMpesaShortCode: process.env.MPESA_LNM_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_LNM_PASSKEY!,
  callbackUrl: process.env.MPESA_CALLBACK_URL!,
};

const router = createMpesaExpressRouter(express.Router(), config);
app.use("/api", router);

app.listen(3001, () => {
  console.log("Pesafy Mpesa Express sandbox server on :3001");
});
```

This exposes:

- `POST /api/mpesa/express/stk-push`
- `POST /api/mpesa/express/stk-query`
- `POST /api/mpesa/c2b/simulate`
- `POST /api/mpesa/c2b/register-url`

All request/response fields follow the official Safaricom Daraja documentation for Authorization, STK Push, STK Query and C2B Simulate.

