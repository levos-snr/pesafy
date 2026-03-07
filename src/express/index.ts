/**
 * Express-friendly helpers for Daraja APIs.
 *
 * Attaches handlers to an existing Express Router:
 *
 *   STK Push / M-Pesa Express:
 *     POST /mpesa/express/stk-push          — initiate STK Push
 *     POST /mpesa/express/stk-query         — check STK Push status
 *     POST /mpesa/express/callback          — receive STK Push callback from Safaricom
 *
 *   Transaction Status:
 *     POST /mpesa/transaction-status/query  — query M-Pesa transaction
 *     POST /mpesa/transaction-status/result — receive Transaction Status result from Safaricom
 *
 *   Customer to Business (C2B):
 *     POST /mpesa/c2b/register-url          — register Confirmation + Validation URLs
 *     POST /mpesa/c2b/simulate              — sandbox simulation (sandbox only)
 *     POST /mpesa/c2b/validation            — receive C2B validation from Safaricom
 *     POST /mpesa/c2b/confirmation          — receive C2B confirmation from Safaricom
 *
 *   Tax Remittance:
 *     POST /mpesa/tax/remit                 — initiate a tax remittance to KRA
 *     POST /mpesa/tax/result                — receive Tax Remittance result from Safaricom
 *
 * NOTE: This module does NOT import Express at runtime.
 * Pass in an existing Express Router and it attaches handlers.
 */

import type { NextFunction, Request, Response, Router } from "express";
import { Mpesa } from "../mpesa";
import {
  acceptC2BValidation,
  type C2BConfirmationPayload,
  type C2BValidationPayload,
  type C2BValidationResponse,
} from "../mpesa/c2b";
import type { TaxRemittanceResult } from "../mpesa/tax-remittance";
import type { MpesaConfig } from "../mpesa/types";
import {
  extractAmount,
  extractPhoneNumber,
  extractTransactionId,
  handleWebhook,
  isSuccessfulCallback,
  verifyWebhookIP,
} from "../mpesa/webhooks";
import { PesafyError } from "../utils/errors";

// ── Config ────────────────────────────────────────────────────────────────────

export interface MpesaExpressConfig extends MpesaConfig {
  /**
   * Full public URL Safaricom will POST STK Push callbacks to.
   * @example "https://yourdomain.com/api/mpesa/express/callback"
   */
  callbackUrl: string;

  /**
   * Full public URL Safaricom will POST Transaction Status results to.
   * Required when using transactionStatus routes.
   * @example "https://yourdomain.com/api/mpesa/transaction-status/result"
   */
  resultUrl?: string;

  /**
   * Full public URL Safaricom calls on queue timeout.
   * @example "https://yourdomain.com/api/mpesa/transaction-status/timeout"
   */
  queueTimeOutUrl?: string;

  // ── C2B ────────────────────────────────────────────────────────────────────

  /**
   * Your C2B shortcode (Paybill or Till number).
   * Required when using C2B routes.
   */
  c2bShortCode?: string;

  /**
   * Full public URL Safaricom POSTs C2B payment confirmations to.
   * Must not contain: M-PESA, Safaricom, exe, exec, cmd, sql, query.
   * Production: must be HTTPS.
   * @example "https://yourdomain.com/api/mpesa/c2b/confirmation"
   */
  c2bConfirmationUrl?: string;

  /**
   * Full public URL Safaricom POSTs C2B validation requests to.
   * Only called if External Validation is enabled on your shortcode.
   * Email apisupport@safaricom.co.ke to enable External Validation.
   * @example "https://yourdomain.com/api/mpesa/c2b/validation"
   */
  c2bValidationUrl?: string;

  /**
   * What M-PESA should do if your validation URL is unreachable.
   * Must be exactly "Completed" or "Cancelled" (sentence case, well-spelled).
   * Default: "Completed"
   */
  c2bResponseType?: "Completed" | "Cancelled";

  /**
   * C2B API version.
   *   v2 (default): callbacks include a masked MSISDN — recommended.
   *   v1: callbacks include SHA256-hashed MSISDN.
   */
  c2bApiVersion?: "v1" | "v2";

