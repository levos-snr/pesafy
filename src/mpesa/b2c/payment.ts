/**
 * src/mpesa/b2c/payment.ts
 *
 * Initiates a B2C Account Top Up via Safaricom Daraja.
 * Endpoint: POST /mpesa/b2b/v1/paymentrequest
 *
 * Strictly follows the Safaricom Daraja B2C Account Top Up API documentation:
 *   - CommandID must be "BusinessPayToBulk"
 *   - SenderIdentifierType is always "4" (hardcoded per docs)
 *   - RecieverIdentifierType is always "4" (hardcoded per docs)
 *   - Amount is sent as a string per the JSON spec
 *   - Requester is optional
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { B2CRequest, B2CResponse } from './types'

/** The only endpoint documented for this API */
const B2C_ENDPOINT = '/mpesa/b2b/v1/paymentrequest'

/**
 * Per documentation: SenderIdentifierType and RecieverIdentifierType
 * must always be "4" (Organisation ShortCode). Not configurable.
 */
const IDENTIFIER_TYPE = '4' as const

/**
 * Initiates a B2C Account Top Up payment request.
 *
 * @param baseUrl         - Daraja base URL (sandbox or production)
 * @param accessToken     - Valid OAuth Bearer token
 * @param securityCredential - RSA-encrypted initiator password (base64)
 * @param initiatorName   - M-Pesa API operator username with B2B role
 * @param request         - B2C top-up request parameters
 * @returns               Synchronous acknowledgement response from Daraja
 * @throws {PesafyError}  VALIDATION_ERROR for invalid input before HTTP call
 * @throws {PesafyError}  From httpRequest on network / API errors
 */
export async function initiateB2CPayment(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: B2CRequest,
): Promise<B2CResponse> {
  // ── Validate CommandID ──────────────────────────────────────────────────────
  // Documentation: "Use BusinessPayToBulk only"
  if (!request.commandId || request.commandId !== 'BusinessPayToBulk') {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'commandId must be "BusinessPayToBulk". ' +
        'This is the only CommandID supported by the B2C Account Top Up API.',
    })
  }

  // ── Validate amount ─────────────────────────────────────────────────────────
  const amount = Math.round(request.amount)
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        `amount must be a whole number ≥ 1 ` + `(got ${request.amount} which rounds to ${amount}).`,
    })
  }

  // ── Validate required string fields ────────────────────────────────────────
  if (!request.partyA?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'partyA is required — the sender shortcode from which funds are deducted.',
    })
  }

  if (!request.partyB?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'partyB is required — the receiver B2C shortcode that receives the funds.',
    })
  }

  if (!request.accountReference?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'accountReference is required — a reference for this transaction.',
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

  // ── Build payload matching Daraja spec exactly ──────────────────────────────
  //
  // Field mapping (camelCase → Daraja PascalCase):
  //   commandId          → CommandID         ("BusinessPayToBulk")
  //   partyA             → PartyA            (string)
  //   partyB             → PartyB            (string)
  //   accountReference   → AccountReference  (string)
  //   requester          → Requester         (string, omitted if not provided)
  //   remarks            → Remarks           (string)
  //   resultUrl          → ResultURL         (string)
  //   queueTimeOutUrl    → QueueTimeOutURL   (string)
  //   amount             → Amount            (string per JSON sample in docs)
  //
  // Hardcoded per docs:
  //   SenderIdentifierType   → "4"
  //   RecieverIdentifierType → "4"

  const payload: Record<string, unknown> = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: request.commandId,
    SenderIdentifierType: IDENTIFIER_TYPE,
    RecieverIdentifierType: IDENTIFIER_TYPE,
    Amount: String(amount),
    PartyA: String(request.partyA),
    PartyB: String(request.partyB),
    AccountReference: request.accountReference,
    Remarks: request.remarks ?? 'B2C Account Top Up',
    QueueTimeOutURL: request.queueTimeOutUrl,
    ResultURL: request.resultUrl,
  }

  // Requester is optional — only included when explicitly provided (per docs)
  if (request.requester?.trim()) {
    payload['Requester'] = String(request.requester)
  }

  const { data } = await httpRequest<B2CResponse>(`${baseUrl}${B2C_ENDPOINT}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: payload,
  })

  return data
}
