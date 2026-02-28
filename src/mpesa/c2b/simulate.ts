/**
 * C2B Simulate (sandbox only)
 * API: POST /mpesa/c2b/v1/simulate   ← v1 (NOT v2 — v2 does not exist for this endpoint)
 *
 * Simulates a customer paying a Paybill or Till number.
 * This endpoint is NOT available in production — use STK Push or Dynamic QR
 * for production payment initiation.
 */
import { httpRequest } from "../../utils/http";
import { msisdnToNumber } from "../../utils/phone";
import type { C2BCommandId, C2BSimulateRequest } from "./types";

/**
 * Actual response shape from Daraja.
 * Note: Daraja's field name has a typo ("CoversationID" — missing the 'n').
 * We match it exactly so JSON parsing is lossless.
 * There is NO ConversationID field in this response (unlike B2C/B2B).
 */
export interface C2BSimulateResponse {
  /** Global unique identifier for this simulate request. Daraja typo: "Coversation" */
  OriginatorCoversationID: string;
  /** "0" = accepted */
  ResponseCode: string;
  ResponseDescription: string;
}

export async function simulateC2B(
  baseUrl: string,
  accessToken: string,
  request: C2BSimulateRequest
): Promise<C2BSimulateResponse> {
  const commandId: C2BCommandId = request.commandId ?? "CustomerPayBillOnline";
  const isBuyGoods = commandId === "CustomerBuyGoodsOnline";

  /**
   * BillRefNumber (AccountReference) rules — Daraja v1 sandbox behaviour:
   *
   *  CustomerPayBillOnline:
   *    - Required. Use the passed billRefNumber or fall back to empty string "".
   *    - Empty string is accepted; it just means no account reference.
   *
   *  CustomerBuyGoodsOnline:
   *    - The field MUST be omitted entirely from the request body.
   *    - Sending any value (even "0", "", or null) triggers:
   *      500.003.1001 "The element AccountReference is invalid."
   *    - ✅ FIX: conditionally include the field only for Paybill.
   */
  const body: Record<string, unknown> = {
    // ✅ FIXED: ShortCode must be a string — Daraja C2B simulate expects a string,
    // not a number. Sending Number(shortCode) causes type mismatch errors.
    ShortCode: request.shortCode,
    CommandID: commandId,
    Amount: Math.round(request.amount),
    // Daraja expects Msisdn as a number (not a quoted string)
    Msisdn: msisdnToNumber(request.phoneNumber),
  };

  // ✅ Only include BillRefNumber for Paybill — omit entirely for Buy Goods
  if (!isBuyGoods) {
    body.BillRefNumber = request.billRefNumber ?? "";
  }

  // ✅ FIXED: /v1/simulate (was incorrectly /v2/simulate)
  // The v2 path does not exist and will always return 500.003.1001.
  const { data } = await httpRequest<C2BSimulateResponse>(
    `${baseUrl}/mpesa/c2b/v1/simulate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
