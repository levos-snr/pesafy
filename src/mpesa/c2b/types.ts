/** C2B (Customer to Business) types */

export interface C2BRegisterUrlRequest {
  shortCode: string;
  confirmationUrl: string;
  validationUrl: string;
  responseType?: "Completed" | "Cancelled";
}

export interface C2BSimulateRequest {
  shortCode: string;
  amount: number;
  phoneNumber: string;
  billRefNumber?: string;
}
