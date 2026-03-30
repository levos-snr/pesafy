// src/mpesa/c2b/register-url.ts

/**
 * C2B Register URL
 *
 * Registers your Confirmation and Validation URLs with Safaricom.
 *
 * API:
 *   v1: POST /mpesa/c2b/v1/registerurl
 *   v2: POST /mpesa/c2b/v2/registerurl  ← default (masked MSISDN in callbacks)
 *
 * Sandbox:    https://sandbox.safaricom.co.ke/mpesa/c2b/v{1|2}/registerurl
 * Production: https://api.safaricom.co.ke/mpesa/c2b/v{1|2}/registerurl
 *
 * Notes from Daraja docs:
 *   - Sandbox: you can register URLs multiple times / overwrite existing.
 *   - Production: one-time call. To change, delete via Self Services > URL
 *     Management on the Daraja portal, then re-register.
 *   - ResponseType must be exactly "Completed" or "Cancelled" (sentence case).
 *   - Production URLs must be HTTPS. Sandbox allows HTTP.
 *   - URLs must not contain keywords: M-PESA, Safaricom, exe, exec, cmd, sql, query.
 *   - Do not use public URL testers (ngrok, mockbin, requestbin) in production.
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type {
  C2BApiVersion,
  C2BRegisterUrlRequest,
  C2BRegisterUrlResponse,
} from './types'

/** Forbidden URL keywords per Daraja docs */
const FORBIDDEN_URL_KEYWORDS = [
  'mpesa',
  'safaricom',
  '.exe',
  '.exec',
  'cmd',
  'sql',
  'query',
]

/**
 * Validates a callback URL against Daraja's URL requirements.
 * Throws PesafyError if the URL violates any rule.
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
          'Daraja rejects URLs containing: M-PESA, Safaricom, exe, exec, cmd, sql, query.',
      })
    }
  }
}

/**
 * Registers your C2B Confirmation and Validation URLs with Safaricom.
 *
 * @param baseUrl     - Daraja base URL (sandbox or production)
 * @param accessToken - Valid OAuth bearer token
 * @param request     - Registration parameters
 * @returns           - Daraja registration response
 */
export async function registerC2BUrls(
  baseUrl: string,
  accessToken: string,
  request: C2BRegisterUrlRequest,
): Promise<C2BRegisterUrlResponse> {
  // ── Validation ──────────────────────────────────────────────────────────────

  if (!request.shortCode) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'shortCode is required',
    })
  }

  if (!request.responseType) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'responseType is required: "Completed" or "Cancelled" (sentence case, exactly as spelled)',
    })
  }

  if (
    request.responseType !== 'Completed' &&
    request.responseType !== 'Cancelled'
  ) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        `responseType must be exactly "Completed" or "Cancelled" (sentence case). ` +
        `Got: "${String(request.responseType)}"`,
    })
  }

  validateCallbackUrl(request.confirmationUrl, 'confirmationUrl')
  validateCallbackUrl(request.validationUrl, 'validationUrl')

  // ── Determine API version ───────────────────────────────────────────────────
  const version: C2BApiVersion = request.apiVersion ?? 'v2'

  // ── Build payload matching Daraja spec exactly ──────────────────────────────
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
