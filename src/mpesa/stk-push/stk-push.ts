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
  // Generate timestamp ONCE — must be identical in both Password and Timestamp fields.
  // Safaricom validates that Base64(Shortcode+Passkey+Timestamp) matches the
  // Timestamp field; generating two separate timestamps causes auth failures.
  const timestamp = getTimestamp();

  // For CustomerBuyGoodsOnline (Till Number), PartyB is the till number.
  // For CustomerPayBillOnline (Paybill), PartyB is the shortcode.
  // Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
  const partyB = request.partyB ?? request.shortCode;

  const body = {
    BusinessShortCode: request.shortCode,
    Password: getStkPushPassword(request.shortCode, request.passKey, timestamp),
    Timestamp: timestamp,
    TransactionType: request.transactionType ?? "CustomerPayBillOnline",
    Amount: Math.round(request.amount),
    PartyA: formatPhoneNumber(request.phoneNumber),
    PartyB: partyB,
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
