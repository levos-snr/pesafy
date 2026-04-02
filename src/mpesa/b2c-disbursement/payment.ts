/**
 * src/mpesa/b2c-disbursement/payment.ts
 *
 * Initiates a B2C Disbursement payment (Salary / Cashback / Promotion).
 * Endpoint: POST /mpesa/b2c/v3/paymentrequest
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { B2CDisbursementRequest, B2CDisbursementResponse } from './types'

const B2C_DISBURSEMENT_ENDPOINT = '/mpesa/b2c/v3/paymentrequest'

const VALID_COMMAND_IDS = new Set(['BusinessPayment', 'SalaryPayment', 'PromotionPayment'])

/**
 * Initiates a B2C disbursement payment request.
 *
 * @param baseUrl              - Daraja base URL (sandbox or production)
 * @param accessToken          - Valid OAuth Bearer token
 * @param securityCredential   - RSA-encrypted initiator password (base64)
 * @param initiatorName        - M-Pesa API operator username
 * @param request              - B2C disbursement request parameters
 */
export async function initiateB2CDisbursement(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: B2CDisbursementRequest,
): Promise<B2CDisbursementResponse> {
  // ── Validate CommandID ──────────────────────────────────────────────────────
  if (!request.commandId || !VALID_COMMAND_IDS.has(request.commandId)) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        `commandId must be one of: BusinessPayment, SalaryPayment, PromotionPayment. ` +
        `Got "${request.commandId}".`,
    })
  }

  // ── Validate amount ─────────────────────────────────────────────────────────
  const amount = Math.round(request.amount)
  if (!Number.isFinite(amount) || amount < 10) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: `amount must be ≥ 10 KES (got ${request.amount} which rounds to ${amount}).`,
    })
  }

  // ── Validate OriginatorConversationID ──────────────────────────────────────
  if (!request.originatorConversationId?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'originatorConversationId is required — a unique ID per request.',
    })
  }

  // ── Validate required string fields ────────────────────────────────────────
  if (!request.partyA?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'partyA is required — the sending organisation shortcode.',
    })
  }

  if (!request.partyB?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'partyB is required — the receiving customer MSISDN (2547XXXXXXXX).',
    })
  }

  if (!request.remarks?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'remarks is required (2–100 characters).',
    })
  }

  if (!request.resultUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'resultUrl is required — Safaricom POSTs the async result here.',
    })
  }

  if (!request.queueTimeOutUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'queueTimeOutUrl is required — Safaricom calls this on request timeout.',
    })
  }

  // ── Build payload ───────────────────────────────────────────────────────────
  const payload: Record<string, unknown> = {
    OriginatorConversationID: request.originatorConversationId,
    InitiatorName: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: request.commandId,
    Amount: amount,
    PartyA: String(request.partyA),
    PartyB: String(request.partyB),
    Remarks: request.remarks,
    QueueTimeOutURL: request.queueTimeOutUrl,
    ResultURL: request.resultUrl,
  }

  // Occassion is optional (sic — Daraja typo preserved)
  if (request.occasion?.trim()) {
    payload['Occassion'] = request.occasion
  }

  const { data } = await httpRequest<B2CDisbursementResponse>(
    `${baseUrl}${B2C_DISBURSEMENT_ENDPOINT}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )

  return data
}
