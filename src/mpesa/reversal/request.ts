/**
 * src/mpesa/reversal/request.ts
 *
 * Transaction Reversal — reverses a completed M-PESA C2B transaction.
 *
 * API: POST /mpesa/reversal/v1/request
 *
 * ASYNCHRONOUS: The synchronous response is acknowledgement only.
 * The actual reversal result is POSTed to your ResultURL after processing.
 *
 * Per Daraja docs:
 *   - CommandID is always "TransactionReversal"
 *   - RecieverIdentifierType is always "11" (Organisation ShortCode for reversals)
 *   - Amount is sent as a string per the Daraja sample payload
 *   - Remarks must be 2–100 characters
 *   - Cannot be used for B2C reversals (those are done on the M-PESA portal)
 *
 * Required org portal role: "Org Reversals Initiator"
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import {
  REVERSAL_COMMAND_ID,
  REVERSAL_RECEIVER_IDENTIFIER_TYPE,
  type ReversalRequest,
  type ReversalResponse,
} from './types'

/**
 * Submits a transaction reversal request to Safaricom Daraja.
 *
 * This API reverses Customer-to-Business (C2B) transactions only.
 * B2C reversals must be handled manually via the M-PESA organisation portal.
 *
 * Process flow (per Daraja docs):
 * 1. Your system → Daraja: POST /mpesa/reversal/v1/request (this function)
 * 2. Daraja → M-PESA: forwards and authenticates the request
 * 3. M-PESA: processes the reversal, refunds the customer, sends SMS
 * 4. M-PESA → Daraja → your ResultURL: asynchronous result callback
 *
 * @param baseUrl           - Daraja environment base URL
 * @param accessToken       - Valid OAuth bearer token from Authorization API
 * @param securityCredential - RSA-encrypted initiator password (Base64)
 * @param initiatorName     - API operator username (must have Org Reversals Initiator role)
 * @param request           - Reversal parameters
 * @returns                 - Synchronous acknowledgement (ResponseCode "0" = accepted)
 *
 * @throws {PesafyError} VALIDATION_ERROR when required fields are missing or invalid
 * @throws {PesafyError} API_ERROR / REQUEST_FAILED on Daraja HTTP errors
 */
export async function requestReversal(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: ReversalRequest,
): Promise<ReversalResponse> {
  // ── transactionId ──────────────────────────────────────────────────────────
  if (!request.transactionId?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'transactionId is required — the M-PESA receipt number of the transaction to reverse ' +
        '(e.g. "PDU91HIVIT"). Daraja field: TransactionID.',
    })
  }

  // ── receiverParty ──────────────────────────────────────────────────────────
  if (!request.receiverParty?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'receiverParty is required — your organisation shortcode (Paybill or Till number). ' +
        'Daraja field: ReceiverParty.',
    })
  }

  // ── receiverIdentifierType ─────────────────────────────────────────────────
  // Per Daraja docs: "RecieverIdentifierType: Type of Organization (should be '11')".
  // Only "11" is valid for the Reversals API. If the caller supplies a different
  // value it is an error — we never silently override an explicit wrong value.
  if (
    request.receiverIdentifierType !== undefined &&
    request.receiverIdentifierType !== REVERSAL_RECEIVER_IDENTIFIER_TYPE
  ) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        `receiverIdentifierType must be "${REVERSAL_RECEIVER_IDENTIFIER_TYPE}" for the Reversals API ` +
        `(per Daraja docs: "Type of Organization, should be '11'"). ` +
        `Got: "${String(request.receiverIdentifierType)}".`,
    })
  }

  // ── amount ─────────────────────────────────────────────────────────────────
  const amount = Math.round(request.amount)
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        `amount must be a whole number ≥ 1 (got ${request.amount}). ` +
        'The amount must equal the original transaction amount.',
    })
  }

  // ── resultUrl ──────────────────────────────────────────────────────────────
  if (!request.resultUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'resultUrl is required — the public URL where Safaricom will POST the reversal result. ' +
        'Daraja field: ResultURL.',
    })
  }

  // ── queueTimeOutUrl ────────────────────────────────────────────────────────
  if (!request.queueTimeOutUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'queueTimeOutUrl is required — the public URL called when the request times out in the queue. ' +
        'Daraja field: QueueTimeOutURL.',
    })
  }

  // ── remarks validation (2–100 chars per docs) ──────────────────────────────
  const remarks = request.remarks ?? 'Transaction Reversal'
  if (remarks.length < 2 || remarks.length > 100) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        `remarks must be between 2 and 100 characters (got ${remarks.length}). ` +
        'Daraja field: Remarks.',
    })
  }

  // ── Build payload — strictly matching Daraja docs field names ──────────────
  //
  // RecieverIdentifierType: always "11" per docs.
  // Amount: sent as string per Daraja sample payload ("Amount": "200").
  // CommandID: always "TransactionReversal" per docs.
  //
  const payload: Record<string, unknown> = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: REVERSAL_COMMAND_ID,
    TransactionID: request.transactionId,
    Amount: String(amount),
    ReceiverParty: String(request.receiverParty),
    RecieverIdentifierType: REVERSAL_RECEIVER_IDENTIFIER_TYPE,
    ResultURL: request.resultUrl,
    QueueTimeOutURL: request.queueTimeOutUrl,
    Remarks: remarks,
  }

  // Occasion is optional — only include it when explicitly provided
  if (request.occasion !== undefined && request.occasion !== null) {
    payload['Occasion'] = request.occasion
  }

  const { data } = await httpRequest<ReversalResponse>(`${baseUrl}/mpesa/reversal/v1/request`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: payload,
  })

  return data
}
