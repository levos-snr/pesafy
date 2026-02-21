/**
 * M-Pesa Express (STK Push) - Initiates payment prompt on customer's phone
 * API: POST /mpesa/stkpush/v1/processrequest
 */

import { httpRequest } from "../../utils/http";
import type { StkPushRequest, StkPushResponse } from "./types";
import { formatPhoneNumber, getStkPushPassword, getTimestamp } from "./utils";

export async function processStkPush(
  baseUrl: string,
  accessToken: string,
  request: StkPushRequest
): Promise<StkPushResponse> {
  const body = {
    BusinessShortCode: request.shortCode,
    Password: getStkPushPassword(request.shortCode, request.passKey),
    Timestamp: getTimestamp(),
    TransactionType: request.transactionType ?? "CustomerPayBillOnline",
    Amount: Math.round(request.amount),
    PartyA: formatPhoneNumber(request.phoneNumber),
    PartyB: request.shortCode,
    PhoneNumber: formatPhoneNumber(request.phoneNumber),
    CallBackURL: request.callbackUrl,
    AccountReference: request.accountReference.slice(0, 12),
    TransactionDesc: request.transactionDesc.slice(0, 13),
  };

  const { data } = await httpRequest<StkPushResponse>(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
