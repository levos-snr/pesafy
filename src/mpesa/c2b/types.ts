// src/mpesa/c2b/types.ts

export type C2BApiVersion = 'v1' | 'v2'

export type C2BResponseType = 'Completed' | 'Cancelled'

export interface C2BRegisterUrlRequest {
  shortCode: string

  responseType: C2BResponseType

  confirmationUrl: string

  validationUrl: string

  apiVersion?: C2BApiVersion
}

export interface C2BRegisterUrlResponse {
  /** Global unique identifier for this request */
  OriginatorCoversationID: string
  /** "0" = success */
  ResponseCode: string
  ResponseDescription: string
}

export type C2BCommandID = 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'

export interface C2BSimulateRequest {
  shortCode: string | number

  commandId: C2BCommandID

  amount: number

  msisdn: string | number

  billRefNumber?: string | null

  apiVersion?: C2BApiVersion
}

export interface C2BSimulateResponse {
  /** Global unique identifier for this request */
  OriginatorCoversationID: string
  /** "0" = accepted */
  ResponseCode: string
  ResponseDescription: string
}

export interface C2BValidationPayload {
  /** "Pay Bill" or "Buy Goods" */
  TransactionType: string
  /** Unique M-PESA transaction ID */
  TransID: string
  /** YYYYMMDDHHMMSS */
  TransTime: string
  /** Amount the customer is paying */
  TransAmount: string
  /** Your shortcode */
  BusinessShortCode: string
  /** Account reference (Paybill only) */
  BillRefNumber: string
  /** Invoice number (usually empty) */
  InvoiceNumber: string
  /**
   * Blank for validation requests.
   * Contains new balance after payment for confirmation requests.
   */
  OrgAccountBalance: string
  /** Third-party transaction ID (optional, can echo back in response) */
  ThirdPartyTransID: string
  /**
   * v1: SHA256-hashed MSISDN
   * v2: masked MSISDN e.g. "2547 ***** 126"
   */
  MSISDN: string
  FirstName: string
  MiddleName: string
  LastName: string
}

export type C2BValidationResultCode =
  | '0'
  | 'C2B00011'
  | 'C2B00012'
  | 'C2B00013'
  | 'C2B00014'
  | 'C2B00015'
  | 'C2B00016'

export interface C2BValidationResponse {
  ResultCode: C2BValidationResultCode

  ResultDesc: 'Accepted' | 'Rejected'

  ThirdPartyTransID?: string
}

// ── Confirmation Callback (POST to your ConfirmationURL) ─────────────────────

export interface C2BConfirmationPayload {
  TransactionType: string
  TransID: string
  TransTime: string
  TransAmount: string
  BusinessShortCode: string
  BillRefNumber: string
  InvoiceNumber: string
  /** New balance after payment */
  OrgAccountBalance: string
  ThirdPartyTransID: string

  MSISDN: string
  FirstName: string
  MiddleName: string
  LastName: string
}

/** Acknowledgement your ConfirmationURL must return to Safaricom */
export interface C2BConfirmationAck {
  /** Always 0 */
  ResultCode: 0
  /** Usually "Success" */
  ResultDesc: string
}
