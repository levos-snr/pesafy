/**
 * Transaction Status Query
 * API: POST /mpesa/transactionstatus/v1/query
 */

import { httpRequest } from "../../utils/http";
import type { TransactionStatusRequest } from "./types";

export interface TransactionStatusResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export async function queryTransactionStatus(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: TransactionStatusRequest
): Promise<TransactionStatusResponse> {
  const body = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: "TransactionStatusQuery",
    TransactionID: request.transactionId,
    PartyA: request.shortCode,
    IdentifierType: request.identifierType ?? 4,
    ResultURL: request.resultUrl,
    QueueTimeOutURL: request.timeoutUrl,
    Remarks: "Status",
    Occasion: "Query",
  };

  const { data } = await httpRequest<TransactionStatusResponse>(
    `${baseUrl}/mpesa/transactionstatus/v1/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
