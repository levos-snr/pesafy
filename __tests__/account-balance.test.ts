/**
 * __tests__/account-balance.test.ts
 *
 * Complete test suite for the Account Balance module:
 *   - queryAccountBalance()        — POST /mpesa/accountbalance/v1/query
 *   - ACCOUNT_BALANCE_ERROR_CODES  — documented error code constants
 *   - isAccountBalanceSuccess()    — result type guard
 *   - parseAccountBalance()        — balance string parser
 *   - getAccountBalanceParam()     — result parameter extractor
 *   - getAccountBalanceTransactionId()
 *   - getAccountBalanceConversationId()
 *   - getAccountBalanceOriginatorConversationId()
 *   - getAccountBalanceCompletedTime()
 *   - getAccountBalanceRawBalance()
 *   - getAccountBalanceReferenceItem()
 *
 * Strictly covers only what is documented in the Safaricom Daraja
 * Account Balance API documentation.
 *
 * Run: pnpm test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks (must come before imports that use them) ────────────────────────────

vi.mock('../src/utils/http', () => ({
  httpRequest: vi.fn(),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { httpRequest } from '../src/utils/http'
import { queryAccountBalance } from '../src/mpesa/account-balance/query'
import {
  isAccountBalanceSuccess,
  parseAccountBalance,
  getAccountBalanceParam,
  getAccountBalanceTransactionId,
  getAccountBalanceConversationId,
  getAccountBalanceOriginatorConversationId,
  getAccountBalanceCompletedTime,
  getAccountBalanceRawBalance,
  getAccountBalanceReferenceItem,
  ACCOUNT_BALANCE_ERROR_CODES,
} from '../src/mpesa/account-balance/types'
import type {
  AccountBalanceRequest,
  AccountBalanceResponse,
  AccountBalanceResult,
  ParsedAccount,
} from '../src/mpesa/account-balance/types'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-balance'
const SECURITY_CREDENTIAL = 'SAFVNCHNHfVtXEZMBuVo+alHwr+DtrUVN=='
const INITIATOR_NAME = 'testapiuser'

// ── Request fixtures ──────────────────────────────────────────────────────────

const BASE_REQUEST: AccountBalanceRequest = {
  partyA: '600000',
  identifierType: '4',
  resultUrl: 'https://mydomain.com/mpesa/balance/result',
  queueTimeOutUrl: 'https://mydomain.com/mpesa/balance/timeout',
  remarks: 'ok',
}

// ── Synchronous acknowledgement response (from Daraja docs) ──────────────────

const ACKNOWLEDGE_RESPONSE: AccountBalanceResponse = {
  OriginatorConversationID: '515-5258779-3',
  ConversationID: 'AG_20200123_0000417fed8ed666e976',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully',
}

// ── Async callback result (from Daraja docs) ──────────────────────────────────

const SUCCESS_RESULT: AccountBalanceResult = {
  Result: {
    ResultType: '0',
    ResultCode: 0,
    ResultDesc: 'The service request is processed successfully.',
    OriginatorConversationID: '16917-22577599-3',
    ConversationID: 'AG_20200206_00005e091a8ec6b9eac5',
    TransactionID: '0A90000000',
    ResultParameters: {
      ResultParameter: [
        {
          Key: 'AccountBalance',
          Value:
            'Working Account|KES|700000.00|KES|0.00|KES|0.00|Charges Paid Account|KES|-1540.00|KES|1540.00|KES|0.00|Utility Account|KES|228037.00|KES|228037.00|',
        },
        {
          Key: 'BOCompletedTime',
          Value: '20200109125710',
        },
      ],
    },
    ReferenceData: {
      ReferenceItem: {
        Key: 'QueueTimeoutURL',
        Value: 'https://internalsandbox.safaricom.co.ke/queue',
      },
    },
  },
}

const FAILURE_RESULT: AccountBalanceResult = {
  Result: {
    ResultType: '0',
    ResultCode: 18,
    ResultDesc: 'Initiator information is invalid.',
    OriginatorConversationID: '16917-22577599-4',
    ConversationID: 'AG_20200206_00005e091a8ec6b9eac6',
    TransactionID: '0A90000001',
  },
}

// ── Minimal balance string (Working Account only) ─────────────────────────────

const WORKING_ACCOUNT_ONLY_RESULT: AccountBalanceResult = {
  Result: {
    ResultType: '0',
    ResultCode: 0,
    ResultDesc: 'The service request is processed successfully.',
    OriginatorConversationID: '16917-22577599-5',
    ConversationID: 'AG_20200206_00005e091a8ec6b9eac7',
    TransactionID: '0A90000002',
    ResultParameters: {
      ResultParameter: [
        {
          Key: 'AccountBalance',
          Value: 'Working Account|KES|700000.00',
        },
        {
          Key: 'BOCompletedTime',
          Value: '20200109130000',
        },
      ],
    },
    ReferenceData: {
      ReferenceItem: {
        Key: 'QueueTimeoutURL',
        Value: 'https://internalsandbox.safaricom.co.ke/queue',
      },
    },
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ACCOUNT_BALANCE_ERROR_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ACCOUNT_BALANCE_ERROR_CODES (documented by Daraja)', () => {
  it('DUPLICATE_DETECTED is 15', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.DUPLICATE_DETECTED).toBe(15)
  })

  it('INTERNAL_FAILURE is 17', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.INTERNAL_FAILURE).toBe(17)
  })

  it('INITIATOR_CREDENTIAL_CHECK_FAILURE is 18', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.INITIATOR_CREDENTIAL_CHECK_FAILURE).toBe(18)
  })

  it('MESSAGE_SEQUENCING_FAILURE is 19', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.MESSAGE_SEQUENCING_FAILURE).toBe(19)
  })

  it('UNRESOLVED_INITIATOR is 20', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.UNRESOLVED_INITIATOR).toBe(20)
  })

  it('INITIATOR_TO_PRIMARY_PARTY_PERMISSION_FAILURE is 21', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.INITIATOR_TO_PRIMARY_PARTY_PERMISSION_FAILURE).toBe(21)
  })

  it('INITIATOR_TO_RECEIVER_PARTY_PERMISSION_FAILURE is 22', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.INITIATOR_TO_RECEIVER_PARTY_PERMISSION_FAILURE).toBe(22)
  })

  it('MISSING_MANDATORY_FIELDS is 24', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.MISSING_MANDATORY_FIELDS).toBe(24)
  })

  it('SYSTEM_OVERLOAD is 100000001', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.SYSTEM_OVERLOAD).toBe(100000001)
  })

  it('THROTTLING_ERROR is 100000002', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.THROTTLING_ERROR).toBe(100000002)
  })

  it('INTERNAL_SERVER_ERROR is 100000004', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe(100000004)
  })

  it('INVALID_INPUT_VALUE is 100000005', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.INVALID_INPUT_VALUE).toBe(100000005)
  })

  it('SERVICE_ABNORMAL is 100000007', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.SERVICE_ABNORMAL).toBe(100000007)
  })

  it('API_STATUS_ABNORMAL is 100000009', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.API_STATUS_ABNORMAL).toBe(100000009)
  })

  it('INSUFFICIENT_PERMISSIONS is 100000010', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.INSUFFICIENT_PERMISSIONS).toBe(100000010)
  })

  it('REQUEST_RATE_EXCEEDED is 100000011', () => {
    expect(ACCOUNT_BALANCE_ERROR_CODES.REQUEST_RATE_EXCEEDED).toBe(100000011)
  })

  it('contains exactly 16 documented error codes', () => {
    expect(Object.keys(ACCOUNT_BALANCE_ERROR_CODES)).toHaveLength(16)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. queryAccountBalance() — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryAccountBalance() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: ACKNOWLEDGE_RESPONSE } as never)
  })

  it('returns the Daraja acknowledgement on success', async () => {
    const result = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(result).toStrictEqual(ACKNOWLEDGE_RESPONSE)
  })

  it('calls the correct Daraja Account Balance endpoint', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/accountbalance/v1/query`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses the production endpoint URL', async () => {
    await queryAccountBalance(
      PROD_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/mpesa/accountbalance/v1/query`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. queryAccountBalance() — REQUEST BODY SHAPE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryAccountBalance() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: ACKNOWLEDGE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends Initiator as the provided initiator name', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Initiator']).toBe('testapiuser')
  })

  it('sends SecurityCredential as provided', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['SecurityCredential']).toBe(SECURITY_CREDENTIAL)
  })

  it('sends CommandID as "AccountBalance" (hardcoded per docs)', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['CommandID']).toBe('AccountBalance')
  })

  it('sends PartyA as the provided shortcode string', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['PartyA']).toBe('600000')
  })

  it('sends IdentifierType as "4" (Organisation ShortCode)', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['IdentifierType']).toBe('4')
  })

  it('sends ResultURL exactly as provided', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['ResultURL']).toBe('https://mydomain.com/mpesa/balance/result')
  })

  it('sends QueueTimeOutURL exactly as provided', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['QueueTimeOutURL']).toBe('https://mydomain.com/mpesa/balance/timeout')
  })

  it('sends Remarks exactly as provided', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Remarks']).toBe('ok')
  })

  it('defaults Remarks to "Account Balance Query" when not provided', async () => {
    const { remarks: _, ...withoutRemarks } = BASE_REQUEST
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutRemarks,
    )
    expect(getBody()['Remarks']).toBe('Account Balance Query')
  })

  it('sends exactly 8 fields in the request body (all Daraja-documented fields)', async () => {
    await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    const body = getBody()
    const expectedFields = [
      'Initiator',
      'SecurityCredential',
      'CommandID',
      'PartyA',
      'IdentifierType',
      'ResultURL',
      'QueueTimeOutURL',
      'Remarks',
    ]
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(8)
  })

  it('sends IdentifierType "1" (MSISDN) when specified', async () => {
    await queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      identifierType: '1',
    })
    expect(getBody()['IdentifierType']).toBe('1')
  })

  it('sends IdentifierType "2" (Till Number) when specified', async () => {
    await queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      identifierType: '2',
    })
    expect(getBody()['IdentifierType']).toBe('2')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. queryAccountBalance() — VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryAccountBalance() — validation', () => {
  it('throws VALIDATION_ERROR when partyA is empty', async () => {
    await expect(
      queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyA: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when partyA is whitespace only', async () => {
    await expect(
      queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyA: '   ',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when identifierType is invalid', async () => {
    await expect(
      queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        identifierType: '5' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('error message mentions valid identifier types when invalid', async () => {
    const error = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      { ...BASE_REQUEST, identifierType: '9' as never },
    ).catch((e: unknown) => e as { message: string })
    expect(error.message).toContain('1')
    expect(error.message).toContain('2')
    expect(error.message).toContain('4')
  })

  it('throws VALIDATION_ERROR when resultUrl is empty', async () => {
    await expect(
      queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        resultUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when queueTimeOutUrl is empty', async () => {
    await expect(
      queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        queueTimeOutUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts identifierType "1" (MSISDN)', async () => {
    mockHttpRequest.mockResolvedValue({ data: ACKNOWLEDGE_RESPONSE } as never)
    await expect(
      queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        identifierType: '1',
      }),
    ).resolves.toBeDefined()
  })

  it('accepts identifierType "2" (Till Number)', async () => {
    mockHttpRequest.mockResolvedValue({ data: ACKNOWLEDGE_RESPONSE } as never)
    await expect(
      queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        identifierType: '2',
      }),
    ).resolves.toBeDefined()
  })

  it('accepts identifierType "4" (ShortCode — most common)', async () => {
    mockHttpRequest.mockResolvedValue({ data: ACKNOWLEDGE_RESPONSE } as never)
    await expect(
      queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        identifierType: '4',
      }),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when validation fails', async () => {
    await queryAccountBalance(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      partyA: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. queryAccountBalance() — RESPONSE FIELDS (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryAccountBalance() — response fields (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: ACKNOWLEDGE_RESPONSE } as never)
  })

  it('response includes OriginatorConversationID', async () => {
    const res = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.OriginatorConversationID).toBe('string')
    expect(res.OriginatorConversationID.length).toBeGreaterThan(0)
  })

  it('response includes ConversationID', async () => {
    const res = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ConversationID).toBe('string')
    expect(res.ConversationID.length).toBeGreaterThan(0)
  })

  it('response includes ResponseCode', async () => {
    const res = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('ResponseCode "0" indicates the request was accepted', async () => {
    const res = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(res.ResponseCode).toBe('0')
  })

  it('response matches the exact Daraja documented payload', async () => {
    const res = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(res).toStrictEqual(ACKNOWLEDGE_RESPONSE)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. queryAccountBalance() — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryAccountBalance() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      queryAccountBalance(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REQUEST,
      ),
    ).rejects.toThrow('ECONNRESET')
  })

  it('propagates a network timeout Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(
      queryAccountBalance(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REQUEST,
      ),
    ).rejects.toThrow('ETIMEDOUT')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. isAccountBalanceSuccess() — RESULT TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isAccountBalanceSuccess() — result type guard', () => {
  it('returns true when ResultCode is 0 (success)', () => {
    expect(isAccountBalanceSuccess(SUCCESS_RESULT)).toBe(true)
  })

  it('returns false when ResultCode is 18 (initiator credential check failure)', () => {
    expect(isAccountBalanceSuccess(FAILURE_RESULT)).toBe(false)
  })

  it('returns false when ResultCode is non-zero', () => {
    const result: AccountBalanceResult = {
      Result: { ...FAILURE_RESULT.Result, ResultCode: 17 },
    }
    expect(isAccountBalanceSuccess(result)).toBe(false)
  })

  it('returns false for ResultCode 15 (duplicate detected)', () => {
    const result: AccountBalanceResult = {
      Result: { ...FAILURE_RESULT.Result, ResultCode: 15 },
    }
    expect(isAccountBalanceSuccess(result)).toBe(false)
  })

  it('returns false for ResultCode 20 (unresolved initiator)', () => {
    const result: AccountBalanceResult = {
      Result: { ...FAILURE_RESULT.Result, ResultCode: 20 },
    }
    expect(isAccountBalanceSuccess(result)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. parseAccountBalance() — BALANCE STRING PARSER
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseAccountBalance() — Daraja balance string parser', () => {
  it('parses a single account (Working Account|KES|700000.00)', () => {
    const result = parseAccountBalance('Working Account|KES|700000.00')
    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual({
      name: 'Working Account',
      currency: 'KES',
      amount: '700000.00',
    })
  })

  it('parses multiple accounts from the full Daraja balance string', () => {
    const raw =
      'Working Account|KES|700000.00|KES|0.00|KES|0.00|Charges Paid Account|KES|-1540.00|KES|1540.00|KES|0.00|Utility Account|KES|228037.00|KES|228037.00|'
    const result = parseAccountBalance(raw)
    // Three account groups each starting with a name
    const accountNames = result.map((a) => a.name)
    expect(accountNames).toContain('Working Account')
    expect(accountNames).toContain('Charges Paid Account')
    expect(accountNames).toContain('Utility Account')
  })

  it('working account amount is 700000.00', () => {
    const raw = 'Working Account|KES|700000.00'
    const result = parseAccountBalance(raw)
    expect(result[0]?.amount).toBe('700000.00')
  })

  it('parses negative balance for Charges Paid Account', () => {
    const raw = 'Charges Paid Account|KES|-1540.00'
    const result = parseAccountBalance(raw)
    expect(result[0]?.amount).toBe('-1540.00')
  })

  it('returns an empty array for an empty string', () => {
    const result = parseAccountBalance('')
    expect(result).toHaveLength(0)
  })

  it('each parsed account has name, currency, and amount fields', () => {
    const raw = 'Working Account|KES|700000.00'
    const result = parseAccountBalance(raw)
    for (const account of result) {
      expect(account).toHaveProperty('name')
      expect(account).toHaveProperty('currency')
      expect(account).toHaveProperty('amount')
    }
  })

  it('correctly identifies KES as the currency', () => {
    const raw = 'Working Account|KES|700000.00'
    const result = parseAccountBalance(raw)
    expect(result[0]?.currency).toBe('KES')
  })

  it('trims whitespace from account name', () => {
    const raw = ' Working Account |KES|700000.00'
    const result = parseAccountBalance(raw)
    expect(result[0]?.name).toBe('Working Account')
  })

  it('handles Daraja documented format: Working Account|KES|700000.00', () => {
    const accounts = parseAccountBalance('Working Account|KES|700000.00')
    expect(accounts[0]).toStrictEqual({
      name: 'Working Account',
      currency: 'KES',
      amount: '700000.00',
    })
  })

  it('handles Daraja documented format: Charges Paid Account|KES|-1540.00', () => {
    const accounts = parseAccountBalance('Charges Paid Account|KES|-1540.00')
    expect(accounts[0]).toStrictEqual({
      name: 'Charges Paid Account',
      currency: 'KES',
      amount: '-1540.00',
    })
  })

  it('handles Daraja documented format: Utility Account|KES|228037.00', () => {
    const accounts = parseAccountBalance('Utility Account|KES|228037.00')
    expect(accounts[0]).toStrictEqual({
      name: 'Utility Account',
      currency: 'KES',
      amount: '228037.00',
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. getAccountBalanceParam() — RESULT PARAMETER EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccountBalanceParam() — result parameter extraction', () => {
  it('extracts AccountBalance from success result', () => {
    const value = getAccountBalanceParam(SUCCESS_RESULT, 'AccountBalance')
    expect(typeof value).toBe('string')
    expect(value).toContain('Working Account')
  })

  it('extracts BOCompletedTime from success result', () => {
    const value = getAccountBalanceParam(SUCCESS_RESULT, 'BOCompletedTime')
    expect(value).toBe('20200109125710')
  })

  it('returns undefined for a key not present in parameters', () => {
    expect(getAccountBalanceParam(SUCCESS_RESULT, 'NonExistentKey')).toBeUndefined()
  })

  it('returns undefined when ResultParameters is absent (failure case)', () => {
    expect(getAccountBalanceParam(FAILURE_RESULT, 'AccountBalance')).toBeUndefined()
  })

  it('returns undefined for empty result parameters', () => {
    const result: AccountBalanceResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: { ResultParameter: [] },
      },
    }
    expect(getAccountBalanceParam(result, 'AccountBalance')).toBeUndefined()
  })

  it('handles single ResultParameter (non-array form per Daraja inconsistency)', () => {
    const result: AccountBalanceResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: {
          ResultParameter: { Key: 'AccountBalance', Value: 'Working Account|KES|500.00' } as never,
        },
      },
    }
    const value = getAccountBalanceParam(result, 'AccountBalance')
    expect(value).toBe('Working Account|KES|500.00')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. FIELD EXTRACTOR HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccountBalanceTransactionId()', () => {
  it('returns TransactionID from success result', () => {
    expect(getAccountBalanceTransactionId(SUCCESS_RESULT)).toBe('0A90000000')
  })

  it('returns TransactionID from failure result', () => {
    expect(getAccountBalanceTransactionId(FAILURE_RESULT)).toBe('0A90000001')
  })

  it('returns a non-empty string', () => {
    const txId = getAccountBalanceTransactionId(SUCCESS_RESULT)
    expect(typeof txId).toBe('string')
    expect(txId.length).toBeGreaterThan(0)
  })
})

describe('getAccountBalanceConversationId()', () => {
  it('returns ConversationID from success result', () => {
    expect(getAccountBalanceConversationId(SUCCESS_RESULT)).toBe('AG_20200206_00005e091a8ec6b9eac5')
  })

  it('returns ConversationID from failure result', () => {
    expect(getAccountBalanceConversationId(FAILURE_RESULT)).toBe('AG_20200206_00005e091a8ec6b9eac6')
  })
})

describe('getAccountBalanceOriginatorConversationId()', () => {
  it('returns OriginatorConversationID from success result', () => {
    expect(getAccountBalanceOriginatorConversationId(SUCCESS_RESULT)).toBe('16917-22577599-3')
  })

  it('returns OriginatorConversationID from failure result', () => {
    expect(getAccountBalanceOriginatorConversationId(FAILURE_RESULT)).toBe('16917-22577599-4')
  })
})

describe('getAccountBalanceCompletedTime()', () => {
  it('returns BOCompletedTime from success result', () => {
    expect(getAccountBalanceCompletedTime(SUCCESS_RESULT)).toBe('20200109125710')
  })

  it('returns null when ResultParameters is absent (failure)', () => {
    expect(getAccountBalanceCompletedTime(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when BOCompletedTime key is not in parameters', () => {
    const result: AccountBalanceResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: {
          ResultParameter: [{ Key: 'AccountBalance', Value: 'Working Account|KES|500.00' }],
        },
      },
    }
    expect(getAccountBalanceCompletedTime(result)).toBeNull()
  })
})

describe('getAccountBalanceRawBalance()', () => {
  it('returns the raw AccountBalance string from success result', () => {
    const raw = getAccountBalanceRawBalance(SUCCESS_RESULT)
    expect(typeof raw).toBe('string')
    expect(raw).toContain('Working Account')
    expect(raw).toContain('KES')
  })

  it('returns null when ResultParameters is absent (failure case)', () => {
    expect(getAccountBalanceRawBalance(FAILURE_RESULT)).toBeNull()
  })

  it('raw balance string contains pipe separators', () => {
    const raw = getAccountBalanceRawBalance(SUCCESS_RESULT)
    expect(raw).toContain('|')
  })
})

describe('getAccountBalanceReferenceItem()', () => {
  it('returns the ReferenceItem from success result', () => {
    const ref = getAccountBalanceReferenceItem(SUCCESS_RESULT)
    expect(ref).toBeDefined()
    expect(ref).toHaveProperty('Key', 'QueueTimeoutURL')
  })

  it('ReferenceItem Key is QueueTimeoutURL (as documented)', () => {
    const ref = getAccountBalanceReferenceItem(SUCCESS_RESULT)
    expect(ref?.Key).toBe('QueueTimeoutURL')
  })

  it('ReferenceItem Value is a non-empty string', () => {
    const ref = getAccountBalanceReferenceItem(SUCCESS_RESULT)
    expect(typeof ref?.Value).toBe('string')
    expect((ref?.Value ?? '').length).toBeGreaterThan(0)
  })

  it('returns null when ReferenceData is absent (failure)', () => {
    expect(getAccountBalanceReferenceItem(FAILURE_RESULT)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. CALLBACK RESULT PAYLOAD STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Success result payload structure (Daraja spec)', () => {
  it('has a Result root object', () => {
    expect(SUCCESS_RESULT).toHaveProperty('Result')
    expect(typeof SUCCESS_RESULT.Result).toBe('object')
  })

  it('has ResultCode 0 (numeric) for success', () => {
    expect(SUCCESS_RESULT.Result.ResultCode).toBe(0)
    expect(typeof SUCCESS_RESULT.Result.ResultCode).toBe('number')
  })

  it('has ResultType as a string', () => {
    expect(typeof SUCCESS_RESULT.Result.ResultType).toBe('string')
  })

  it('has ResultDesc as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.ResultDesc).toBe('string')
    expect(SUCCESS_RESULT.Result.ResultDesc.length).toBeGreaterThan(0)
  })

  it('has OriginatorConversationID as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.OriginatorConversationID).toBe('string')
    expect(SUCCESS_RESULT.Result.OriginatorConversationID.length).toBeGreaterThan(0)
  })

  it('has ConversationID as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.ConversationID).toBe('string')
    expect(SUCCESS_RESULT.Result.ConversationID.length).toBeGreaterThan(0)
  })

  it('has TransactionID as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.TransactionID).toBe('string')
    expect(SUCCESS_RESULT.Result.TransactionID.length).toBeGreaterThan(0)
  })

  it('has ResultParameters with ResultParameter array', () => {
    expect(SUCCESS_RESULT.Result.ResultParameters).toBeDefined()
    expect(Array.isArray(SUCCESS_RESULT.Result.ResultParameters?.ResultParameter)).toBe(true)
  })

  it('ResultParameters contains documented "AccountBalance" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'AccountBalance')).toBe(true)
  })

  it('ResultParameters contains documented "BOCompletedTime" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'BOCompletedTime')).toBe(true)
  })

  it('has ReferenceData with a ReferenceItem', () => {
    expect(SUCCESS_RESULT.Result.ReferenceData).toBeDefined()
    expect(SUCCESS_RESULT.Result.ReferenceData?.ReferenceItem).toBeDefined()
  })

  it('ReferenceItem Key is QueueTimeoutURL (as documented)', () => {
    const ref = SUCCESS_RESULT.Result.ReferenceData?.ReferenceItem
    const item = Array.isArray(ref) ? ref[0] : ref
    expect(item?.Key).toBe('QueueTimeoutURL')
  })
})

describe('Failure result payload structure (Daraja spec)', () => {
  it('has ResultCode as non-zero number', () => {
    expect(FAILURE_RESULT.Result.ResultCode).not.toBe(0)
    expect(typeof FAILURE_RESULT.Result.ResultCode).toBe('number')
  })

  it('has ResultDesc as a non-empty string', () => {
    expect(typeof FAILURE_RESULT.Result.ResultDesc).toBe('string')
    expect(FAILURE_RESULT.Result.ResultDesc.length).toBeGreaterThan(0)
  })

  it('may not have ResultParameters on failure', () => {
    expect(FAILURE_RESULT.Result.ResultParameters).toBeUndefined()
  })

  it('isAccountBalanceSuccess returns false for failure ResultCode', () => {
    expect(isAccountBalanceSuccess(FAILURE_RESULT)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. ACCOUNT TYPES (documented Daraja account types)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Daraja documented account types', () => {
  const FULL_BALANCE_STRING =
    'Working Account|KES|700000.00|KES|0.00|KES|0.00|Charges Paid Account|KES|-1540.00|KES|1540.00|KES|0.00|Utility Account|KES|228037.00|KES|228037.00|'

  it('parses Working Account (MMF) — transition account for bank settlement', () => {
    const accounts = parseAccountBalance(FULL_BALANCE_STRING)
    const working = accounts.find((a) => a.name === 'Working Account')
    expect(working).toBeDefined()
    expect(working?.currency).toBe('KES')
  })

  it('parses Charges Paid Account — deducts charges per business tariff', () => {
    const accounts = parseAccountBalance(FULL_BALANCE_STRING)
    const charges = accounts.find((a) => a.name === 'Charges Paid Account')
    expect(charges).toBeDefined()
    expect(charges?.currency).toBe('KES')
  })

  it('parses Utility Account — receives customer payments', () => {
    const accounts = parseAccountBalance(FULL_BALANCE_STRING)
    const utility = accounts.find((a) => a.name === 'Utility Account')
    expect(utility).toBeDefined()
    expect(utility?.currency).toBe('KES')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. DISCRIMINATED DISPATCH PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Discriminated dispatch pattern', () => {
  function handleResult(result: AccountBalanceResult): string {
    if (isAccountBalanceSuccess(result)) return 'success'
    return 'failure'
  }

  it('routes success result (ResultCode 0) to success branch', () => {
    expect(handleResult(SUCCESS_RESULT)).toBe('success')
  })

  it('routes failure result (ResultCode 18) to failure branch', () => {
    expect(handleResult(FAILURE_RESULT)).toBe('failure')
  })

  it('success handler can safely extract balance fields', () => {
    if (isAccountBalanceSuccess(SUCCESS_RESULT)) {
      const raw = getAccountBalanceRawBalance(SUCCESS_RESULT)
      expect(raw).not.toBeNull()
      const accounts = parseAccountBalance(raw ?? '')
      expect(accounts.length).toBeGreaterThan(0)
      expect(getAccountBalanceCompletedTime(SUCCESS_RESULT)).toBe('20200109125710')
      expect(getAccountBalanceTransactionId(SUCCESS_RESULT)).toBe('0A90000000')
    }
  })

  it('failure handler can safely extract error fields', () => {
    if (!isAccountBalanceSuccess(FAILURE_RESULT)) {
      expect(FAILURE_RESULT.Result.ResultCode).toBe(18)
      expect(getAccountBalanceRawBalance(FAILURE_RESULT)).toBeNull()
      expect(getAccountBalanceCompletedTime(FAILURE_RESULT)).toBeNull()
    }
  })

  it('isAccountBalanceSuccess is mutually exclusive with failure', () => {
    expect(isAccountBalanceSuccess(SUCCESS_RESULT) && isAccountBalanceSuccess(FAILURE_RESULT)).toBe(
      false,
    )
    expect(isAccountBalanceSuccess(SUCCESS_RESULT) || isAccountBalanceSuccess(FAILURE_RESULT)).toBe(
      true,
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. ASYNC NATURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Asynchronous API behavior (Daraja spec)', () => {
  it('sync response only confirms receipt (ResponseCode "0" = accepted, not completed)', async () => {
    mockHttpRequest.mockResolvedValue({ data: ACKNOWLEDGE_RESPONSE } as never)
    const res = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    // ResponseCode "0" means Daraja accepted the request for async processing
    expect(res.ResponseCode).toBe('0')
    // Balance data is NOT in the sync response — it comes via ResultURL callback
    expect(res).not.toHaveProperty('ResultParameters')
    expect(res).not.toHaveProperty('AccountBalance')
  })

  it('sync response has OriginatorConversationID for tracking the async callback', async () => {
    mockHttpRequest.mockResolvedValue({ data: ACKNOWLEDGE_RESPONSE } as never)
    const res = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(res.OriginatorConversationID).toBe('515-5258779-3')
  })

  it('sync response has ConversationID for tracking', async () => {
    mockHttpRequest.mockResolvedValue({ data: ACKNOWLEDGE_RESPONSE } as never)
    const res = await queryAccountBalance(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ConversationID).toBe('string')
    expect(res.ConversationID.length).toBeGreaterThan(0)
  })
})
