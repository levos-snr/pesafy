/**
 * src/mpesa/b2b-buy-goods/payment.ts
 *
 * Initiates a Business Buy Goods payment via Safaricom Daraja.
 * Endpoint: POST /mpesa/b2b/v1/paymentrequest
 *
 * Strictly follows the Safaricom Daraja Business Buy Goods API documentation:
 *   - CommandID must be "BusinessBuyGoods"
 *   - SenderIdentifierType is always "4" (hardcoded per docs)
 *   - RecieverIdentifierType is always "4" (hardcoded per docs)
 *   - Amount is sent as a string per the JSON spec
 *   - AccountReference is truncated to max 13 characters per docs
 *   - Requester and Occassion are optional
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { B2BBuyGoodsRequest, B2BBuyGoodsResponse } from './types'

/** Daraja Business Buy Goods endpoint — same as Pay Bill per docs */
const B2B_BUY_GOODS_ENDPOINT = '/mpesa/b2b/v1/paymentrequest'

/**
 * Per documentation: SenderIdentifierType and RecieverIdentifierType
 * must always be "4" (Organisation ShortCode). Not configurable.
 */
const IDENTIFIER_TYPE = '4' as const

/**
 * Initiates a Business Buy Goods payment request.
 *
 * Moves money from your MMF/Working account to the recipient's merchant account
 * (till number, merchant store number, or Merchant HO).
 * The sync response is acknowledgement only — the result arrives via resultUrl.
 *
 * @param baseUrl             - Daraja base URL (sandbox or production)
 * @param accessToken         - Valid OAuth Bearer token
 * @param securityCredential  - RSA-encrypted initiator password (base64)
 * @param initiatorName       - M-Pesa API operator username with B2B role
 * @param request             - Business Buy Goods request parameters
 * @returns                   Synchronous acknowledgement response from Daraja
 * @throws {PesafyError}      VALIDATION_ERROR for invalid input before HTTP call
 * @throws {PesafyError}      From httpRequest on network / API errors
 */
export async function initiateB2BBuyGoods(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: B2BBuyGoodsRequest,
): Promise<B2BBuyGoodsResponse> {
  // ── Validate CommandID ──────────────────────────────────────────────────────
  if (!request.commandId || request.commandId !== 'BusinessBuyGoods') {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'commandId must be "BusinessBuyGoods". ' +
        'This is the only CommandID supported by the Business Buy Goods API.',
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
      message:
        'partyB is required — the till number / merchant store number to which money will be moved.',
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
  //   commandId          → CommandID         ("BusinessBuyGoods")
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
    Remarks: request.remarks ?? 'Business Buy Goods',
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

  const { data } = await httpRequest<B2BBuyGoodsResponse>(`${baseUrl}${B2B_BUY_GOODS_ENDPOINT}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: payload,
  })

  return data
}
