// 📁 PATH: src/mpesa/account-balance/query.ts

/**
 * Account Balance Query — checks the balance of an M-PESA shortcode.
 *
 * API: POST /mpesa/accountbalance/v1/query
 *
 * This is ASYNCHRONOUS. The sync response only confirms receipt.
 * Balance data arrives via POST to your ResultURL.
 *
 * Required org portal role: "Balance Query ORG API" (Account Balance ORG API initiator)
 *
 * Request body fields (Daraja spec):
 *   - Initiator:          API user's credential/username (Alpha-Numeric)
 *   - SecurityCredential: RSA-encrypted initiator password (String)
 *   - CommandID:          "AccountBalance" (hardcoded, max length 64)
 *   - PartyA:             Shortcode querying the balance (Numeric)
 *   - IdentifierType:     Type of PartyA — "1" MSISDN, "2" Till, "4" ShortCode (Numeric)
 *   - Remarks:            Comments sent along with transaction (String)
 *   - QueueTimeOutURL:    Endpoint for timeout notifications (URL)
 *   - ResultURL:          Destination for async result notification (URL)
 *
 * Ref: https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { AccountBalanceRequest, AccountBalanceResponse } from './types'

/**
 * Queries the balance of an M-PESA shortcode.
 *
 * @param baseUrl            - Daraja base URL (sandbox or production)
 * @param accessToken        - Valid OAuth bearer token
 * @param securityCredential - RSA-encrypted initiator password (base64)
 * @param initiatorName      - M-PESA org portal API operator username
 * @param request            - Account balance request parameters
 *
 * @throws {PesafyError} with code "VALIDATION_ERROR" for invalid inputs
 * @throws {PesafyError} for network / API failures
 */
export async function queryAccountBalance(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: AccountBalanceRequest,
): Promise<AccountBalanceResponse> {
  // ── Validation (Daraja spec) ─────────────────────────────────────────────

  if (!request.partyA?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'partyA is required. Provide the shortcode of the organization querying for balance.',
    })
  }

  if (!['1', '2', '4'].includes(request.identifierType)) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'identifierType must be "1" (MSISDN), "2" (Till Number), or "4" (Organisation ShortCode).',
    })
  }

  if (!request.resultUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'resultUrl is required. Provide the URL where Daraja will POST the async result.',
    })
  }

  if (!request.queueTimeOutUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'queueTimeOutUrl is required. Provide the URL to notify on timeout.',
    })
  }

  // ── Payload (exactly 8 fields per Daraja spec) ───────────────────────────

  const payload = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: 'AccountBalance',
    PartyA: String(request.partyA.trim()),
    IdentifierType: request.identifierType,
    ResultURL: request.resultUrl,
    QueueTimeOutURL: request.queueTimeOutUrl,
    Remarks: request.remarks ?? 'Account Balance Query',
  }

  const { data } = await httpRequest<AccountBalanceResponse>(
    `${baseUrl}/mpesa/accountbalance/v1/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )

  return data
}
