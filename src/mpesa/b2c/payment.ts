/**
 * B2C Payment (Business to Customer)
 *
 * API: POST /mpesa/b2b/v1/paymentrequest
 *
 * Supports two use-cases:
 *
 *   1. B2C Account Top Up (BusinessPayToBulk):
 *      Moves money from your MMF/Working account to a B2C shortcode's
 *      utility account for bulk disbursement.
 *      PartyA = your MMF shortcode, PartyB = target B2C shortcode.
 *
 *   2. Direct Customer Payment (BusinessPayment / SalaryPayment / PromotionPayment):
 *      Sends money directly to a customer's M-PESA wallet.
 *      PartyA = your shortcode, PartyB = customer's MSISDN (254XXXXXXXXX).
 *
 * This is ASYNCHRONOUS. The synchronous response only acknowledges receipt.
 * Final results arrive via POST to your ResultURL.
 *
 * Required M-PESA org portal roles:
 *   BusinessPayToBulk    → "Org Business Pay to Bulk API initiator" role
 *   BusinessPayment      → "Org Business Payment API initiator" role
 *   SalaryPayment        → "Org Salary Payment API initiator" role
 *   PromotionPayment     → "Org Promotion Payment API initiator" role
 *
 * Fixed Daraja field values:
 *   SenderIdentifierType:   "4" (Organisation ShortCode — only value allowed)
 *   RecieverIdentifierType: "4" (Organisation ShortCode — only value allowed)
 *
 * Error codes (HTTP 4xx/5xx from Daraja):
 *   500.003.1001 — Internal Server Error
 *   400.003.01   — Invalid Access Token
 *   400.003.02   — Bad Request
 *   500.003.03   — Quota Violation (too many requests per second)
 *   500.003.02   — Spike Arrest Violation
 *   404.003.01   — Resource not found
 *   404.001.04   — Invalid Authentication Header
 *   400.002.05   — Invalid Request Payload
 */

import { createError } from "../../utils/errors";
import { httpRequest } from "../../utils/http";
import type { B2CRequest, B2CResponse } from "./types";

/**
 * Initiates a B2C payment (Business to Customer).
 *
 * @param baseUrl            - Daraja base URL (sandbox or production)
 * @param accessToken        - Valid OAuth bearer token
 * @param securityCredential - RSA-encrypted initiator password (base64)
 * @param initiatorName      - M-PESA org portal API operator username
 * @param request            - B2C payment parameters
 * @returns                  - Daraja acknowledgement response
 */
export async function initiateB2CPayment(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: B2CRequest
): Promise<B2CResponse> {
  // ── Validation ──────────────────────────────────────────────────────────────

  if (!request.commandId) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        'commandId is required: "BusinessPayToBulk" | "BusinessPayment" | "SalaryPayment" | "PromotionPayment"',
    });
  }

  const validCommandIds = [
    "BusinessPayToBulk",
    "BusinessPayment",
    "SalaryPayment",
    "PromotionPayment",
  ];
  if (!validCommandIds.includes(request.commandId)) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: `commandId must be one of: ${validCommandIds.join(", ")}. Got: "${request.commandId}"`,
    });
  }

  const amount = Math.round(request.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: `amount must be a whole number ≥ 1 (got ${request.amount} which rounds to ${amount}).`,
    });
  }

  if (!request.partyA?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "partyA is required — your business shortcode from which money is deducted.",
    });
  }

  if (!request.partyB?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "partyB is required — the recipient shortcode (BusinessPayToBulk) or customer MSISDN (other commands).",
    });
  }

  if (!request.accountReference?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "accountReference is required — a reference for this transaction.",
    });
  }

  if (!request.resultUrl?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: "resultUrl is required — Safaricom POSTs the B2C result here.",
    });
  }

  if (!request.queueTimeOutUrl?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "queueTimeOutUrl is required — Safaricom calls this on request timeout.",
    });
  }

  // ── Build payload matching Daraja spec exactly ──────────────────────────────
  //
  // Per official docs:
  //   SenderIdentifierType:   "4" — only "4" (Organisation ShortCode) is supported
  //   RecieverIdentifierType: "4" — only "4" (Organisation ShortCode) is supported
  //   Amount is sent as a string per the API spec
  //   Requester is optional — only included when provided

  const payload: Record<string, unknown> = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: request.commandId,
    SenderIdentifierType: request.senderIdentifierType ?? "4",
    RecieverIdentifierType: request.receiverIdentifierType ?? "4",
    Amount: String(amount),
    PartyA: String(request.partyA),
    PartyB: String(request.partyB),
    AccountReference: request.accountReference,
    Remarks: request.remarks ?? "B2C Payment",
    QueueTimeOutURL: request.queueTimeOutUrl,
    ResultURL: request.resultUrl,
  };

  // Requester is optional — only include when explicitly provided
  if (request.requester?.trim()) {
    payload["Requester"] = String(request.requester);
  }

  const { data } = await httpRequest<B2CResponse>(
    `${baseUrl}/mpesa/b2b/v1/paymentrequest`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    }
  );

  return data;
}
