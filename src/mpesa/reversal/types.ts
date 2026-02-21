/** Transaction Reversal types */

export interface ReversalRequest {
  transactionId: string;
  amount: number;
  shortCode: string;
  resultUrl: string;
  timeoutUrl: string;
  remarks?: string;
  occasion?: string;
}
