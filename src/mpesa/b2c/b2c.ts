/**
 * B2C - Business to Customer payments
 * API: POST /mpesa/b2c/v3/paymentrequest
 */

import { httpRequest } from "../../utils/http";
import { formatPhoneNumber } from "../stk-push/utils";
import type { B2CRequest } from "./types";

export interface B2CResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export async function processB2C(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: B2CRequest
): Promise<B2CResponse> {
  const body = {
    OriginatorConversationID: `AG_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    InitiatorName: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: request.commandId ?? "BusinessPayment",
    Amount: Math.round(request.amount),
    PartyA: request.shortCode,
    PartyB: formatPhoneNumber(request.phoneNumber),
    Remarks: request.remarks ?? "Payment",
    QueueTimeOutURL: request.timeoutUrl,
    ResultURL: request.resultUrl,
    Occasion: request.occasion ?? "",
  };

  const { data } = await httpRequest<B2CResponse>(
    `${baseUrl}/mpesa/b2c/v3/paymentrequest`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
