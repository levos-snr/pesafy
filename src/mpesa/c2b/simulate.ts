/**
 * C2B Simulate — Sandbox only
 * API: POST /mpesa/c2b/v2/simulate
 *
 * Simulates a customer payment to your Paybill or Till number.
 * NOT available in production — real payments come from the M-Pesa app / USSD.
 *
 * CommandID options:
 *   "CustomerPayBillOnline" → Paybill payment (use BillRefNumber)
 *   "CustomerBuyGoodsOnline" → Buy Goods / Till payment (BillRefNumber = null)
 */

import { httpRequest } from "../../utils/http";
import { formatPhoneNumber } from "../stk-push/utils";
import type { C2BSimulateRequest, C2BSimulateResponse } from "./types";

export async function simulateC2B(
  baseUrl: string,
  accessToken: string,
  request: C2BSimulateRequest
): Promise<C2BSimulateResponse> {
  const amount = Math.round(request.amount);
  if (amount < 1) {
    throw new Error(
      `C2B simulate amount must be at least 1 KES (got ${request.amount}).`
    );
  }

  const body: Record<string, string | number | null> = {
    ShortCode: request.shortCode,
    CommandID: request.commandId,
    Amount: amount,
    // Daraja expects numeric MSISDN — strip formatting
    Msisdn: Number(formatPhoneNumber(request.phoneNumber)),
    // Paybill: pass account reference. Buy Goods: pass null (Daraja accepts it).
    BillRefNumber: request.billRefNumber ?? null,
  };

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
