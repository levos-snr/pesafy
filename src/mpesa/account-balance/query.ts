// 📁 PATH: src/mpesa/account-balance/query.ts

/**
 * Account Balance Query — checks the balance of an M-PESA shortcode.
 *
 * API: POST /mpesa/accountbalance/v1/query
 *
 * This is ASYNCHRONOUS. The sync response only confirms receipt.
 * Balance data arrives via POST to your ResultURL.
 *
 * Required org portal role: "Account Balance ORG API initiator"
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
 */
export async function queryAccountBalance(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: AccountBalanceRequest,
): Promise<AccountBalanceResponse> {
  if (!request.partyA?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'partyA is required.',
    })
  }
  if (!['1', '2', '4'].includes(request.identifierType)) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'identifierType must be "1" (MSISDN), "2" (Till), or "4" (ShortCode).',
    })
  }
  if (!request.resultUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'resultUrl is required.',
    })
  }
  if (!request.queueTimeOutUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'queueTimeOutUrl is required.',
    })
  }

  const payload = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: 'AccountBalance',
    PartyA: String(request.partyA),
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
