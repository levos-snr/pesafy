// 📁 PATH: src/adapters/hono.ts

/**
 * Hono adapter for Pesafy — works on Bun, Cloudflare Workers, Deno, and Node.
 *
 * @example
 * import { Hono } from "hono";
 * import { createMpesaHonoRouter } from "pesafy/adapters/hono";
 *
 * const app = new Hono();
 * createMpesaHonoRouter(app, {
 *   consumerKey:          Bun.env.MPESA_CONSUMER_KEY!,
 *   consumerSecret:       Bun.env.MPESA_CONSUMER_SECRET!,
 *   environment:          "sandbox",
 *   lipaNaMpesaShortCode: "174379",
 *   lipaNaMpesaPassKey:   "bfb279...",
 *   callbackUrl:          "https://yourdomain.com/mpesa/express/callback",
 * });
 *
 * export default app;
 *
 * Routes mounted:
 *   POST /mpesa/express/stk-push
 *   POST /mpesa/express/stk-query
 *   POST /mpesa/express/callback
 *   POST /mpesa/balance/query
 *   POST /mpesa/balance/result
 *   POST /mpesa/reversal/request
 *   POST /mpesa/reversal/result
 */

import type { Context, Hono } from "hono";
import { Mpesa } from "../mpesa";
import type { MpesaConfig } from "../mpesa/types";
import {
  extractAmount,
  extractPhoneNumber,
  extractTransactionId,
  isSuccessfulCallback,
  verifyWebhookIP,
} from "../mpesa/webhooks";
import { PesafyError } from "../utils/errors";
import type { AccountBalanceRequest } from "../mpesa/account-balance";
import type { ReversalRequest } from "../mpesa/reversal";

// Re-export for convenience
export type { MpesaConfig };

export interface MpesaHonoConfig extends MpesaConfig {
  callbackUrl: string;
  resultUrl?: string;
  queueTimeOutUrl?: string;
  skipIPCheck?: boolean;
  onStkSuccess?: (data: {
    receiptNumber: string | null;
    amount: number | null;
    phone: string | null;
  }) => Promise<void> | void;
  onStkFailure?: (data: { resultCode: number; resultDesc: string }) => Promise<void> | void;
  onAccountBalanceResult?: (body: unknown) => Promise<void> | void;
  onReversalResult?: (body: unknown) => Promise<void> | void;
}

function getClientIP(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("cf-connecting-ip") ?? // Cloudflare Workers
    c.req.header("x-real-ip") ??
    ""
  );
}

function sendErr(c: Context, error: unknown): Response {
  if (error instanceof PesafyError) {
    const status = (error.statusCode ?? 400) as Parameters<typeof c.json>[1];
    return c.json({ error: error.code, message: error.message }, status);
  }
  return c.json({ error: "INTERNAL_ERROR", message: "An unexpected error occurred" }, 500);
}

/**
 * Mounts M-PESA routes onto a Hono app instance.
 */
