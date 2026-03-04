/**
 * Dynamic QR Code generation
 *
 * API: POST /mpesa/qrcode/v1/generate
 *
 * Generates a dynamic M-PESA QR code that customers can scan with
 * the My Safaricom App or M-PESA app to pay at LNM merchant outlets.
 *
 * Error codes (from Daraja docs):
 *   404.001.04 — Invalid Authentication Header (wrong HTTP method or misplaced headers)
 *   400.002.05 — Invalid Request Payload (malformed body)
 *   400.003.01 — Invalid Access Token (expired or incorrect)
 */

import { createError } from "../../utils/errors";
import { httpRequest } from "../../utils/http";
import type { DynamicQRRequest, DynamicQRResponse } from "./types";

/**
 * Generates a Dynamic M-PESA QR Code.
 *
 * @param baseUrl     - Daraja base URL (sandbox or production)
 * @param accessToken - Valid OAuth bearer token
 * @param request     - QR generation parameters
 * @returns           - Daraja response including base64 QRCode string
 */
export async function generateDynamicQR(
  baseUrl: string,
  accessToken: string,
  request: DynamicQRRequest
): Promise<DynamicQRResponse> {
  // ── Validation ──────────────────────────────────────────────────────────────

  if (!request.merchantName?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: "merchantName is required",
    });
  }

  if (!request.refNo?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: "refNo (transaction reference) is required",
    });
  }

  const amount = Math.round(request.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: `Amount must be at least 1 (got ${request.amount} which rounds to ${amount}).`,
    });
  }

  if (!request.trxCode) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        'trxCode is required. Supported values: "BG" | "WA" | "PB" | "SM" | "SB"',
    });
  }

  if (!request.cpi?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "cpi (Credit Party Identifier) is required — e.g. till number, paybill, or MSISDN",
    });
  }

  const size = request.size ?? 300;
  if (size < 1) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: "size must be a positive number of pixels",
    });
  }

  // ── Build payload matching Daraja spec exactly ──────────────────────────────

  const payload = {
    MerchantName: request.merchantName,
    RefNo: request.refNo,
    Amount: amount,
    TrxCode: request.trxCode,
    CPI: request.cpi,
    Size: String(size),
  };

  const { data } = await httpRequest<DynamicQRResponse>(
    `${baseUrl}/mpesa/qrcode/v1/generate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    }
  );

  return data;
}
