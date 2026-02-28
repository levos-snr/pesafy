/**
 * Transaction Status Query types
 *
 * API: POST /mpesa/transactionstatus/v1/query
 *
 * Daraja request body (from official Postman collection):
 * {
 *   "Initiator":          "",
 *   "SecurityCredential": "",
 *   "CommandID":          "TransactionStatusQuery",
 *   "TransactionID":      "",
 *   "PartyA":             "",
 *   "IdentifierType":     "",
 *   "ResultURL":          "",
 *   "QueueTimeOutURL":    "",
 *   "Remarks":            "",
 *   "Occasion":           ""
 * }
 *
 * NOTE: This is an ASYNCHRONOUS API.
 * The synchronous response only confirms Safaricom received the request.
 * The actual transaction details arrive later via POST to your ResultURL.
 */

export interface TransactionStatusRequest {
  /** M-Pesa transaction ID to look up (e.g. "OEI2AK4XXXX") */
  transactionId: string;

  /**
   * The shortcode / MSISDN / Till receiving the query.
   * Usually your business shortcode.
   * Daraja field: PartyA
   */
  partyA: string;

  /**
   * Type of the partyA identifier.
   *   "1" = MSISDN
   *   "2" = Till Number (Buy Goods)
   *   "4" = Organisation ShortCode (Paybill / B2C) ← most common
   * Daraja field: IdentifierType
   */
  identifierType: "1" | "2" | "4";

  /**
   * URL where Safaricom POSTs the final result.
   * Must be publicly accessible.
   * Daraja field: ResultURL
   */
  resultUrl: string;

  /**
   * URL Safaricom calls when the request times out in the queue.
   * Must be publicly accessible.
   * Daraja field: QueueTimeOutURL
   */
  queueTimeOutUrl: string;

  /**
   * CommandID — always "TransactionStatusQuery".
   * Defaults to "TransactionStatusQuery" if omitted.
   */
  commandId?: string;

  /** Optional remarks (up to 100 characters) */
  remarks?: string;

  /** Optional occasion / reference */
  occasion?: string;
}

export interface TransactionStatusResponse {
  ResponseCode: string;
  ResponseDescription: string;
  ConversationID?: string;
  OriginatorConversationID?: string;
}

// ── Async result payload (POSTed to your ResultURL) ───────────────────────────

export interface TransactionStatusResultParameter {
  Key: string;
  Value: string | number;
}

export interface TransactionStatusResult {
  Result: {
    ResultType: string;
    /** "0" = success */
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: TransactionStatusResultParameter[];
    };
    ReferenceData?: {
      ReferenceItem:
        | { Key: string; Value: string }
        | Array<{ Key: string; Value: string }>;
    };
  };
}