export function createMpesaHonoRouter(app: Hono, config: MpesaHonoConfig): void {
  const mpesa = new Mpesa(config);

  // ── STK Push ────────────────────────────────────────────────────────────────
  app.post("/mpesa/express/stk-push", async (c) => {
    try {
      const body = await c.req.json<{
        amount: number;
        phoneNumber: string;
        accountReference?: string;
        transactionDesc?: string;
        partyB?: string;
      }>();

      if (!body.amount || body.amount <= 0)
        throw new PesafyError({ code: "VALIDATION_ERROR", message: "amount must be > 0" });
      if (!body.phoneNumber)
        throw new PesafyError({ code: "VALIDATION_ERROR", message: "phoneNumber is required" });

      const result = await mpesa.stkPush({
        amount: body.amount,
        phoneNumber: body.phoneNumber,
        callbackUrl: config.callbackUrl,
        accountReference: body.accountReference ?? `REF-${Date.now().toString(36).toUpperCase()}`,
        transactionDesc: body.transactionDesc ?? "Payment",
        partyB: body.partyB,
      });

      return c.json(result);
    } catch (e) {
      return sendErr(c, e);
    }
  });

  // ── STK Query ───────────────────────────────────────────────────────────────
  app.post("/mpesa/express/stk-query", async (c) => {
    try {
      const { checkoutRequestId } = await c.req.json<{ checkoutRequestId: string }>();
      if (!checkoutRequestId)
        throw new PesafyError({
          code: "VALIDATION_ERROR",
          message: "checkoutRequestId is required",
        });
      return c.json(await mpesa.stkQuery({ checkoutRequestId }));
    } catch (e) {
      return sendErr(c, e);
    }
  });

  // ── STK Callback ─────────────────────────────────────────────────────────────
  app.post("/mpesa/express/callback", async (c) => {
    if (!config.skipIPCheck) {
      const ip = getClientIP(c);
      if (ip && !verifyWebhookIP(ip)) {
        console.warn("[pesafy/hono] STK callback from unknown IP:", ip);
      }
    }

    const body = await c.req.json();
    const cb = body?.Body?.stkCallback;
    if (!cb) return c.json({ ResultCode: 0, ResultDesc: "Accepted" });

    if (isSuccessfulCallback(body)) {
      const data = {
        receiptNumber: extractTransactionId(body),
        amount: extractAmount(body),
        phone: extractPhoneNumber(body),
      };
      console.info("[pesafy/hono] STK success:", data);
      if (config.onStkSuccess) {
        Promise.resolve(config.onStkSuccess(data)).catch(console.error);
      }
    } else {
      const data = { resultCode: cb.ResultCode as number, resultDesc: cb.ResultDesc as string };
      console.warn("[pesafy/hono] STK failed:", data);
      if (config.onStkFailure) {
        Promise.resolve(config.onStkFailure(data)).catch(console.error);
      }
    }

    return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
  });

  // ── Account Balance Query ─────────────────────────────────────────────────
  app.post("/mpesa/balance/query", async (c) => {
    try {
      if (!config.resultUrl || !config.queueTimeOutUrl)
        throw new PesafyError({
          code: "VALIDATION_ERROR",
          message: "resultUrl and queueTimeOutUrl are required in config for balance queries",
        });

      const body = await c.req.json<Omit<AccountBalanceRequest, "resultUrl" | "queueTimeOutUrl">>();
      return c.json(
        await mpesa.accountBalance({
          ...body,
          resultUrl: config.resultUrl,
          queueTimeOutUrl: config.queueTimeOutUrl,
        }),
      );
    } catch (e) {
      return sendErr(c, e);
    }
  });

  app.post("/mpesa/balance/result", async (c) => {
    const body = await c.req.json();
    if (config.onAccountBalanceResult) {
      Promise.resolve(config.onAccountBalanceResult(body)).catch(console.error);
    }
    console.info("[pesafy/hono] Account balance result:", JSON.stringify(body).slice(0, 300));
    return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
  });

  // ── Reversal ──────────────────────────────────────────────────────────────
  app.post("/mpesa/reversal/request", async (c) => {
    try {
      if (!config.resultUrl || !config.queueTimeOutUrl)
        throw new PesafyError({
          code: "VALIDATION_ERROR",
          message: "resultUrl and queueTimeOutUrl are required in config for reversals",
        });

      const body = (await c.req.json()) as Omit<ReversalRequest, "resultUrl" | "queueTimeOutUrl">;
      const fullRequest: ReversalRequest = {
        ...body,
        resultUrl: config.resultUrl,
        queueTimeOutUrl: config.queueTimeOutUrl,
      };
      return c.json(await mpesa.reverseTransaction(fullRequest));
    } catch (e) {
      return sendErr(c, e);
    }
  });

  app.post("/mpesa/reversal/result", async (c) => {
    const body = await c.req.json();
    if (config.onReversalResult) {
      Promise.resolve(config.onReversalResult(body)).catch(console.error);
    }
    console.info("[pesafy/hono] Reversal result:", JSON.stringify(body).slice(0, 300));
    return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
  });
}
