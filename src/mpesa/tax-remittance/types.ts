/**
 * Tax Remittance types
 *
 * API: POST /mpesa/b2b/v1/remittax
 *
 * Daraja request body (from official Tax Remittance docs):
 * {
 *   "Initiator":             "TaxPayer",
 *   "SecurityCredential":    "...",
 *   "CommandID":             "PayTaxToKRA",
 *   "SenderIdentifierType":  "4",
 *   "RecieverIdentifierType":"4",
 *   "Amount":                "239",
 *   "PartyA":                "888880",
 *   "PartyB":                "572572",
 *   "AccountReference":      "353353",
 *   "Remarks":               "OK",
 *   "QueueTimeOutURL":       "https://mydomain.com/b2b/remittax/queue/",
 *   "ResultURL":             "https://mydomain.com/b2b/remittax/result/"
 * }
 *
 * NOTE: This is an ASYNCHRONOUS API.
 * The synchronous response only confirms Safaricom received the request.
 * The actual result arrives later via POST to your ResultURL.
 *
 * Ref: Tax Remittance — Daraja Developer Portal
 */

// ── Request ───────────────────────────────────────────────────────────────────

export interface TaxRemittanceRequest {
  /**
   * The transaction amount to remit to KRA.
   * Must be a whole number ≥ 1.
   * Daraja field: Amount
   */
  amount: number;

  /**
   * Your own M-PESA business shortcode from which the money is deducted.
   * Daraja field: PartyA
   */
  partyA: string;

  /**
   * The KRA account to which money is credited.
   * For Tax Remittance, only "572572" is allowed.
   * Defaults to "572572" if omitted.
   * Daraja field: PartyB
   */
  partyB?: string;

  /**
   * The Payment Registration Number (PRN) issued by KRA.
   * This is your tax declaration reference from KRA.
   * Daraja field: AccountReference
   */
  accountReference: string;

  /**
   * URL where Safaricom POSTs the final result after processing.
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
   * Optional remarks (up to 100 characters).
   * Daraja field: Remarks
   */
  remarks?: string;
}

// ── Synchronous response (request acknowledgement) ────────────────────────────

export interface TaxRemittanceResponse {
  /** Unique request identifier assigned by Daraja upon successful submission */
  OriginatorConversationID: string;
  /** Unique request identifier assigned by M-Pesa upon successful submission */
  ConversationID: string;
  /** "0" = successful submission */
  ResponseCode: string;
  /** Human-readable status description */
  ResponseDescription: string;
}

// ── Async result payload (POSTed to your ResultURL) ───────────────────────────

export interface TaxRemittanceResultParameter {
  Key:
    | "DebitAccountBalance"
    | "Amount"
    | "DebitPartyAffectedAccountBalance"
    | "TransCompletedTime"
    | "DebitPartyCharges"
    | "ReceiverPartyPublicName"
    | "Currency"
    | "InitiatorAccountCurrentBalance"
    | string;
  Value: string | number;
}

export interface TaxRemittanceResult {
  Result: {
    /** Usually "0" */
    ResultType: string;
    /** 0 = success */
    ResultCode: number;
    /** Human-readable result description */
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: TaxRemittanceResultParameter[];
    };
    ReferenceData?: {
      ReferenceItem:
        | { Key: string; Value: string }
        | Array<{ Key: string; Value: string }>;
    };
  };
}

// ── Error response (synchronous, on bad request) ──────────────────────────────

export interface TaxRemittanceErrorResponse {
  /** Unique request ID assigned by the API gateway */
  requestId: string;
  /** Daraja error code, e.g. "404.001.04" */
  errorCode: string;
  /** Human-readable error message, e.g. "Invalid Access Token" */
  errorMessage: string;
}
