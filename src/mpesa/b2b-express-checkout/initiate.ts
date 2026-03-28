/**
 * B2B Express Checkout — initiates a USSD Push to a merchant's till.
 *
 * API: POST /v1/ussdpush/get-msisdn
 *
 * Flow:
 *   1. Vendor calls initiateB2BExpressCheckout().
 *   2. Daraja sends USSD Push to merchant's till (primaryShortCode).
 *   3. Merchant enters Operator ID + M-PESA PIN to authorise.
 *   4. M-PESA debits merchant (primaryShortCode) and credits vendor (receiverShortCode).
 *   5. Daraja POSTs the result to your callbackUrl.
 *
 * Authentication:
 *   Standard OAuth bearer token only — no initiator or SecurityCredential needed.
 *
 * Prerequisites (from Daraja docs):
 *   - The merchant's till (primaryShortCode) must have a Nominated Number
 *     configured in M-PESA Web Portal (Organization Details).
 *     Error 4104 means the Nominated Number is missing.
 *   - Merchant KYC must be valid (error 4102 = KYC fail).
 *
 * Error codes:
 *   4104 — Missing Nominated Number → configure in M-PESA Web Portal
 *   4102 — Merchant KYC Fail        → provide valid KYC
 *   4201 — USSD Network Error       → retry on stable network
 *   4203 — USSD Exception Error     → retry on stable network
 */

import { createError } from "../../utils/errors";
import { httpRequest } from "../../utils/http";
import type { B2BExpressCheckoutRequest, B2BExpressCheckoutResponse } from "./types";

/**
 * Generates a random UUID v4-style string for RequestRefID.
 * Uses crypto.randomUUID() where available (Node ≥18, Bun, edge runtimes).
 * Falls back to timestamp + random hex for older environments.
 */
function generateRequestRefId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return (
    `${Date.now().toString(16)}-` +
    `${Math.random().toString(16).slice(2)}-` +
    `${Math.random().toString(16).slice(2)}`
  );
}

/**
 * Initiates a B2B USSD Push to a merchant's till.
 *
 * @param baseUrl     - Daraja base URL (sandbox or production)
 * @param accessToken - Valid OAuth bearer token
 * @param request     - B2B Express Checkout parameters
 * @returns           - Daraja acknowledgement (code "0" = USSD initiated)
 */
export async function initiateB2BExpressCheckout(
  baseUrl: string,
  accessToken: string,
  request: B2BExpressCheckoutRequest,
): Promise<B2BExpressCheckoutResponse> {
  // ── Validation ──────────────────────────────────────────────────────────────

  if (!request.primaryShortCode?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: "primaryShortCode is required — the merchant's till number (debit party).",
    });
  }

  if (!request.receiverShortCode?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: "receiverShortCode is required — the vendor's Paybill account (credit party).",
    });
  }

  const amount = Math.round(request.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: `amount must be a whole number ≥ 1 (got ${request.amount} which rounds to ${amount}).`,
    });
  }

  if (!request.paymentRef?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "paymentRef is required — shown in the merchant's USSD prompt as the payment reference.",
    });
  }

  if (!request.callbackUrl?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: "callbackUrl is required — Safaricom POSTs the transaction result here.",
    });
  }

  if (!request.partnerName?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: "partnerName is required — your friendly name shown in the merchant's USSD prompt.",
    });
  }

  // ── Build payload matching Daraja spec exactly ──────────────────────────────
  //
  // Per Daraja docs: amount is sent as a string ("100"), not a number.
  // RequestRefID must be unique per request — auto-generated if not provided.

  const payload = {
    primaryShortCode: String(request.primaryShortCode),
    receiverShortCode: String(request.receiverShortCode),
    amount: String(amount),
    paymentRef: request.paymentRef,
    callbackUrl: request.callbackUrl,
    partnerName: request.partnerName,
    RequestRefID: request.requestRefId ?? generateRequestRefId(),
  };

  const { data } = await httpRequest<B2BExpressCheckoutResponse>(
    `${baseUrl}/v1/ussdpush/get-msisdn`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  );

  return data;
}
