/**
 * C2B Simulate - Simulate C2B payment (sandbox only)
 * API: POST /mpesa/c2b/v2/simulate
 */

import { httpRequest } from "../../utils/http";
import { formatPhoneNumber } from "../stk-push/utils";
import type { C2BSimulateRequest } from "./types";

export interface C2BSimulateResponse {
  ConversationID: string;
  OriginatorCoversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export async function simulateC2B(
  baseUrl: string,
  accessToken: string,
  request: C2BSimulateRequest
): Promise<C2BSimulateResponse> {
  const body = {
    ShortCode: request.shortCode,
    CommandID: "CustomerPayBillOnline",
    Amount: Math.round(request.amount),
    Msisdn: formatPhoneNumber(request.phoneNumber),
    BillRefNumber: request.billRefNumber ?? "default",
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
