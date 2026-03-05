/**
 * C2B Simulate Transaction — SANDBOX ONLY
 *
 * Simulates a customer payment to your Paybill or Till number for testing.
 *
 * API:
 *   v1: POST /mpesa/c2b/v1/simulate
 *   v2: POST /mpesa/c2b/v2/simulate  ← default
 *
 * Sandbox:    https://sandbox.safaricom.co.ke/mpesa/c2b/v{1|2}/simulate
 * Production: NOT SUPPORTED — M-PESA payments in production must be done
 *             via M-PESA App, USSD, or SIM Toolkit.
 *
 * Daraja docs:
 *   - Simulation is not supported on production.
 *   - Use the test MSISDN from the Daraja simulator (e.g. 254708374149).
 *   - BillRefNumber is required for Paybill; MUST BE OMITTED for Buy Goods.
 *     Sending BillRefNumber="" for CustomerBuyGoodsOnline causes:
 *     "The element AccountReference is invalid" (400) or HTTP 503.
 *   - Amount must be a whole number ≥ 1.
 *
 * Sandbox shortcodes:
 *   CustomerPayBillOnline  → use your registered Paybill shortcode (e.g. 600977)
 *   CustomerBuyGoodsOnline → use Daraja test Till shortcode: 600000
 *     (Till shortcodes are different from Paybill in sandbox)
 */

import { createError } from "../../utils/errors";
import { httpRequest } from "../../utils/http";
import type {
  C2BApiVersion,
  C2BSimulateRequest,
  C2BSimulateResponse,
} from "./types";

/**
 * Simulates a C2B customer payment. SANDBOX ONLY.
 *
 * @param baseUrl     - Must be the sandbox base URL. Will throw if production.
 * @param accessToken - Valid OAuth bearer token
 * @param request     - Simulation parameters
 * @returns           - Daraja simulate response
 */
export async function simulateC2B(
  baseUrl: string,
  accessToken: string,
  request: C2BSimulateRequest
): Promise<C2BSimulateResponse> {
  // ── Sandbox guard ───────────────────────────────────────────────────────────
  if (!baseUrl.includes("sandbox")) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "C2B simulate is only available in the Sandbox environment. " +
        "Production M-PESA payments must be initiated by the customer via " +
        "M-PESA App, USSD, or SIM Toolkit.",
    });
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  if (!request.shortCode) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: "shortCode is required",
    });
  }

  if (!request.commandId) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        'commandId is required: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline"',
    });
  }

  if (
    request.commandId !== "CustomerPayBillOnline" &&
    request.commandId !== "CustomerBuyGoodsOnline"
  ) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        `commandId must be "CustomerPayBillOnline" or "CustomerBuyGoodsOnline". ` +
        `Got: "${request.commandId}"`,
    });
  }

  const amount = Math.round(request.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: `amount must be a whole number ≥ 1 (got ${request.amount})`,
    });
  }

  if (!request.msisdn) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "msisdn is required. Use the test phone number from the Daraja simulator.",
    });
  }

  // ── API version ─────────────────────────────────────────────────────────────
  const version: C2BApiVersion = request.apiVersion ?? "v2";

  const isBuyGoods = request.commandId === "CustomerBuyGoodsOnline";

  // ── Build payload matching Daraja spec exactly ──────────────────────────────
  //
  // CRITICAL: BillRefNumber handling differs by commandId:
  //
  //   CustomerPayBillOnline  (Paybill) → include BillRefNumber (account ref)
  //   CustomerBuyGoodsOnline (Till)    → OMIT BillRefNumber entirely
  //
  // Sending BillRefNumber (even as empty string "") for Buy Goods causes:
  //   HTTP 400: "The element AccountReference is invalid"
  //   HTTP 503: Daraja sandbox rejects the malformed request
  //
  // Daraja docs are misleading here — the field is documented as optional,
  // but sending it as "" for Buy Goods is treated as a validation error.
  const payload: Record<string, unknown> = {
    ShortCode: Number(request.shortCode),
    CommandID: request.commandId,
    Amount: amount,
    Msisdn: Number(request.msisdn),
  };

  if (!isBuyGoods) {
    // Paybill: BillRefNumber is the account/invoice reference the customer pays to.
    // Include even if empty — Paybill payments require this field.
    payload.BillRefNumber = request.billRefNumber ?? "";
  }
  // Buy Goods: BillRefNumber is intentionally omitted — Daraja rejects it.

  const { data } = await httpRequest<C2BSimulateResponse>(
    `${baseUrl}/mpesa/c2b/${version}/simulate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    }
  );

  return data;
}
