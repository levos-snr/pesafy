// src/mpesa/c2b/webhooks.ts

/**
 * C2B Webhook Handlers
 *
 * Utilities for parsing and responding to Safaricom C2B callbacks:
 *   - Validation callback  → your ValidationURL
 *   - Confirmation callback → your ConfirmationURL
 *
 * Safaricom IP whitelist applies (same as STK Push callbacks).
 * Always respond 200 to Safaricom — log errors internally.
 *
 * Validation response timing: must respond within ~8 seconds.
 *
 * Ref: C2B Daraja docs — Callback Payload section
 */

import type {
  C2BConfirmationAck,
  C2BConfirmationPayload,
  C2BValidationPayload,
  C2BValidationResponse,
  C2BValidationResultCode,
} from './types'

// ── Type guards ───────────────────────────────────────────────────────────────

/**
 * Checks if a body looks like a C2B Validation or Confirmation payload.
 * Both share the same shape; distinguish them by context (which URL received it).
 */
export function isC2BPayload(body: unknown): body is C2BValidationPayload {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b['TransID'] === 'string' &&
    typeof b['BusinessShortCode'] === 'string' &&
    typeof b['TransAmount'] === 'string'
  )
}

// ── Validation responses ──────────────────────────────────────────────────────

/**
 * Builds an "Accept" validation response.
 * Send this to M-PESA to allow the transaction to proceed.
 *
 * @param thirdPartyTransID - Optional correlation ID echoed back in Confirmation.
 */
export function acceptC2BValidation(thirdPartyTransID?: string): C2BValidationResponse {
  return {
    ResultCode: '0',
    ResultDesc: 'Accepted',
    ...(thirdPartyTransID ? { ThirdPartyTransID: thirdPartyTransID } : {}),
  }
}

/**
 * Builds a "Reject" validation response.
 * Send this to M-PESA to cancel the transaction.
 *
 * @param resultCode    - C2B error code. Determines the SMS the customer gets.
 * @param resultDesc    - Short description. Must be "Rejected".
 *
 * Result codes:
 *   C2B00011 — Invalid MSISDN
 *   C2B00012 — Invalid Account Number
 *   C2B00013 — Invalid Amount
 *   C2B00014 — Invalid KYC Details
 *   C2B00015 — Invalid Short code
 *   C2B00016 — Other Error
 */
export function rejectC2BValidation(
  resultCode: Exclude<C2BValidationResultCode, '0'> = 'C2B00016',
  resultDesc: 'Rejected' = 'Rejected',
): C2BValidationResponse {
  return {
    ResultCode: resultCode,
    ResultDesc: resultDesc,
  }
}

/**
 * Builds the acknowledgement your ConfirmationURL must return to Safaricom.
 * Always return this with HTTP 200.
 */
export function acknowledgeC2BConfirmation(): C2BConfirmationAck {
  return { ResultCode: 0, ResultDesc: 'Success' }
}

// ── Convenience extractors ────────────────────────────────────────────────────

/** Extracts the transaction amount as a number from a C2B payload */
export function getC2BAmount(payload: C2BValidationPayload | C2BConfirmationPayload): number {
  return Number(payload.TransAmount)
}

/** Extracts the M-PESA receipt/transaction ID from a C2B payload */
export function getC2BTransactionId(
  payload: C2BValidationPayload | C2BConfirmationPayload,
): string {
  return payload.TransID
}

/** Extracts the account reference (BillRefNumber) from a C2B payload */
export function getC2BAccountRef(payload: C2BValidationPayload | C2BConfirmationPayload): string {
  return payload.BillRefNumber
}

/**
 * Returns the customer's full name from a C2B payload.
 * Note: data minimization per Safaricom data protection requirements;
 * some fields may be blank.
 */
export function getC2BCustomerName(payload: C2BValidationPayload | C2BConfirmationPayload): string {
  return [payload.FirstName, payload.MiddleName, payload.LastName].filter(Boolean).join(' ').trim()
}

/** Returns true if the C2B payload is a Paybill payment */
export function isPaybillPayment(payload: C2BValidationPayload | C2BConfirmationPayload): boolean {
  return (
    payload.TransactionType === 'Pay Bill' || payload.TransactionType === 'CustomerPayBillOnline'
  )
}

/** Returns true if the C2B payload is a Buy Goods (Till) payment */
export function isBuyGoodsPayment(payload: C2BValidationPayload | C2BConfirmationPayload): boolean {
  return (
    payload.TransactionType === 'Buy Goods' || payload.TransactionType === 'CustomerBuyGoodsOnline'
  )
}
