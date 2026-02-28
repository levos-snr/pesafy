/**
 * Transaction Status Query implementation
 */

import { createError } from "../../utils/errors";
import { httpClient } from "../../utils/http";
import { getTimestamp } from "../stk-push/utils";
import type {
  TransactionStatusRequest,
  TransactionStatusResponse,
} from "./types";

export async function queryTransactionStatus(
  baseUrl: string,
  token: string,
  securityCredential: string,
  initiator: string,
  request: TransactionStatusRequest
): Promise<TransactionStatusResponse> {
  if (!request.transactionId) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: "transactionId is required",
    });
  }

  const commandId = request.commandId || "TransactionStatusQuery";
  const timestamp = getTimestamp();
  const timeout = request.timeout || 30;

  const payload = {
    CommandID: commandId,
    OriginatorPartyName: initiator,
    SecurityCredential: securityCredential,
    TransactionID: request.transactionId,
    TransactionTimeOut: timeout,
    Remarks: request.remarks || "Transaction Status Query",
    Occasion: request.occasion || "",
    Timestamp: timestamp,
  };

  const endpoint = `${baseUrl}/mpesa/transactionstatus/v1/query`;

  return httpClient.post(endpoint, payload, {
    Authorization: `Bearer ${token}`,
  });
}
