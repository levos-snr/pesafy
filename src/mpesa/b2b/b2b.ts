/**
 * B2B - Business to Business payments
 * API: POST /mpesa/b2b/v1/paymentrequest
 */

import { httpRequest } from "../../utils/http";
import type { B2BRequest } from "./types";

export interface B2BResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export async function processB2B(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: B2BRequest
): Promise<B2BResponse> {
  const body = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: request.commandId ?? "BusinessPayBill",
    SenderIdentifierType: request.senderIdentifierType ?? 4,
    RecieverIdentifierType: request.receiverIdentifierType ?? 4,
    Amount: Math.round(request.amount),
    PartyA: request.shortCode,
    PartyB: request.receiverShortCode,
    AccountReference: request.accountReference ?? "",
    Remarks: request.remarks ?? "B2B Payment",
    QueueTimeOutURL: request.timeoutUrl,
    ResultURL: request.resultUrl,
  };

  const { data } = await httpRequest<B2BResponse>(
    `${baseUrl}/mpesa/b2b/v1/paymentrequest`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
