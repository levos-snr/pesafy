/**
 * C2B Simulate (sandbox only)
 * API: POST /mpesa/c2b/v2/simulate
 *
 * Simulates a customer paying a Paybill or Till number.
 * This endpoint is NOT available in production — use STK Push or Dynamic QR
 * for production payment initiation.
 */

import { httpRequest } from "../../utils/http";
import { msisdnToNumber } from "../../utils/phone";
import type { C2BSimulateRequest } from "./types";

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
  const commandId = request.commandId ?? "CustomerPayBillOnline";
  const isBuyGoods = commandId === "CustomerBuyGoodsOnline";

  /**
   * BillRefNumber rules per Daraja docs:
   *  - CustomerPayBillOnline:  account reference (e.g. "Test Ref") — use passed value or empty string
   *  - CustomerBuyGoodsOnline: must be null / omitted
   *
   * We omit the key entirely for BuyGoods rather than sending null, which can
   * cause a 400 "Invalid Request Payload" on some Daraja versions.
   */
  const billRef = isBuyGoods ? undefined : (request.billRefNumber ?? "");

  const body: Record<string, unknown> = {
    ShortCode: Number(request.shortCode),
    CommandID: commandId,
    Amount: Math.round(request.amount),
    // Daraja expects Msisdn as a number (not a quoted string)
    Msisdn: msisdnToNumber(request.phoneNumber),
  };

  if (billRef !== undefined) {
    body.BillRefNumber = billRef;
  }

  const { data } = await httpRequest<C2BSimulateResponse>(
    `${baseUrl}/mpesa/c2b/v2/simulate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
