// 📁 PATH: src/mpesa/reversal/types.ts

/**
 * Transaction Reversal types
 *
 * API: POST /mpesa/reversal/v1/request
 *
 * Reverses a completed M-PESA transaction. The result is asynchronous —
 * POSTed to your ResultURL after processing.
 *
 * Required org portal role: "Reversal ORG API initiator"
 *
 * Reversal identifiers:
 *   "1" = MSISDN (customer phone)
 *   "2" = Till Number
 *   "4" = Organisation ShortCode (Paybill / B2C)
 *   "11" = Reversal (used internally by Daraja — not for request)
 *
 * Ref: Transaction Reversal — Daraja Developer Portal
 */

export interface ReversalRequest {
  /**
   * The M-PESA transaction ID to reverse (e.g. "OEI2AK4XXXX").
   * Daraja field: TransactionID
   */
  transactionId: string;

  /**
   * Your business shortcode requesting the reversal.
   * Daraja field: ReceiverParty
   */
  receiverParty: string;

  /**
   * Identifier type for ReceiverParty.
   *   "1" = MSISDN
   *   "2" = Till Number
   *   "4" = Organisation ShortCode
   * Daraja field: RecieverIdentifierType
   */
  receiverIdentifierType: "1" | "2" | "4";

  /**
   * URL where Safaricom POSTs the reversal result.
   * Daraja field: ResultURL
   */
  resultUrl: string;

  /**
   * URL called when the request times out in the queue.
   * Daraja field: QueueTimeOutURL
   */
  queueTimeOutUrl: string;

  /**
   * Amount to reverse. Must equal the original transaction amount.
   * Daraja field: Amount
   */
  amount: number;

  /** Short remarks (up to 100 characters) */
  remarks?: string;

  /** Additional occasion string */
  occasion?: string;
}

// ── Synchronous acknowledgement ───────────────────────────────────────────────

export interface ReversalResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  /** "0" = request accepted */
  ResponseCode: string;
  ResponseDescription: string;
}

// ── Async result (POSTed to ResultURL) ───────────────────────────────────────

export interface ReversalResult {
  Result: {
    ResultType: string;
    /** 0 = success */
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{ Key: string; Value: string | number }>;
    };
    ReferenceData?: {
      ReferenceItem: { Key: string; Value: string } | Array<{ Key: string; Value: string }>;
    };
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isReversalSuccess(result: ReversalResult): boolean {
  return result.Result.ResultCode === 0;
}

export function getReversalTransactionId(result: ReversalResult): string | null {
  return result.Result.TransactionID ?? null;
}

export function getReversalConversationId(result: ReversalResult): string {
  return result.Result.ConversationID;
}
