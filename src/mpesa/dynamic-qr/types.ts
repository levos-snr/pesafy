/**
 * Dynamic QR Code types
 *
 * API: POST /mpesa/qrcode/v1/generate
 *
 * Daraja request body:
 * {
 *   "MerchantName": "TEST SUPERMARKET",
 *   "RefNo":        "Invoice Test",
 *   "Amount":       1,
 *   "TrxCode":      "BG",
 *   "CPI":          "373132",
 *   "Size":         "300"
 * }
 *
 * Ref: Dynamic QR By Safaricom — Daraja Developer Portal
 */

/**
 * Transaction type codes for Dynamic QR.
 *
 *   BG: Pay Merchant (Buy Goods)
 *   WA: Withdraw Cash at Agent Till
 *   PB: Paybill or Business number
 *   SM: Send Money (Mobile number)
 *   SB: Sent to Business (Business number CPI in MSISDN format)
 */
export type QRTransactionCode = "BG" | "WA" | "PB" | "SM" | "SB";

export interface DynamicQRRequest {
  /**
   * Name of the Company / M-Pesa Merchant Name.
   * Daraja field: MerchantName
   */
  merchantName: string;

  /**
   * Transaction reference shown to the customer.
   * Daraja field: RefNo
   */
  refNo: string;

  /**
   * Total amount for the sale / transaction.
   * Daraja field: Amount
   */
  amount: number;

  /**
   * Transaction type code.
   *   "BG" — Pay Merchant (Buy Goods)
   *   "WA" — Withdraw Cash at Agent Till
   *   "PB" — Paybill or Business number
   *   "SM" — Send Money (Mobile number)
   *   "SB" — Sent to Business (MSISDN format CPI)
   * Daraja field: TrxCode
   */
  trxCode: QRTransactionCode;

  /**
   * Credit Party Identifier.
   * Can be a Mobile Number, Business Number, Agent Till,
   * Paybill / Business number, or Merchant Buy Goods number.
   * Daraja field: CPI
   */
  cpi: string;

  /**
   * Size of the QR code image in pixels (always square).
   * Defaults to "300" if omitted.
   * Daraja field: Size
   */
  size?: number;
}

export interface DynamicQRResponse {
  /** Transaction type identifier returned by Daraja */
  ResponseCode: string;
  /** Unique request identifier */
  RequestID: string;
  /** Human-readable status description */
  ResponseDescription: string;
  /**
   * Base64-encoded PNG of the QR code image.
   * Decode and render as an <img> or write to a .png file.
   */
  QRCode: string;
}
