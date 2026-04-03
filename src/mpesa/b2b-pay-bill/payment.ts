/**
 * src/mpesa/b2b-pay-bill/payment.ts
 *
 * Initiates a Business Pay Bill payment via Safaricom Daraja.
 * Endpoint: POST /mpesa/b2b/v1/paymentrequest
 *
 * Strictly follows the Safaricom Daraja Business Pay Bill API documentation:
 *   - CommandID must be "BusinessPayBill"
 *   - SenderIdentifierType is always "4" (hardcoded per docs)
 *   - RecieverIdentifierType is always "4" (hardcoded per docs)
 *   - Amount is sent as a string per the JSON spec
 *   - AccountReference is truncated to max 13 characters per docs
 *   - Requester and Occassion are optional
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { B2BPayBillRequest, B2BPayBillResponse } from './types'

/** Daraja Business Pay Bill endpoint */
const B2B_PAY_BILL_ENDPOINT = '/mpesa/b2b/v1/paymentrequest'

/**
 * Per documentation: SenderIdentifierType and RecieverIdentifierType
 * must always be "4" (Organisation ShortCode). Not configurable.
 */
const IDENTIFIER_TYPE = '4' as const

/**
 * Initiates a Business Pay Bill payment request.
 *
 * Moves money from your MMF/Working account to the recipient's utility account.
 * The sync response is acknowledgement only — the result arrives via resultUrl.
 *
 * @param baseUrl             - Daraja base URL (sandbox or production)
 * @param accessToken         - Valid OAuth Bearer token
 * @param securityCredential  - RSA-encrypted initiator password (base64)
 * @param initiatorName       - M-Pesa API operator username with B2B role
 * @param request             - Business Pay Bill request parameters
 * @returns                   Synchronous acknowledgement response from Daraja
 * @throws {PesafyError}      VALIDATION_ERROR for invalid input before HTTP call
 * @throws {PesafyError}      From httpRequest on network / API errors
 */
export async function initiateB2BPayBill(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: B2BPayBillRequest,
): Promise<B2BPayBillResponse> {
  // ── Validate CommandID ──────────────────────────────────────────────────────
  if (!request.commandId || request.commandId !== 'BusinessPayBill') {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'commandId must be "BusinessPayBill". ' +
        'This is the only CommandID supported by the Business Pay Bill API.',
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
      message: 'partyA is required — your shortcode from which money will be deducted.',
    })
  }

  if (!request.partyB?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'partyB is required — the Paybill shortcode to which money will be moved.',
    })
  }

  if (!request.accountReference?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'accountReference is required — the account number associated with the payment ' +
        '(up to 13 characters).',
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
  //   commandId          → CommandID         ("BusinessPayBill")
  //   partyA             → PartyA            (string)
  //   partyB             → PartyB            (string)
  //   accountReference   → AccountReference  (string, max 13 chars per docs)
  //   requester          → Requester         (optional)
  //   remarks            → Remarks           (string)
  //   resultUrl          → ResultURL         (string)
  //   queueTimeOutUrl    → QueueTimeOutURL   (string)
  //   occasion           → Occassion         (optional, Daraja typo preserved)
  //   amount             → Amount            (string per JSON sample in docs)
  //
  // Hardcoded per docs:
  //   SenderIdentifierType   → "4"
  //   RecieverIdentifierType → "4"
  //
  const payload: Record<string, unknown> = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: request.commandId,
    SenderIdentifierType: IDENTIFIER_TYPE,
    RecieverIdentifierType: IDENTIFIER_TYPE,
    Amount: String(amount),
    PartyA: String(request.partyA),
    PartyB: String(request.partyB),
    // Docs: AccountReference up to 13 characters
    AccountReference: request.accountReference.slice(0, 13),
    Remarks: request.remarks ?? 'Business Pay Bill',
    QueueTimeOutURL: request.queueTimeOutUrl,
    ResultURL: request.resultUrl,
  }

  // Requester is optional — included only when explicitly provided
  if (request.requester?.trim()) {
    payload['Requester'] = String(request.requester)
  }

  // Occassion is optional (sic — Daraja typo preserved from docs)
  if (request.occasion?.trim()) {
    payload['Occassion'] = request.occasion
  }

  const { data } = await httpRequest<B2BPayBillResponse>(`${baseUrl}${B2B_PAY_BILL_ENDPOINT}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: payload,
  })

  return data
}
