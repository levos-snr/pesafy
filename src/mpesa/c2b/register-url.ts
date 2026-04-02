/**
 * src/mpesa/c2b/register-url.ts
 *
 * C2B Register URL implementation.
 * Strictly aligned with Safaricom Daraja C2B API documentation.
 *
 * Endpoint (v2):
 *   Sandbox:    POST https://sandbox.safaricom.co.ke/mpesa/c2b/v2/registerurl
 *   Production: POST https://api.safaricom.co.ke/mpesa/c2b/v2/registerurl
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { C2BApiVersion, C2BRegisterUrlRequest, C2BRegisterUrlResponse } from './types'

/**
 * Forbidden URL keywords per Daraja documentation:
 * "Avoid keywords like M-PESA, Safaricom, exe, exec, cmd, SQL, query, etc."
 *
 * We lowercase-compare, so "MPESA", "Mpesa", "mPeSa" are all caught.
 */
const FORBIDDEN_URL_KEYWORDS: readonly string[] = [
  'mpesa',
  'safaricom',
  'exec',
  'exe',
  'cmd',
  'sql',
  'query',
] as const

/**
 * Valid ResponseType values per Daraja docs (sentence case, exactly spelled).
 */
const VALID_RESPONSE_TYPES: readonly string[] = ['Completed', 'Cancelled'] as const

/**
 * Validates a callback URL against Daraja's URL requirements.
 * Throws PesafyError if the URL violates any documented rule.
 */
function validateCallbackUrl(url: string, fieldName: string): void {
  if (!url || !url.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: `${fieldName} is required`,
    })
  }

  const lower = url.toLowerCase()

  for (const keyword of FORBIDDEN_URL_KEYWORDS) {
    if (lower.includes(keyword)) {
      throw createError({
        code: 'VALIDATION_ERROR',
        message:
          `${fieldName} must not contain the keyword "${keyword}". ` +
          `Daraja rejects URLs containing: mpesa, safaricom, exec, exe, cmd, sql, query ` +
          `(and their variants).`,
      })
    }
  }
}

/**
 * Registers C2B Confirmation and Validation URLs with Safaricom.
 *
 * Per docs:
 *   - Sandbox: may be called multiple times (URLs can be overwritten).
 *   - Production: one-time call; to change URLs, delete existing and re-register.
 *   - ResponseType must be sentence-case: "Completed" or "Cancelled".
 *   - Both URLs must be publicly accessible.
 *   - Production requires HTTPS; Sandbox accepts HTTP.
 *
 * @param baseUrl     - Daraja environment base URL
 * @param accessToken - Valid OAuth bearer token from Authorization API
 * @param request     - Registration parameters
 * @returns           - Daraja registration response (ResponseCode "0" = success)
 */
export async function registerC2BUrls(
  baseUrl: string,
  accessToken: string,
  request: C2BRegisterUrlRequest,
): Promise<C2BRegisterUrlResponse> {
  // ── Validate shortCode ──────────────────────────────────────────────────────
  if (!request.shortCode || !String(request.shortCode).trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'shortCode is required',
    })
  }

  // ── Validate responseType (sentence case, exact spelling per docs) ──────────
  if (!request.responseType) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'responseType is required: "Completed" or "Cancelled" (sentence case)',
    })
  }

  if (!VALID_RESPONSE_TYPES.includes(request.responseType)) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        `responseType must be exactly "Completed" or "Cancelled" (sentence case, correctly spelled). ` +
        `Got: "${String(request.responseType)}"`,
    })
  }

  // ── Validate URLs ───────────────────────────────────────────────────────────
  validateCallbackUrl(request.confirmationUrl, 'confirmationUrl')
  validateCallbackUrl(request.validationUrl, 'validationUrl')

  // ── Determine API version (default v2 per docs) ─────────────────────────────
  const version: C2BApiVersion = request.apiVersion ?? 'v2'

  // ── Build payload — exactly as documented ───────────────────────────────────
  const payload = {
    ShortCode: String(request.shortCode),
    ResponseType: request.responseType,
    ConfirmationURL: request.confirmationUrl,
    ValidationURL: request.validationUrl,
  }

  const { data } = await httpRequest<C2BRegisterUrlResponse>(
    `${baseUrl}/mpesa/c2b/${version}/registerurl`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )

  return data
}
