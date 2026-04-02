import type {
  C2BConfirmationAck,
  C2BConfirmationPayload,
  C2BValidationPayload,
  C2BValidationResponse,
  C2BValidationResultCode,
} from './types'

export function isC2BPayload(body: unknown): body is C2BValidationPayload {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b['TransID'] === 'string' &&
    typeof b['BusinessShortCode'] === 'string' &&
    typeof b['TransAmount'] === 'string'
  )
}

export function acceptC2BValidation(thirdPartyTransID?: string): C2BValidationResponse {
  return {
    ResultCode: '0',
    ResultDesc: 'Accepted',
    ...(thirdPartyTransID ? { ThirdPartyTransID: thirdPartyTransID } : {}),
  }
}

export function rejectC2BValidation(
  resultCode: Exclude<C2BValidationResultCode, '0'> = 'C2B00016',
  resultDesc: 'Rejected' = 'Rejected',
): C2BValidationResponse {
  return {
    ResultCode: resultCode,
    ResultDesc: resultDesc,
  }
}

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
