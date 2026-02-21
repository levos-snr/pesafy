/**
 * Transaction Reversal
 * API: POST /mpesa/reversal/v1/request
 */

import { httpRequest } from "../../utils/http";
import type { ReversalRequest } from "./types";

export interface ReversalResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export async function processReversal(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: ReversalRequest
): Promise<ReversalResponse> {
  const body = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: "TransactionReversal",
    TransactionID: request.transactionId,
    Amount: Math.round(request.amount),
    ReceiverParty: request.shortCode,
    RecieverIdentifierType: 4,
    ResultURL: request.resultUrl,
    QueueTimeOutURL: request.timeoutUrl,
    Remarks: request.remarks ?? "Reversal",
    Occasion: request.occasion ?? "Reversal",
  };

  const { data } = await httpRequest<ReversalResponse>(
    `${baseUrl}/mpesa/reversal/v1/request`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
