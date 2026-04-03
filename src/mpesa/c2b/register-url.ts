/**
 * src/mpesa/c2b/register-url.ts
 *
 * C2B Register URL implementation.
 * Strictly aligned with Safaricom Daraja C2B Register URL API documentation.
 *
 * Endpoint (v1 — documented primary):
 *   Sandbox:    POST https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl
 *   Production: POST https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl
 *
 * Also supports v2 via the apiVersion option.
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { C2BApiVersion, C2BRegisterUrlRequest, C2BRegisterUrlResponse } from './types'

/**
 * Forbidden URL keywords per Daraja documentation:
 * "Avoid keywords such as M-PESA, M-Pesa, Safaricom, exe, exec, cme, or variants in your URLs."
 *
 * We lowercase-compare, so "MPESA", "Mpesa", "mPeSa" are all caught.
 *
 * Additional blocked keywords (documented variants): cmd, sql, query
 */
const FORBIDDEN_URL_KEYWORDS: readonly string[] = [
  'mpesa',
  'safaricom',
  'exec',
  'exe',
  'cme', // explicitly documented by Daraja
  'cmd', // documented variant of cme
  'sql',
  'query',
] as const

/**
 * Valid ResponseType values per Daraja docs (sentence case, exactly spelled).
 * Per docs: "The words Cancelled and Completed must be in Sentence case."
 */
const VALID_RESPONSE_TYPES: readonly string[] = ['Completed', 'Cancelled'] as const

/**
 * Validates a callback URL against Daraja's documented URL requirements.
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
          `Daraja rejects URLs containing: mpesa, safaricom, exe, exec, cme ` +
          `(and variants: cmd, sql, query).`,
      })
    }
  }
}

/**
 * Registers C2B Confirmation and Validation URLs with Safaricom.
 *
 * Per Daraja documentation:
 *   - Sandbox: may be called multiple times (URLs can be overwritten).
 *   - Production: one-time call. To change URLs, delete existing on the portal
 *     or email apisupport@safaricom.co.ke, then re-register.
 *   - ResponseType must be sentence-case: "Completed" or "Cancelled".
 *   - Both URLs must be publicly accessible and internet-reachable.
 *   - Production requires HTTPS; Sandbox allows HTTP.
 *   - Do not use public URL testers (ngrok, mockbin, requestbin) — they are blocked.
 *   - The Validation URL is only called when external validation is enabled.
 *     To activate, email apisupport@safaricom.co.ke.
 *   - If M-PESA cannot reach your Validation URL within ~8 seconds, it defaults
 *     to the ResponseType action set during registration.
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
      message: 'shortCode is required — the unique Paybill or Till number of the organisation.',
    })
  }

  // ── Validate responseType (sentence case, exact spelling per docs) ──────────
  if (!request.responseType) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'responseType is required: "Completed" or "Cancelled" ' +
        '(sentence case, correctly spelled per Daraja docs).',
    })
  }

  if (!VALID_RESPONSE_TYPES.includes(request.responseType)) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        `responseType must be exactly "Completed" or "Cancelled" ` +
        `(sentence case, correctly spelled per Daraja docs). ` +
        `Got: "${String(request.responseType)}"`,
    })
  }

  // ── Validate URLs (per docs forbidden keyword list) ─────────────────────────
  validateCallbackUrl(request.confirmationUrl, 'confirmationUrl')
  validateCallbackUrl(request.validationUrl, 'validationUrl')

  // ── Determine API version (defaults to v1 — documented primary endpoint) ────
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
