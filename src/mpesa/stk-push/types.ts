/** STK Push (M-Pesa Express) types */

export type TransactionType =
  | "CustomerPayBillOnline"
  | "CustomerBuyGoodsOnline";

export interface StkPushRequest {
  amount: number;
  phoneNumber: string;
  callbackUrl: string;
  accountReference: string;
  transactionDesc: string;
  /** Business shortcode - Paybill or Till number */
  shortCode: string;
  passKey: string;
  transactionType?: TransactionType;
}

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface StkQueryRequest {
  checkoutRequestId: string;
  shortCode: string;
  passKey: string;
}

export interface StkQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}
