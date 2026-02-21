/** Transaction Status Query types */

export interface TransactionStatusRequest {
  shortCode: string;
  transactionId: string;
  resultUrl: string;
  timeoutUrl: string;
  identifierType?: number;
}