  /**
   * Optional validation hook. Called when Safaricom sends a C2B validation
   * request to your validationUrl (only if External Validation is enabled).
   *
   * Return acceptC2BValidation() to allow or rejectC2BValidation() to block.
   * Must resolve within ~8 seconds or M-PESA uses the c2bResponseType default.
   *
   * If not provided, all transactions are auto-accepted.
   *
   * @example
   * onC2BValidation: async (payload) => {
   *   const accountExists = await db.accounts.exists(payload.BillRefNumber);
   *   return accountExists
   *     ? acceptC2BValidation()
   *     : rejectC2BValidation("C2B00012"); // Invalid Account Number
   * }
   */
  onC2BValidation?: (
    payload: C2BValidationPayload
  ) => Promise<C2BValidationResponse> | C2BValidationResponse;

  /**
   * Optional confirmation hook. Called when Safaricom confirms a successful
   * C2B payment to your confirmationUrl.
   *
   * This is fire-and-forget — the 200 response to Safaricom is sent immediately.
   * Errors in this hook are logged but do NOT affect the response.
   *
   * @example
   * onC2BConfirmation: async (payload) => {
   *   await db.payments.create({
   *     transactionId: payload.TransID,
   *     amount:        Number(payload.TransAmount),
   *     accountRef:    payload.BillRefNumber,
   *   });
   * }
   */
  onC2BConfirmation?: (payload: C2BConfirmationPayload) => Promise<void> | void;

  // ── Tax Remittance ─────────────────────────────────────────────────────────

  /**
   * Your M-PESA business shortcode from which tax will be deducted.
   * Used as the default partyA when not provided in the request body.
   * Required when using tax remittance routes.
   */
  taxPartyA?: string;

  /**
   * Full public URL Safaricom POSTs Tax Remittance results to.
   * Required when using tax remittance routes.
   * @example "https://yourdomain.com/api/mpesa/tax/result"
   */
  taxResultUrl?: string;

  /**
   * Full public URL Safaricom calls on Tax Remittance queue timeout.
   * Required when using tax remittance routes.
   * @example "https://yourdomain.com/api/mpesa/tax/timeout"
   */
  taxQueueTimeOutUrl?: string;

