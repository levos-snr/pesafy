/**
 * src/mpesa/dynamic-qr/generate.ts
 *
 * Core logic for the Safaricom Daraja Dynamic QR Code API.
 *
 * API: POST /mpesa/qrcode/v1/generate
 *
 * Error codes from Daraja docs:
 *   404.001.04 — Invalid Authentication Header
 *   400.002.05 — Invalid Request Payload
 *   400.003.01 — Invalid Access Token
 */

import { PesafyError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type {
  DynamicQRDarajaPayload,
  DynamicQRErrorResponse,
  DynamicQRRequest,
  DynamicQRResponse,
} from './types'
import { DEFAULT_QR_SIZE, validateDynamicQRRequest } from './validators'

// ── Daraja error code → PesafyError mapping ───────────────────────────────────

/**
 * Maps Daraja-specific error codes to structured PesafyErrors with
 * actionable developer guidance.
 *
 * @internal
 */
function mapDarajaError(errorCode: string, errorMessage: string): PesafyError {
  switch (errorCode) {
    case '404.001.04':
      return new PesafyError({
        code: 'AUTH_FAILED',
        message:
          'Daraja rejected the request due to an invalid authentication header. ' +
          'Ensure the Dynamic QR endpoint is called with POST and that the ' +
          `Authorization: Bearer <token> header is present. Daraja: "${errorMessage}"`,
        statusCode: 404,
      })

    case '400.003.01':
      return new PesafyError({
        code: 'AUTH_FAILED',
        message:
          'The M-PESA access token is invalid or has expired. ' +
          'Call clearTokenCache() on the Mpesa instance to force a token refresh ' +
          `and retry the request. Daraja: "${errorMessage}"`,
        statusCode: 401,
      })

    case '400.002.05':
      return new PesafyError({
        code: 'VALIDATION_ERROR',
        message:
          'Daraja rejected the request payload as malformed. ' +
          'Verify that all required fields (MerchantName, RefNo, Amount, TrxCode, CPI, Size) ' +
          `are present and have correct types. Daraja: "${errorMessage}"`,
        statusCode: 400,
      })

    default:
      return new PesafyError({
        code: 'REQUEST_FAILED',
        message: `Dynamic QR request failed (${errorCode}): ${errorMessage}`,
        statusCode: 400,
      })
  }
}

/**
 * Returns `true` when the raw response body looks like a Daraja error object.
 * @internal
 */
function isDarajaError(body: unknown): body is DynamicQRErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'errorCode' in body &&
    typeof (body as DynamicQRErrorResponse).errorCode === 'string'
  )
}

/**
 * Returns `true` when the response has the required QR success fields.
 * @internal
 */
function isDarajaSuccess(body: unknown): body is DynamicQRResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'ResponseCode' in body &&
    'QRCode' in body &&
    typeof (body as DynamicQRResponse).QRCode === 'string' &&
    (body as DynamicQRResponse).QRCode.length > 0
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generates a Dynamic M-PESA QR Code via the Safaricom Daraja API.
 *
 * The QR code can be rendered directly in a browser as a base64 PNG:
 * ```html
 * <img src="data:image/png;base64,{response.QRCode}" />
 * ```
 * Or written to disk:
 * ```ts
 * import { writeFileSync } from 'node:fs'
 * writeFileSync('qr.png', Buffer.from(response.QRCode, 'base64'))
 * ```
 *
 * @param baseUrl     - Daraja base URL (`https://sandbox.safaricom.co.ke` or
 *                      `https://api.safaricom.co.ke`)
 * @param accessToken - Valid Daraja OAuth2 Bearer token
 * @param request     - QR generation parameters (see {@link DynamicQRRequest})
 * @returns           - Daraja response including the base64-encoded QR image
 *
 * @throws {PesafyError} `VALIDATION_ERROR`  — payload failed pre-flight checks
 * @throws {PesafyError} `AUTH_FAILED`       — bad/expired token or wrong headers
 * @throws {PesafyError} `REQUEST_FAILED`    — unexpected Daraja error
 *
 * @example
 * ```ts
 * const response = await generateDynamicQR(
 *   'https://sandbox.safaricom.co.ke',
 *   accessToken,
 *   {
 *     merchantName: 'Test Supermarket',
 *     refNo:        'INV-001',
 *     amount:       500,
 *     trxCode:      'BG',
 *     cpi:          '373132',
 *     size:         300,
 *   },
 * )
 * console.log(response.QRCode) // base64 PNG
 * ```
 */
export async function generateDynamicQR(
  baseUrl: string,
  accessToken: string,
  request: DynamicQRRequest,
): Promise<DynamicQRResponse> {
  // ── 1. Pre-flight validation ───────────────────────────────────────────────

  const validation = validateDynamicQRRequest(request)

  if (!validation.valid) {
    const summary = Object.entries(validation.errors)
      .map(([field, msg]) => `  • ${field}: ${msg}`)
      .join('\n')

    throw new PesafyError({
      code: 'VALIDATION_ERROR',
      message: `Dynamic QR request validation failed:\n${summary}`,
    })
  }

  // ── 2. Guard: access token must be non-empty ───────────────────────────────

  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    throw new PesafyError({
      code: 'AUTH_FAILED',
      message:
        'accessToken is required. Obtain one via the Daraja Authorization API ' +
        '(GET /oauth/v1/generate?grant_type=client_credentials).',
    })
  }

  // ── 3. Build Daraja payload (camelCase → PascalCase, size coerced to string) ─

  const size = request.size ?? DEFAULT_QR_SIZE
  const amount = Math.round(request.amount)

  const payload: DynamicQRDarajaPayload = {
    MerchantName: request.merchantName.trim(),
    RefNo: request.refNo.trim(),
    Amount: amount,
    TrxCode: request.trxCode,
    CPI: request.cpi.trim(),
    Size: String(size),
  }

  // ── 4. HTTP request ────────────────────────────────────────────────────────

  const url = `${baseUrl}/mpesa/qrcode/v1/generate`

  const { data } = await httpRequest<DynamicQRResponse | DynamicQRErrorResponse>(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload,
  })

  // ── 5. Handle Daraja error responses ──────────────────────────────────────

  if (isDarajaError(data)) {
    throw mapDarajaError(data.errorCode, data.errorMessage)
  }

  // ── 6. Guard against malformed success responses ──────────────────────────

  if (!isDarajaSuccess(data)) {
    throw new PesafyError({
      code: 'REQUEST_FAILED',
      message:
        'Daraja returned an unexpected response structure for the Dynamic QR request. ' +
        'The response was missing required fields (ResponseCode, QRCode). ' +
        `Raw response: ${JSON.stringify(data).slice(0, 300)}`,
    })
  }

  return data
}
