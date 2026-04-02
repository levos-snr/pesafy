/**
 * src/mpesa/c2b/webhooks.ts
 *
 * C2B webhook callback helpers.
 *
 * Daraja posts callbacks with TransactionType of "Pay Bill" or "Buy Goods"
 * (NOT the CommandID strings "CustomerPayBillOnline" / "CustomerBuyGoodsOnline").
 * This file strictly reflects what the docs say about the callback payload.
 */

import type {
  C2BConfirmationAck,
  C2BConfirmationPayload,
  C2BValidationPayload,
  C2BValidationResponse,
  C2BValidationResultCode,
} from './types'

// ── Type guard ────────────────────────────────────────────────────────────────

/**
 * Returns true if `body` looks like a valid C2B callback payload.
 * Works for both Validation and Confirmation payloads.
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

// ── Validation response helpers ───────────────────────────────────────────────

/**
 * Builds an "accept" validation response.
 *
 * Per Daraja docs:
 *   { "ResultCode": "0", "ResultDesc": "Accepted" }
 *
 * @param thirdPartyTransID - Optional: echo back the ThirdPartyTransID received
 *   in the validation request. M-PESA includes it in the confirmation callback.
 */
export function acceptC2BValidation(thirdPartyTransID?: string): C2BValidationResponse {
  return {
    ResultCode: '0',
    ResultDesc: 'Accepted',
    ...(thirdPartyTransID ? { ThirdPartyTransID: thirdPartyTransID } : {}),
  }
}

/**
 * Builds a "reject" validation response.
 *
 * Per Daraja docs:
 *   { "ResultCode": "C2B00011", "ResultDesc": "Rejected" }
 *
 * Use specific result codes so customers receive appropriate error messages:
 *   C2B00011 — Invalid MSISDN
 *   C2B00012 — Invalid Account Number
 *   C2B00013 — Invalid Amount
 *   C2B00014 — Invalid KYC Details
 *   C2B00015 — Invalid Short code
 *   C2B00016 — Other Error
 *
 * @param resultCode - Must NOT be "0". Defaults to "C2B00016" (Other Error).
 */
export function rejectC2BValidation(
  resultCode: Exclude<C2BValidationResultCode, '0'> = 'C2B00016',
): C2BValidationResponse {
  return {
    ResultCode: resultCode,
    ResultDesc: 'Rejected',
  }
}

/**
 * Builds the confirmation acknowledgement your ConfirmationURL must return.
 * Always respond with ResultCode 0 to acknowledge receipt.
 */
export function acknowledgeC2BConfirmation(): C2BConfirmationAck {
  return { ResultCode: 0, ResultDesc: 'Success' }
}

// ── Payload extractors ────────────────────────────────────────────────────────

/**
 * Extracts the transaction amount as a number from a C2B callback payload.
 * TransAmount is a string in the payload (e.g. "5.00").
 */
export function getC2BAmount(payload: C2BValidationPayload | C2BConfirmationPayload): number {
  return Number(payload.TransAmount)
}

/** Extracts the M-PESA transaction ID (receipt) from a C2B callback payload. */
export function getC2BTransactionId(
  payload: C2BValidationPayload | C2BConfirmationPayload,
): string {
  return payload.TransID
}

/** Extracts the account reference (BillRefNumber) from a C2B callback payload. */
export function getC2BAccountRef(payload: C2BValidationPayload | C2BConfirmationPayload): string {
  return payload.BillRefNumber
}

/**
 * Returns the customer's full name from a C2B callback payload.
 * Joins FirstName, MiddleName, LastName; skips empty parts.
 */
export function getC2BCustomerName(payload: C2BValidationPayload | C2BConfirmationPayload): string {
  return [payload.FirstName, payload.MiddleName, payload.LastName].filter(Boolean).join(' ').trim()
}

/**
 * Returns true if the payload is a Paybill payment.
 *
 * Per Daraja docs, the callback TransactionType for Paybill is "Pay Bill".
 */
export function isPaybillPayment(payload: C2BValidationPayload | C2BConfirmationPayload): boolean {
  return payload.TransactionType === 'Pay Bill'
}

/**
 * Returns true if the payload is a Buy Goods (Till) payment.
 *
 * Per Daraja docs, the callback TransactionType for Buy Goods is "Buy Goods".
 */
export function isBuyGoodsPayment(payload: C2BValidationPayload | C2BConfirmationPayload): boolean {
  return payload.TransactionType === 'Buy Goods'
}
