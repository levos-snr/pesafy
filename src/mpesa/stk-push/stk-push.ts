/**
 * src/mpesa/stk-push/stk-push.ts
 *
 * Initiates an STK Push (M-PESA Express) payment.
 *
 * Daraja endpoint: POST /mpesa/stkpush/v1/processrequest
 *
 * Transaction limits (Daraja docs):
 *   Min per transaction: KES 1
 *   Max per transaction: KES 250,000
 */

import { PesafyError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import { STK_PUSH_LIMITS, type StkPushRequest, type StkPushResponse } from './types'
import { formatPhoneNumber, getStkPushPassword, getTimestamp } from './utils'

export async function processStkPush(
  baseUrl: string,
  accessToken: string,
  request: StkPushRequest,
): Promise<StkPushResponse> {
  // ── Amount validation (Daraja transaction limits) ──────────────────────────

  const amount = Math.round(request.amount)

  if (!Number.isFinite(amount) || amount < STK_PUSH_LIMITS.MIN_AMOUNT) {
    throw new PesafyError({
      code: 'VALIDATION_ERROR',
      message:
        `Amount must be at least KES ${STK_PUSH_LIMITS.MIN_AMOUNT} ` +
        `(got ${request.amount} which rounds to ${amount}).`,
    })
  }

  if (amount > STK_PUSH_LIMITS.MAX_AMOUNT) {
    throw new PesafyError({
      code: 'VALIDATION_ERROR',
      message:
        `Amount must not exceed KES ${STK_PUSH_LIMITS.MAX_AMOUNT.toLocaleString()} per transaction ` +
        `as per Safaricom Daraja limits (got ${request.amount} which rounds to ${amount}).`,
    })
  }

  // ── Generate timestamp ONCE ─────────────────────────────────────────────────
  // The Password and Timestamp fields MUST use the same timestamp value.
  // Daraja format: YYYYMMDDHHmmss
  const timestamp = getTimestamp()

  // ── PartyB logic ────────────────────────────────────────────────────────────
  // CustomerPayBillOnline → PartyB = shortCode (Paybill number)
  // CustomerBuyGoodsOnline → PartyB = till number (passed as request.partyB)
  const partyB = request.partyB ?? request.shortCode

  // ── Build Daraja request body ───────────────────────────────────────────────
  // All 11 fields documented by Safaricom Daraja are present.
  const body = {
    BusinessShortCode: request.shortCode,
    Password: getStkPushPassword(request.shortCode, request.passKey, timestamp),
    Timestamp: timestamp,
    TransactionType: request.transactionType ?? 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: formatPhoneNumber(request.phoneNumber),
    PartyB: partyB,
    PhoneNumber: formatPhoneNumber(request.phoneNumber),
    CallBackURL: request.callbackUrl,
    // Daraja docs: AccountReference max 12 chars, TransactionDesc max 13 chars
    AccountReference: request.accountReference.slice(0, 12),
    TransactionDesc: request.transactionDesc.slice(0, 13),
  }

  // ── HTTP request ────────────────────────────────────────────────────────────
  // httpRequest retries 503/429/5xx with exponential backoff + jitter.
  // If all retries are exhausted it throws PesafyError with code "REQUEST_FAILED"
  // and statusCode 503. Never mark a transaction "failed" on a 503 — the
  // transaction may have been processed even if the acknowledgement was lost.
  const { data } = await httpRequest<StkPushResponse>(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
      // Daraja sandbox needs more retries and longer gaps due to instability
      retries: 5,
      retryDelay: 3_000,
    },
  )

  return data
}
