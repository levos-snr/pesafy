/** B2B (Business to Business) types */

export type B2BCommandId =
  | "BusinessPayBill"
  | "BusinessBuyGoods"
  | "DisburseFundsToBusiness"
  | "BusinessToBusinessTransfer";

export interface B2BRequest {
  amount: number;
  shortCode: string;
  receiverShortCode: string;
  resultUrl: string;
  timeoutUrl: string;
  commandId?: B2BCommandId;
  senderIdentifierType?: number;
  receiverIdentifierType?: number;
  remarks?: string;
  accountReference?: string;
}
