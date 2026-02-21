/** B2C (Business to Customer) types */

export type B2CCommandId =
  | "BusinessPayment"
  | "SalaryPayment"
  | "PromotionPayment";

export interface B2CRequest {
  amount: number;
  phoneNumber: string;
  shortCode: string;
  resultUrl: string;
  timeoutUrl: string;
  commandId?: B2CCommandId;
  remarks?: string;
  occasion?: string;
}
