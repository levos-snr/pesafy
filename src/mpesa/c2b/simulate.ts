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
   * BillRefNumber (AccountReference) rules — Daraja v1 sandbox:
   *
   *  CustomerPayBillOnline:
   *    - Include the field. Use billRefNumber or fall back to "".
   *    - Empty string is accepted (no account reference).
   *
   *  CustomerBuyGoodsOnline:
   *    - The KEY must be COMPLETELY ABSENT from the JSON body.
   *    - Any value (even "", null, or undefined key) triggers:
   *      500.003.1001 "The element AccountReference is invalid."
   *    - ✅ FIX: only add the key for Paybill.
   */
  const body: Record<string, unknown> = {
    // ✅ FIX: ShortCode as string — Daraja C2B simulate expects a string, not a number.
    ShortCode: request.shortCode,
    CommandID: commandId,
    Amount: Math.round(request.amount),
    // Daraja expects Msisdn as a number, not a quoted string
    Msisdn: msisdnToNumber(request.phoneNumber),
  };

  // ✅ FIX: Conditionally add BillRefNumber — the key must NOT exist at all for Buy Goods.
  // Do NOT add an else that sets it to undefined/""/null — those still appear as keys.
  if (!isBuyGoods) {
    body.BillRefNumber = request.billRefNumber ?? "";
  }

  // ✅ FIX: /v1/simulate — the v2 path does not exist and always returns 500.003.1001.
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
