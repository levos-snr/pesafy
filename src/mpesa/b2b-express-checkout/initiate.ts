/**
 * src/mpesa/b2b-express-checkout/initiate.ts
 *
 * B2B Express Checkout USSD Push to Till implementation.
 * Strictly aligned with Safaricom Daraja B2B Express Checkout API documentation.
 *
 * Endpoint:
 *   Sandbox:    POST https://sandbox.safaricom.co.ke/v1/ussdpush/get-msisdn
 *   Production: POST https://api.safaricom.co.ke/v1/ussdpush/get-msisdn
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { B2BExpressCheckoutRequest, B2BExpressCheckoutResponse } from './types'

/**
 * Generates a random UUID v4-style string for RequestRefID.
 * Uses crypto.randomUUID() where available (Node ≥18, Bun, Cloudflare Workers).
 * Falls back to timestamp + random hex for older environments.
 */
function generateRequestRefId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // fall through to fallback
  }
  return (
    `${Date.now().toString(16)}-` +
    `${Math.random().toString(16).slice(2)}-` +
    `${Math.random().toString(16).slice(2)}`
  )
}

/**
 * Initiates a B2B USSD Push to a merchant's till.
 *
 * Per docs:
 *   - primaryShortCode: merchant's till (debit party)
 *   - receiverShortCode: vendor's paybill (credit party)
 *   - amount: sent as a string in the payload (e.g. "100")
 *   - RequestRefID: must be unique per request for idempotency
 *   - The sync response only confirms the USSD was initiated.
 *   - The actual transaction result arrives via POST to callbackUrl.
 *
 * @param baseUrl     - Daraja environment base URL
 * @param accessToken - Valid OAuth bearer token from Authorization API
 * @param request     - B2B Express Checkout parameters
 * @returns           - Daraja acknowledgement (code "0" = USSD initiated)
 */
export async function initiateB2BExpressCheckout(
  baseUrl: string,
  accessToken: string,
  request: B2BExpressCheckoutRequest,
): Promise<B2BExpressCheckoutResponse> {
  // ── Validate primaryShortCode ───────────────────────────────────────────────
  if (!request.primaryShortCode || !String(request.primaryShortCode).trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: "primaryShortCode is required — the merchant's till number (debit party).",
    })
  }

  // ── Validate receiverShortCode ──────────────────────────────────────────────
  if (!request.receiverShortCode || !String(request.receiverShortCode).trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: "receiverShortCode is required — the vendor's Paybill account (credit party).",
    })
  }

  // ── Validate amount (whole number ≥ 1) ─────────────────────────────────────
  const amount = Math.round(request.amount)
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: `amount must be a whole number ≥ 1 (got ${request.amount}).`,
    })
  }

  // ── Validate paymentRef ─────────────────────────────────────────────────────
  if (!request.paymentRef || !String(request.paymentRef).trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        "paymentRef is required — shown in the merchant's USSD prompt as the payment reference.",
    })
  }

  // ── Validate callbackUrl ────────────────────────────────────────────────────
  if (!request.callbackUrl || !String(request.callbackUrl).trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'callbackUrl is required — Daraja POSTs the transaction result here.',
    })
  }

  // ── Validate partnerName ────────────────────────────────────────────────────
  if (!request.partnerName || !String(request.partnerName).trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        "partnerName is required — vendor's friendly name shown in the merchant's USSD prompt.",
    })
  }

  // ── Build payload — exactly as documented by Daraja ─────────────────────────
  //
  // Field name notes per Daraja docs:
  //   - Most fields are camelCase (primaryShortCode, receiverShortCode, etc.)
  //   - amount is sent as a STRING "100", not a number
  //   - RequestRefID is PascalCase (unique to this field in the Daraja spec)
  //
  const payload = {
    primaryShortCode: String(request.primaryShortCode),
    receiverShortCode: String(request.receiverShortCode),
    amount: String(amount),
    paymentRef: request.paymentRef,
    callbackUrl: request.callbackUrl,
    partnerName: request.partnerName,
    RequestRefID: request.requestRefId ?? generateRequestRefId(),
  }

  const { data } = await httpRequest<B2BExpressCheckoutResponse>(
    `${baseUrl}/v1/ussdpush/get-msisdn`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )

  return data
}
