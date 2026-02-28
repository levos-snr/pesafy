/**
 * Transaction Status Query types
 * Check the status of a previously initiated M-Pesa transaction
 */

export interface TransactionStatusRequest {
  /** The M-Pesa transaction ID to query */
  transactionId: string;
  /** Unique identifier for the transaction */
  commandId?: string;
  /** Remarks/description about the transaction */
  remarks?: string;
  /** Timeout for the request in seconds (default: 30) */
  timeout?: number;
  /** Occasion for the transaction */
  occasion?: string;
}

export interface TransactionStatusResponse {
  ResponseCode: string;
  ResponseDescription: string;
  ConversationID?: string;
  OriginatorConversationID?: string;
}
