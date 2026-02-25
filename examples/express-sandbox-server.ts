import cors from "cors";
import express from "express";

import { createMpesaExpressRouter, type MpesaExpressConfig } from "pesafy";

const app = express();
app.use(cors());
app.use(express.json());

const config: MpesaExpressConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY ?? "",
  consumerSecret: process.env.MPESA_CONSUMER_SECRET ?? "",
  environment: "sandbox",
  lipaNaMpesaShortCode: process.env.MPESA_LNM_SHORTCODE,
  lipaNaMpesaPassKey: process.env.MPESA_LNM_PASSKEY,
  callbackUrl:
    process.env.MPESA_CALLBACK_URL ??
    "https://your-domain.example.com/api/mpesa/express/callback",
};

const router = createMpesaExpressRouter(express.Router(), config);

app.use("/api", router);

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

app.listen(port, () => {
  console.log(`Pesafy Mpesa Express sandbox server running on :${port}`);
});
