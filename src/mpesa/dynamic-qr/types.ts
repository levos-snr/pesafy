/**
 * src/mpesa/dynamic-qr/types.ts
 *
 * Strict TypeScript types for the Safaricom Daraja Dynamic QR API.
 *
 * API endpoint: POST /mpesa/qrcode/v1/generate
 *
 * Daraja reference:
 *   https://developer.safaricom.co.ke/APIs/DynamicQRCode
 */

// ── Transaction codes ─────────────────────────────────────────────────────────

/**
 * Valid transaction type codes for Dynamic QR generation.
 *
 * | Code | Description                              |
 * |------|------------------------------------------|
 * | BG   | Pay Merchant – Buy Goods (till number)   |
 * | WA   | Withdraw Cash at Agent Till              |
 * | PB   | Paybill or Business number               |
 * | SM   | Send Money (mobile number)               |
 * | SB   | Send to Business (MSISDN-format CPI)     |
 */
export type QRTransactionCode = 'BG' | 'WA' | 'PB' | 'SM' | 'SB'

/** All valid QR transaction codes as a readonly tuple — useful for validation. */
export const QR_TRANSACTION_CODES = [
  'BG',
  'WA',
  'PB',
  'SM',
  'SB',
] as const satisfies readonly QRTransactionCode[]

// ── Request ───────────────────────────────────────────────────────────────────

/**
 * Parameters for generating a Dynamic QR code.
 *
 * Maps 1-to-1 to the Daraja API body (camelCase → Daraja PascalCase
 * conversion is handled inside `generateDynamicQR`).
 */
export interface DynamicQRRequest {
  /**
   * Name of the company / M-PESA merchant to embed in the QR.
   * Daraja field: `MerchantName`
   *
   * @example "TEST SUPERMARKET"
   */
  merchantName: string

  /**
   * Transaction reference shown to the customer on their phone.
   * Daraja field: `RefNo`
   *
   * @example "Invoice Test"
   * @example "INV-2024-001"
   */
  refNo: string

  /**
   * Total transaction amount in KES (whole numbers only — fractions are
   * rejected by Daraja). The value is rounded to the nearest integer
   * before being sent.
   * Daraja field: `Amount`
   *
   * @minimum 1
   * @example 500
   */
  amount: number

  /**
   * Transaction type code.
   *
   * - `"BG"` — Buy Goods (till number as CPI)
   * - `"WA"` — Withdraw Cash at Agent Till
   * - `"PB"` — Paybill / Business Number
   * - `"SM"` — Send Money (customer MSISDN as CPI)
   * - `"SB"` — Send to Business (MSISDN-format CPI)
   *
   * Daraja field: `TrxCode`
   */
  trxCode: QRTransactionCode

  /**
   * Credit Party Identifier — the destination of funds.
   *
   * The required format depends on `trxCode`:
   * - `BG` → till number
   * - `WA` → agent till number
   * - `PB` → paybill / business number
   * - `SM` → customer MSISDN (e.g. `"254712345678"`)
   * - `SB` → MSISDN-format business number
   *
   * Daraja field: `CPI`
   *
   * @example "373132"        // BG
   * @example "174379"        // PB
   * @example "254712345678"  // SM
   */
  cpi: string

  /**
   * Width (and height) of the generated QR code image in pixels.
   * The image is always square.
   *
   * Daraja field: `Size` (sent as a string, e.g. `"300"`)
   *
   * @default 300
   * @minimum 1
   * @maximum 1000
   * @example 300
   */
  size?: number
}

// ── Daraja wire format (internal) ─────────────────────────────────────────────

/**
 * The exact JSON body sent to the Daraja API.
 * @internal
 */
export interface DynamicQRDarajaPayload {
  MerchantName: string
  RefNo: string
  Amount: number
  TrxCode: QRTransactionCode
  CPI: string
  /** Daraja expects the size as a string despite being a number conceptually. */
  Size: string
}

// ── Response ──────────────────────────────────────────────────────────────────

/**
 * Successful response from the Daraja Dynamic QR API.
 */
export interface DynamicQRResponse {
  /**
   * Unique transaction identifier assigned by Daraja.
   * Daraja field: `ResponseCode`
   *
   * @example "AG_20191219_000043fdf61864fe9ff5"
   */
  ResponseCode: string

  /**
   * Internal Daraja request ID for tracing.
   * Daraja field: `RequestID`
   *
   * @example "16738-27456357-1"
   */
  RequestID: string

  /**
   * Human-readable status message.
   * Daraja field: `ResponseDescription`
   *
   * @example "QR Code Successfully Generated."
   */
  ResponseDescription: string

  /**
   * Base64-encoded PNG of the QR code image.
   *
   * Render in a browser:
   * ```html
   * <img src="data:image/png;base64,{QRCode}" />
   * ```
   *
   * Or write to disk:
   * ```ts
   * import { writeFileSync } from 'node:fs'
   * writeFileSync('qr.png', Buffer.from(response.QRCode, 'base64'))
   * ```
   *
   * Daraja field: `QRCode`
   */
  QRCode: string
}

// ── Error response ────────────────────────────────────────────────────────────

/**
 * Error response structure returned by the Daraja API.
 *
 * Known error codes from Daraja docs:
 * | Code       | Name                        | Cause                            |
 * |------------|-----------------------------|----------------------------------|
 * | 404.001.04 | Invalid Authentication Header | Wrong HTTP method or bad headers |
 * | 400.002.05 | Invalid Request Payload      | Malformed request body           |
 * | 400.003.01 | Invalid Access Token         | Token expired or incorrect       |
 */
export interface DynamicQRErrorResponse {
  /** Daraja error code string, e.g. `"400.002.05"` */
  errorCode: string
  /** Human-readable error message from Daraja */
  errorMessage: string
  /** Optional request ID for support tracing */
  requestId?: string
}

// ── Validation result ─────────────────────────────────────────────────────────

/** Successful validation — no errors present. */
export type ValidationOk = { readonly valid: true }

/** Failed validation — one or more field errors. */
export type ValidationFail = {
  readonly valid: false
  /** Map of field name → error message */
  readonly errors: Readonly<Record<string, string>>
}

export type ValidationResult = ValidationOk | ValidationFail
