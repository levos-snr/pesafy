/**
 * Express-friendly helpers for Daraja APIs.
 *
 * Attaches handlers to an existing Express Router:
 *   POST /mpesa/express/stk-push          — initiate STK Push
 *   POST /mpesa/express/stk-query         — check STK Push status
 *   POST /mpesa/express/callback          — receive STK Push callback from Safaricom
 *   POST /mpesa/transaction-status/query  — query M-Pesa transaction
 *   POST /mpesa/transaction-status/result — receive Transaction Status result from Safaricom
 *
 * NOTE: This module does NOT import Express at runtime.
 * Pass in an existing Express Router and it attaches handlers.
 */

import type { NextFunction, Request, Response, Router } from "express";
import { Mpesa } from "../mpesa";
import type { MpesaConfig } from "../mpesa/types";
import {
  extractAmount,
  extractPhoneNumber,
  extractTransactionId,
  handleWebhook,
  isSuccessfulCallback,
} from "../mpesa/webhooks";
import { PesafyError } from "../utils/errors";

// ── Config ────────────────────────────────────────────────────────────────────

export interface MpesaExpressConfig extends MpesaConfig {
  /**
   * Full public URL Safaricom will POST STK Push callbacks to.
   * @example "https://your-domain.ngrok.io/api/mpesa/express/callback"
   */
  callbackUrl: string;

  /**
   * Full public URL Safaricom will POST Transaction Status results to.
   * Required when using transactionStatus routes.
   * @example "https://your-domain.ngrok.io/api/mpesa/transaction-status/result"
   */
  resultUrl?: string;

  /**
   * Full public URL Safaricom calls on queue timeout.
   * @example "https://your-domain.ngrok.io/api/mpesa/transaction-status/timeout"
   */
  queueTimeOutUrl?: string;

