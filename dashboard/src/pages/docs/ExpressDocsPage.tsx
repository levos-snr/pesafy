export default function ExpressDocsPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Express SDK · Mpesa Express
      </h1>
      <p className="text-sm text-muted-foreground">
        Use the <code>pesafy</code> npm package to call Safaricom Daraja from
        your Node/Express backend, with proper OAuth, STK Push and C2B
        simulation.
      </p>
      <pre className="rounded-xl bg-muted p-4 text-xs overflow-x-auto">
        <code>{`npm install pesafy express cors

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
  environment: "sandbox",
  lipaNaMpesaShortCode: process.env.MPESA_LNM_SHORTCODE!,
  lipaNaMpesaPassKey: process.env.MPESA_LNM_PASSKEY!,
  callbackUrl: process.env.MPESA_CALLBACK_URL!,
};

const router = createMpesaExpressRouter(express.Router(), config);
app.use("/api", router);

app.listen(3001, () => {
  console.log("Pesafy Mpesa Express sandbox server on :3001");
});`}</code>
      </pre>
      <p className="text-xs text-muted-foreground">
        The router exposes <code>POST /api/mpesa/express/stk-push</code>,{" "}
        <code>/mpesa/express/stk-query</code>, <code>/mpesa/c2b/simulate</code>{" "}
        and <code>/mpesa/c2b/register-url</code> with request bodies matching
        the official Daraja documentation.
      </p>
    </div>
  );
}