  /**
   * Optional hook called when a Tax Remittance result arrives at your resultUrl.
   *
   * This is fire-and-forget — the 200 response to Safaricom is sent immediately.
   * Errors in this hook are logged but do NOT affect the response.
   *
   * @example
   * onTaxRemittanceResult: async (result) => {
   *   if (result.Result.ResultCode === 0) {
   *     await db.taxPayments.markPaid({
   *       transactionId: result.Result.TransactionID,
   *     });
   *   }
   * }
   */
  onTaxRemittanceResult?: (result: TaxRemittanceResult) => Promise<void> | void;

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
  transactionType?: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
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

interface C2BSimulateBody {
  commandId: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
  amount: number;
  msisdn: string | number;
  billRefNumber?: string;
  shortCode?: string | number;
}

interface TaxRemitBody {
  amount: number;
  /** Override the taxPartyA set in config for this specific request */
  partyA?: string;
  /** The KRA Payment Registration Number (PRN) */
  accountReference: string;
  remarks?: string;
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

// ── IP helper (shared across callbacks) ───────────────────────────────────────

function extractRequestIP(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ??
    req.ip ??
    ""
  );
}

// ── Router factory ────────────────────────────────────────────────────────────

/**
 * Attaches all M-Pesa routes to the given Express Router.
 *
 * @example
 * import express from "express";
 * import {
 *   createMpesaExpressRouter,
 *   acceptC2BValidation,
 *   rejectC2BValidation,
 * } from "pesafy/express";
 *
 * const router = express.Router();
 * createMpesaExpressRouter(router, {
 *   consumerKey:          process.env.MPESA_CONSUMER_KEY!,
 *   consumerSecret:       process.env.MPESA_CONSUMER_SECRET!,
 *   environment:          "sandbox",
 *   lipaNaMpesaShortCode: "174379",
 *   lipaNaMpesaPassKey:   "bfb279...",
 *   callbackUrl:          "https://yourdomain.com/mpesa/express/callback",
 *   initiatorName:        "testapi",
 *   initiatorPassword:    "Safaricom123!",
 *   certificatePath:      "./SandboxCertificate.cer",
 *   c2bShortCode:         "600984",
 *   c2bConfirmationUrl:   "https://yourdomain.com/mpesa/c2b/confirmation",
 *   c2bValidationUrl:     "https://yourdomain.com/mpesa/c2b/validation",
 *   c2bResponseType:      "Completed",
 *   c2bApiVersion:        "v2",
 *   taxPartyA:            "888880",
 *   taxResultUrl:         "https://yourdomain.com/mpesa/tax/result",
 *   taxQueueTimeOutUrl:   "https://yourdomain.com/mpesa/tax/timeout",
 *   onC2BValidation: async (payload) => {
 *     const valid = await db.accounts.exists(payload.BillRefNumber);
 *     return valid ? acceptC2BValidation() : rejectC2BValidation("C2B00012");
 *   },
 *   onC2BConfirmation: async (payload) => {
 *     await db.payments.record(payload);
 *   },
 *   onTaxRemittanceResult: async (result) => {
 *     if (result.Result.ResultCode === 0) {
 *       await db.taxPayments.markPaid({ transactionId: result.Result.TransactionID });
 *     }
 *   },
 *   skipIPCheck: true, // local dev only
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
  router.post("/mpesa/express/callback", (req: Request, res: Response) => {
    const requestIP = extractRequestIP(req);

    const result = handleWebhook(req.body, {
      requestIP,
      skipIPCheck: config.skipIPCheck,
    });

    if (!result.success) {
      console.error("[pesafy] STK Push webhook rejected:", result.error);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const webhook = result.data as import("../mpesa/webhooks").StkPushWebhook;
    const success = isSuccessfulCallback(webhook);

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

      res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  );

  // ── POST /mpesa/c2b/register-url ──────────────────────────────────────────
  // Registers your Confirmation + Validation URLs with Safaricom.
  // Sandbox: can call multiple times. Production: one-time call.
  router.post(
    "/mpesa/c2b/register-url",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as {
          shortCode?: string;
          confirmationUrl?: string;
          validationUrl?: string;
          responseType?: "Completed" | "Cancelled";
          apiVersion?: "v1" | "v2";
        };

        const shortCode = body.shortCode ?? config.c2bShortCode;
        const confirmationUrl =
          body.confirmationUrl ?? config.c2bConfirmationUrl;
        const validationUrl = body.validationUrl ?? config.c2bValidationUrl;
        const responseType =
          body.responseType ?? config.c2bResponseType ?? "Completed";
        const apiVersion = body.apiVersion ?? config.c2bApiVersion ?? "v2";

        if (!shortCode) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message:
              "shortCode is required (set c2bShortCode in config or provide in request body)",
          });
        }
        if (!confirmationUrl) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message:
              "confirmationUrl is required (set c2bConfirmationUrl in config or provide in request body)",
          });
        }
        if (!validationUrl) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message:
              "validationUrl is required (set c2bValidationUrl in config or provide in request body)",
          });
        }

        const result = await mpesa.registerC2BUrls({
          shortCode,
          responseType,
          confirmationUrl,
          validationUrl,
          apiVersion,
        });

        res.status(200).json(result);
      } catch (error) {
        if (res.headersSent) return next(error);
        sendError(res, error);
      }
    }
  );

  // ── POST /mpesa/c2b/simulate ──────────────────────────────────────────────
  // Simulates a C2B customer payment. SANDBOX ONLY.
  // Safaricom does NOT support simulation in production.
  router.post(
    "/mpesa/c2b/simulate",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as C2BSimulateBody;

        if (!body?.commandId) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message:
              'commandId is required: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline"',
          });
        }
        if (!body.amount || body.amount <= 0) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message: "amount must be a positive number",
          });
        }
        if (!body.msisdn) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message:
              "msisdn is required (use the test MSISDN from Daraja simulator)",
          });
        }

        const result = await mpesa.simulateC2B({
          shortCode: body.shortCode ?? config.c2bShortCode ?? "",
          commandId: body.commandId,
          amount: body.amount,
          msisdn: body.msisdn,
          billRefNumber: body.billRefNumber,
          apiVersion: config.c2bApiVersion ?? "v2",
        });

        res.status(200).json(result);
      } catch (error) {
        if (res.headersSent) return next(error);
        sendError(res, error);
      }
    }
  );

  // ── POST /mpesa/c2b/validation ────────────────────────────────────────────
  // Safaricom POSTs here when External Validation is enabled on your shortcode.
  // You must respond within ~8 seconds with accept or reject.
  // Always respond HTTP 200 to Safaricom.
  router.post("/mpesa/c2b/validation", async (req: Request, res: Response) => {
    if (!config.skipIPCheck) {
      const requestIP = extractRequestIP(req);
      if (!verifyWebhookIP(requestIP)) {
        console.error(
          "[pesafy] C2B validation rejected — IP not in Safaricom whitelist:",
          requestIP
        );
        return res
          .status(200)
          .json({ ResultCode: "0", ResultDesc: "Accepted" });
      }
    }

    const payload = req.body as C2BValidationPayload;

    try {
      let validationResponse: C2BValidationResponse;

      if (config.onC2BValidation) {
        validationResponse = await config.onC2BValidation(payload);
      } else {
        validationResponse = acceptC2BValidation();
      }

      console.info("[pesafy] C2B validation response:", {
        transactionId: payload.TransID,
        amount: payload.TransAmount,
        billRef: payload.BillRefNumber,
        resultCode: validationResponse.ResultCode,
        resultDesc: validationResponse.ResultDesc,
      });

      return res.status(200).json(validationResponse);
    } catch (error) {
      console.error("[pesafy] C2B validation hook threw an error:", error);
      return res.status(200).json({ ResultCode: "0", ResultDesc: "Accepted" });
    }
  });

  // ── POST /mpesa/c2b/confirmation ──────────────────────────────────────────
  // Safaricom POSTs here after a successful C2B payment.
  // Always respond { ResultCode: 0, ResultDesc: "Success" } immediately.
  // Process the confirmation asynchronously to avoid delaying the response.
  router.post("/mpesa/c2b/confirmation", (req: Request, res: Response) => {
    const payload = req.body as C2BConfirmationPayload;

    console.info("[pesafy] C2B confirmation received:", {
      transactionId: payload.TransID,
      amount: payload.TransAmount,
      shortCode: payload.BusinessShortCode,
      billRef: payload.BillRefNumber,
      transactionType: payload.TransactionType,
      transTime: payload.TransTime,
      balance: payload.OrgAccountBalance,
    });

    if (config.onC2BConfirmation) {
      Promise.resolve(config.onC2BConfirmation(payload)).catch((err) => {
        console.error("[pesafy] C2B confirmation hook error:", err);
      });
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  });

  // ── POST /mpesa/tax/remit ─────────────────────────────────────────────────
  // Initiates a tax remittance to Kenya Revenue Authority (KRA).
  // Requires initiatorName + securityCredential in config.
  router.post(
    "/mpesa/tax/remit",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!config.taxResultUrl || !config.taxQueueTimeOutUrl) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message:
              "taxResultUrl and taxQueueTimeOutUrl must be set in config to use tax remittance routes",
          });
        }

        const body = req.body as TaxRemitBody;

        if (!body || typeof body.amount !== "number" || body.amount <= 0) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message: "amount must be a positive number",
          });
        }
        if (!body.accountReference) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message:
              "accountReference is required — the KRA Payment Registration Number (PRN)",
          });
        }

        const partyA = body.partyA ?? config.taxPartyA ?? "";
        if (!partyA) {
          throw new PesafyError({
            code: "VALIDATION_ERROR",
            message:
              "partyA is required — set taxPartyA in config or provide partyA in the request body",
          });
        }

        const result = await mpesa.remitTax({
          amount: body.amount,
          partyA,
          accountReference: body.accountReference,
          resultUrl: config.taxResultUrl,
          queueTimeOutUrl: config.taxQueueTimeOutUrl,
          remarks: body.remarks,
        });

        res.status(200).json(result);
      } catch (error) {
        if (res.headersSent) return next(error);
        sendError(res, error);
      }
    }
  );

  // ── POST /mpesa/tax/result ────────────────────────────────────────────────
  // Safaricom POSTs the Tax Remittance result here after processing.
  // Always respond HTTP 200 immediately; process result asynchronously.
  router.post("/mpesa/tax/result", (req: Request, res: Response) => {
    const body = req.body as TaxRemittanceResult;
    const result = body?.Result;

    if (result) {
      if (result.ResultCode === 0) {
        console.info("[pesafy] Tax Remittance result (success):", {
          transactionId: result.TransactionID,
          conversationId: result.ConversationID,
          resultDesc: result.ResultDesc,
        });
      } else {
        console.warn("[pesafy] Tax Remittance result (failed):", {
          resultCode: result.ResultCode,
          resultDesc: result.ResultDesc,
          transactionId: result.TransactionID,
        });
      }
    }

    // Call user hook fire-and-forget — never delay the 200 response
    if (config.onTaxRemittanceResult && body) {
      Promise.resolve(config.onTaxRemittanceResult(body)).catch((err) => {
        console.error("[pesafy] Tax Remittance result hook error:", err);
      });
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  });

  return router;
}