  /**
   * Skip Safaricom IP verification on callback routes.
   * ONLY set true in local development — never in production.
   */
  skipIPCheck?: boolean;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createMpesaExpressClient(config: MpesaExpressConfig): {
  mpesa: Mpesa;
} {
  if (!config.consumerKey || !config.consumerSecret) {
    throw new PesafyError({
      code: "INVALID_CREDENTIALS",
      message: "consumerKey and consumerSecret are required",
    });
  }
  if (!config.lipaNaMpesaShortCode || !config.lipaNaMpesaPassKey) {
    throw new PesafyError({
      code: "VALIDATION_ERROR",
      message:
        "lipaNaMpesaShortCode and lipaNaMpesaPassKey are required for STK Push",
    });
  }
  if (!config.callbackUrl) {
    throw new PesafyError({
      code: "VALIDATION_ERROR",
      message: "callbackUrl is required for STK Push callbacks",
    });
  }
  return { mpesa: new Mpesa(config) };
}

// ── Request body shapes ───────────────────────────────────────────────────────

interface StkPushBody {
  amount: number;
  phoneNumber: string;
  accountReference?: string;
  transactionDesc?: string;
  /** "CustomerPayBillOnline" | "CustomerBuyGoodsOnline" */
  transactionType?: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
  /** Till number for Buy Goods (overrides shortCode as PartyB) */
  partyB?: string;
}

interface StkQueryBody {
  checkoutRequestId: string;
}

interface TransactionStatusBody {
  transactionId: string;
  partyA: string;
  identifierType: "1" | "2" | "4";
  remarks?: string;
  occasion?: string;
}

// ── Error helper ──────────────────────────────────────────────────────────────

function sendError(res: Response, error: unknown): void {
  if (error instanceof PesafyError) {
    const status = error.statusCode ?? 400;
    res.status(status).json({
      error: error.code,
      message: error.message,
      statusCode: status,
    });
    return;
  }
  res.status(500).json({
    error: "REQUEST_FAILED",
    message: "An unexpected error occurred while processing the M-Pesa request",
  });
}

// ── Router factory ────────────────────────────────────────────────────────────

/**
 * Attaches all M-Pesa routes to the given Express Router.
 *
 * @example
 * import express from "express";
 * import { createMpesaExpressRouter } from "pesafy/express";
 *
 * const router = express.Router();
 * createMpesaExpressRouter(router, {
 *   consumerKey:          process.env.MPESA_CONSUMER_KEY!,
 *   consumerSecret:       process.env.MPESA_CONSUMER_SECRET!,
 *   environment:          "sandbox",
 *   lipaNaMpesaShortCode: "174379",
 *   lipaNaMpesaPassKey:   "bfb279...",
 *   callbackUrl:          "https://yourdomain.ngrok.io/mpesa/express/callback",
 *   skipIPCheck:          true, // local dev only
 * });
 * app.use("/api", router);
 */
export function createMpesaExpressRouter(
  router: Router,
  config: MpesaExpressConfig
): Router {
  const { mpesa } = createMpesaExpressClient(config);

  // ── POST /mpesa/express/stk-push ──────────────────────────────────────────
  router.post(
    "/mpesa/express/stk-push",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as StkPushBody;

        if (!body || typeof body.amount !== "number" || body.amount <= 0) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message: "amount must be a positive number",
          });
        }
        if (!body.phoneNumber) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message: "phoneNumber is required",
          });
        }

        const result = await mpesa.stkPush({
          amount: body.amount,
          phoneNumber: body.phoneNumber,
          callbackUrl: config.callbackUrl,
          accountReference:
            body.accountReference ??
            `PESAFY-${Date.now().toString(36).toUpperCase()}`,
          transactionDesc: body.transactionDesc ?? "Payment",
          transactionType: body.transactionType,
          partyB: body.partyB,
        });

        res.status(200).json(result);
      } catch (error) {
        if (res.headersSent) return next(error);
        sendError(res, error);
      }
    }
  );

  // ── POST /mpesa/express/stk-query ─────────────────────────────────────────
  router.post(
    "/mpesa/express/stk-query",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as StkQueryBody;

        if (!body?.checkoutRequestId) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message: "checkoutRequestId is required",
          });
        }

        const result = await mpesa.stkQuery({
          checkoutRequestId: body.checkoutRequestId,
        });

        res.status(200).json(result);
      } catch (error) {
        if (res.headersSent) return next(error);
        sendError(res, error);
      }
    }
  );

  // ── POST /mpesa/express/callback ──────────────────────────────────────────
  // Safaricom POSTs the STK Push result here.
  // Daraja docs: respond with { ResultCode: 0, ResultDesc: "Accepted" }
  router.post("/mpesa/express/callback", (req: Request, res: Response) => {
    // FIX: cast header as `string | undefined` and use optional chaining on
    // both .split() and the resulting array index so TypeScript is satisfied.
    const requestIP =
      (req.headers["x-forwarded-for"] as string | undefined)
        ?.split(",")[0]
        ?.trim() ??
      req.ip ??
      "";

    const result = handleWebhook(req.body, {
      requestIP,
      skipIPCheck: config.skipIPCheck,
    });

    if (!result.success) {
      // Always return 200 to Safaricom — log the error internally
      console.error("[pesafy] Webhook rejected:", result.error);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // Emit on the mpesa instance so the host app can react
    const webhook = result.data as import("../mpesa/webhooks").StkPushWebhook;
    const success = isSuccessfulCallback(webhook);

    // Log for observability (host app should also handle this)
    if (success) {
      console.info("[pesafy] STK Push success:", {
        receiptNumber: extractTransactionId(webhook),
        amount: extractAmount(webhook),
        phone: extractPhoneNumber(webhook),
      });
    } else {
      console.warn("[pesafy] STK Push failed:", {
        resultCode: webhook.Body.stkCallback.ResultCode,
        resultDesc: webhook.Body.stkCallback.ResultDesc,
      });
    }

    // Daraja docs: always respond 200 with this body
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  });

  // ── POST /mpesa/transaction-status/query ──────────────────────────────────
  router.post(
    "/mpesa/transaction-status/query",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!config.resultUrl || !config.queueTimeOutUrl) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message:
              "resultUrl and queueTimeOutUrl must be set in config to use transaction status routes",
          });
        }

        const body = req.body as TransactionStatusBody;

        if (!body?.transactionId) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message: "transactionId is required",
          });
        }
        if (!body.partyA) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message: "partyA is required",
          });
        }
        if (!body.identifierType) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message: 'identifierType is required: "1" | "2" | "4"',
          });
        }

        const result = await mpesa.transactionStatus({
          transactionId: body.transactionId,
          partyA: body.partyA,
          identifierType: body.identifierType,
          resultUrl: config.resultUrl,
          queueTimeOutUrl: config.queueTimeOutUrl,
          remarks: body.remarks,
          occasion: body.occasion,
        });

        res.status(200).json(result);
      } catch (error) {
        if (res.headersSent) return next(error);
        sendError(res, error);
      }
    }
  );

  // ── POST /mpesa/transaction-status/result ─────────────────────────────────
  // Safaricom POSTs the async transaction status result here.
  router.post(
    "/mpesa/transaction-status/result",
    (req: Request, res: Response) => {
      const body =
        req.body as import("../mpesa/transaction-status").TransactionStatusResult;
      const result = body?.Result;

      if (result) {
        if (result.ResultCode === 0) {
          console.info("[pesafy] Transaction Status result (success):", {
            transactionId: result.TransactionID,
            conversationId: result.ConversationID,
            resultDesc: result.ResultDesc,
          });
        } else {
          console.warn("[pesafy] Transaction Status result (failed):", {
            resultCode: result.ResultCode,
            resultDesc: result.ResultDesc,
            transactionId: result.TransactionID,
          });
        }
      }

      // Daraja docs: always respond 200
      res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  );

  return router;
}
