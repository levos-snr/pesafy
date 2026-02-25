/**
 * Express-friendly helpers for M-Pesa Express (STK Push) and C2B simulate.
 *
 * NOTE: This module does NOT depend on Express at runtime. You pass in an
 * existing Express Router instance, and we attach handlers to it.
 */

import type { NextFunction, Request, Response, Router } from "express";

import { Mpesa } from "../mpesa";
import type { MpesaConfig } from "../mpesa/types";
import { PesafyError } from "../utils/errors";

export interface MpesaExpressConfig extends MpesaConfig {
  /**
   * Full callback URL that Safaricom will call after STK Push completes.
   * Example (sandbox):
   *   https://your-domain.ngrok.io/api/mpesa/express/callback
   */
  callbackUrl: string;
}

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

  const mpesa = new Mpesa(config);
  return { mpesa };
}

interface StkPushBody {
  amount: number;
  phoneNumber: string;
  accountReference?: string;
  transactionDesc?: string;
}

interface StkQueryBody {
  checkoutRequestId: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return digits;
}

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
    message: "Unexpected error while processing M-Pesa request",
  });
}

export function createMpesaExpressRouter(
  router: Router,
  config: MpesaExpressConfig
): Router {
  const { mpesa } = createMpesaExpressClient(config);

  // STK Push – initiate payment on customer phone
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

        const phoneNumber = normalizePhone(body.phoneNumber);

        const result = await mpesa.stkPush({
          amount: body.amount,
          phoneNumber,
          callbackUrl: config.callbackUrl,
          accountReference:
            body.accountReference ??
            `PESAFY-${Date.now().toString(36).toUpperCase()}`,
          transactionDesc: body.transactionDesc ?? "Payment",
        });

        res.status(200).json(result);
      } catch (error) {
        if (res.headersSent) return next(error);
        sendError(res, error);
      }
    }
  );

  // STK Query – check status of an STK Push
  router.post(
    "/mpesa/express/stk-query",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as StkQueryBody;

        if (!body || !body.checkoutRequestId) {
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

  // C2B simulate – sandbox only
  router.post(
    "/mpesa/c2b/simulate",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await mpesa.c2bSimulate(req.body);
        res.status(200).json(result);
      } catch (error) {
        if (res.headersSent) return next(error);
        sendError(res, error);
      }
    }
  );

  // C2B register URLs – sandbox only
  router.post(
    "/mpesa/c2b/register-url",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await mpesa.c2bRegisterUrls(req.body);
        res.status(200).json(result);
      } catch (error) {
        if (res.headersSent) return next(error);
        sendError(res, error);
      }
    }
  );

  return router;
}
