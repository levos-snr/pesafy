/**
 * __tests__/b2c.test.ts
 *
 * Complete test suite for the B2C Account Top Up module:
 *
 *   Constants
 *   - B2C_RESULT_CODES          — documented result code constants
 *   - B2C_ERROR_CODES           — documented API error codes
 *
 *   Initiation
 *   - initiateB2CPayment()      — POST /mpesa/b2b/v1/paymentrequest
 *
 *   Type guards
 *   - isB2CResult()             — runtime payload type guard
 *   - isB2CSuccess()            — success type guard (handles "0" and 0)
 *   - isB2CFailure()            — failure type guard
 *   - isKnownB2CResultCode()    — known code validator
 *
 *   Payload extractors
 *   - getB2CTransactionId()
 *   - getB2CConversationId()
 *   - getB2COriginatorConversationId()
 *   - getB2CResultDesc()
 *   - getB2CAmount()
 *   - getB2CCurrency()
 *   - getB2CReceiverPublicName()
 *   - getB2CTransactionCompletedTime()
 *   - getB2CDebitAccountBalance()
 *   - getB2CDebitPartyCharges()
 *   - getB2CResultParam()
 *
 * Strictly covers only what is documented in the Safaricom Daraja
 * B2C Account Top Up API documentation.
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
import { initiateB2CPayment } from '../src/mpesa/b2c/payment'
import {
  getB2CAmount,
  getB2CCurrency,
  getB2CDebitAccountBalance,
  getB2CDebitPartyCharges,
  getB2CConversationId,
  getB2COriginatorConversationId,
  getB2CReceiverPublicName,
  getB2CResultDesc,
  getB2CResultParam,
  getB2CTransactionCompletedTime,
  getB2CTransactionId,
  isB2CFailure,
  isB2CResult,
  isB2CSuccess,
  isKnownB2CResultCode,
} from '../src/mpesa/b2c/webhooks'
import { B2C_ERROR_CODES, B2C_RESULT_CODES } from '../src/mpesa/b2c/types'
import type { B2CRequest, B2CResponse, B2CResult } from '../src/mpesa/b2c/types'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-b2c'
const SECURITY_CREDENTIAL = 'EncryptedInitiatorPassword=='
const INITIATOR_NAME = 'testapi'

// ── Request fixtures ──────────────────────────────────────────────────────────

const BASE_REQUEST: B2CRequest = {
  commandId: 'BusinessPayToBulk',
  amount: 239,
  partyA: '600979',
  partyB: '600000',
  accountReference: '353353',
  requester: '254708374149',
  remarks: 'OK',
  queueTimeOutUrl: 'https://mydomain.com/timeout',
  resultUrl: 'https://mydomain.com/result',
}

// ── Response fixtures (from Daraja docs) ──────────────────────────────────────

const INITIATE_RESPONSE: B2CResponse = {
  OriginatorConversationID: '5118-111210482-1',
  ConversationID: 'AG_20230420_2010759fd5662ef6d054',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully.',
}

// ── Callback payload fixtures (from Daraja docs) ──────────────────────────────

const SUCCESS_RESULT: B2CResult = {
  Result: {
    ResultType: '0',
    ResultCode: '0',
    ResultDesc: 'The service request is processed successfully',
    OriginatorConversationID: '626f6ddf-ab37',
    ConversationID: '12345677dfdf89099B3',
    TransactionID: 'QKA81LK5CY',
    ResultParameters: {
      ResultParameter: [
        { Key: 'DebitAccountBalance', Value: '{CurrencyCode=KES}' },
        { Key: 'Amount', Value: '190.00' },
        { Key: 'Currency', Value: 'KES' },
        { Key: 'ReceiverPartyPublicName', Value: 'Bulk Disbursement Account' },
        { Key: 'TransactionCompletedTime', Value: '20230420121530' },
        { Key: 'DebitPartyCharges', Value: '' },
      ],
    },
  },
}

const FAILURE_RESULT: B2CResult = {
  Result: {
    ResultType: 0,
    ResultCode: 2001,
    ResultDesc: 'The initiator information is invalid.',
    OriginatorConversationID: '12337-23509183-5',
    ConversationID: 'AG_20200120_0000657265d5fa9ae5c0',
    TransactionID: 'OAK0000000',
  },
}

// Result with minimal parameters (no ResultParameters at all — failure case)
const FAILURE_NO_PARAMS: B2CResult = {
  Result: {
    ResultType: 0,
    ResultCode: 2001,
    ResultDesc: 'The initiator information is invalid.',
    OriginatorConversationID: 'ORG-001',
    ConversationID: 'CONV-001',
    TransactionID: 'OAK0000000',
  },
}

// Success result with single ResultParameter object (not array) — Daraja inconsistency
const SUCCESS_SINGLE_PARAM: B2CResult = {
  Result: {
    ResultType: '0',
    ResultCode: '0',
    ResultDesc: 'The service request is processed successfully',
    OriginatorConversationID: 'ORG-SINGLE',
    ConversationID: 'CONV-SINGLE',
    TransactionID: 'QKA81LK5CZ',
    ResultParameters: {
      ResultParameter: { Key: 'Amount', Value: '500.00' },
    },
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. B2C_RESULT_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2C_RESULT_CODES (documented by Daraja)', () => {
  it('SUCCESS is 0 (numeric)', () => {
    expect(B2C_RESULT_CODES.SUCCESS).toBe(0)
    expect(typeof B2C_RESULT_CODES.SUCCESS).toBe('number')
  })

  it('INVALID_INITIATOR is 2001', () => {
    expect(B2C_RESULT_CODES.INVALID_INITIATOR).toBe(2001)
    expect(typeof B2C_RESULT_CODES.INVALID_INITIATOR).toBe('number')
  })

  it('contains exactly 2 documented result codes', () => {
    expect(Object.keys(B2C_RESULT_CODES)).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. B2C_ERROR_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2C_ERROR_CODES (documented by Daraja)', () => {
  it('INVALID_ACCESS_TOKEN is "400.003.01"', () => {
    expect(B2C_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
  })

  it('BAD_REQUEST is "400.003.02"', () => {
    expect(B2C_ERROR_CODES.BAD_REQUEST).toBe('400.003.02')
  })

  it('INTERNAL_SERVER_ERROR is "500.003.1001"', () => {
    expect(B2C_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('500.003.1001')
  })

  it('QUOTA_VIOLATION is "500.003.03"', () => {
    expect(B2C_ERROR_CODES.QUOTA_VIOLATION).toBe('500.003.03')
  })

  it('SPIKE_ARREST is "500.003.02"', () => {
    expect(B2C_ERROR_CODES.SPIKE_ARREST).toBe('500.003.02')
  })

  it('NOT_FOUND is "404.003.01"', () => {
    expect(B2C_ERROR_CODES.NOT_FOUND).toBe('404.003.01')
  })

  it('INVALID_AUTH_HEADER is "404.001.04"', () => {
    expect(B2C_ERROR_CODES.INVALID_AUTH_HEADER).toBe('404.001.04')
  })

  it('INVALID_PAYLOAD is "400.002.05"', () => {
    expect(B2C_ERROR_CODES.INVALID_PAYLOAD).toBe('400.002.05')
  })

  it('contains exactly 8 documented error codes', () => {
    expect(Object.keys(B2C_ERROR_CODES)).toHaveLength(8)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. isKnownB2CResultCode()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isKnownB2CResultCode()', () => {
  it('returns true for 0 (success)', () => {
    expect(isKnownB2CResultCode(0)).toBe(true)
  })

  it('returns true for 2001 (invalid initiator)', () => {
    expect(isKnownB2CResultCode(2001)).toBe(true)
  })

  it('returns true for "0" (string — success variant from docs)', () => {
    expect(isKnownB2CResultCode('0')).toBe(true)
  })

  it('returns true for "2001" (string variant)', () => {
    expect(isKnownB2CResultCode('2001')).toBe(true)
  })

  it('returns false for an undocumented code', () => {
    expect(isKnownB2CResultCode(9999)).toBe(false)
  })

  it('returns false for a negative number', () => {
    expect(isKnownB2CResultCode(-1)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isKnownB2CResultCode(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isKnownB2CResultCode(undefined)).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isKnownB2CResultCode('')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. initiateB2CPayment() — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2CPayment() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('returns the Daraja acknowledgement on success', async () => {
    const result = await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(result).toStrictEqual(INITIATE_RESPONSE)
  })

  it('calls the correct Daraja B2C endpoint', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/b2b/v1/paymentrequest`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses the production endpoint URL', async () => {
    await initiateB2CPayment(
      PROD_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/mpesa/b2b/v1/paymentrequest`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await initiateB2CPayment(
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
// 5. initiateB2CPayment() — REQUEST BODY SHAPE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2CPayment() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends Initiator as the provided initiator name', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Initiator']).toBe('testapi')
  })

  it('sends SecurityCredential as provided', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['SecurityCredential']).toBe(SECURITY_CREDENTIAL)
  })

  it('sends CommandID as "BusinessPayToBulk"', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['CommandID']).toBe('BusinessPayToBulk')
  })

  it('sends SenderIdentifierType as "4" (hardcoded per docs)', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['SenderIdentifierType']).toBe('4')
  })

  it('sends RecieverIdentifierType as "4" (hardcoded per docs)', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['RecieverIdentifierType']).toBe('4')
  })

  it('sends Amount as a STRING (per Daraja JSON spec)', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['Amount']).toBe('string')
    expect(getBody()['Amount']).toBe('239')
  })

  it('rounds fractional amounts before stringifying (e.g. 239.7 → "240")', async () => {
    await initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      amount: 239.7,
    })
    expect(getBody()['Amount']).toBe('240')
  })

  it('sends PartyA as a string', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['PartyA']).toBe('string')
    expect(getBody()['PartyA']).toBe('600979')
  })

  it('sends PartyB as a string', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['PartyB']).toBe('string')
    expect(getBody()['PartyB']).toBe('600000')
  })

  it('sends AccountReference exactly as provided', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['AccountReference']).toBe('353353')
  })

  it('sends Remarks exactly as provided', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Remarks']).toBe('OK')
  })

  it('defaults Remarks to "B2C Account Top Up" when not provided', async () => {
    const { remarks: _, ...withoutRemarks } = BASE_REQUEST
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutRemarks,
    )
    expect(getBody()['Remarks']).toBe('B2C Account Top Up')
  })

  it('sends QueueTimeOutURL exactly as provided', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['QueueTimeOutURL']).toBe('https://mydomain.com/timeout')
  })

  it('sends ResultURL exactly as provided', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['ResultURL']).toBe('https://mydomain.com/result')
  })

  it('includes Requester when provided', async () => {
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Requester']).toBe('254708374149')
  })

  it('sends 13 fields when Requester is provided (all documented fields)', async () => {
    await initiateB2CPayment(
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
      'SenderIdentifierType',
      'RecieverIdentifierType',
      'Amount',
      'PartyA',
      'PartyB',
      'AccountReference',
      'Requester',
      'Remarks',
      'QueueTimeOutURL',
      'ResultURL',
    ]
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(13)
  })

  it('omits Requester when not provided and sends exactly 12 fields', async () => {
    const { requester: _, ...withoutRequester } = BASE_REQUEST
    await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutRequester,
    )
    const body = getBody()
    expect(body).not.toHaveProperty('Requester')
    expect(Object.keys(body)).toHaveLength(12)
  })

  it('omits Requester when it is an empty string', async () => {
    await initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      requester: '',
    })
    expect(getBody()).not.toHaveProperty('Requester')
  })

  it('omits Requester when it is whitespace only', async () => {
    await initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      requester: '   ',
    })
    expect(getBody()).not.toHaveProperty('Requester')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. initiateB2CPayment() — VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2CPayment() — CommandID validation', () => {
  it('throws VALIDATION_ERROR when commandId is not "BusinessPayToBulk"', async () => {
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        commandId: 'BusinessPayment' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('error message mentions "BusinessPayToBulk"', async () => {
    const error = await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      {
        ...BASE_REQUEST,
        commandId: 'SalaryPayment' as never,
      },
    ).catch((e: unknown) => e as { message: string })
    expect(error.message).toContain('BusinessPayToBulk')
  })

  it('does not call httpRequest when commandId is wrong', async () => {
    await initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      commandId: 'PromotionPayment' as never,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })

  it('accepts "BusinessPayToBulk" (the only valid commandId)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      initiateB2CPayment(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REQUEST,
      ),
    ).resolves.toBeDefined()
  })
})

describe('initiateB2CPayment() — amount validation', () => {
  it('throws VALIDATION_ERROR for amount 0', async () => {
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for negative amount', async () => {
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: -100,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount that rounds to 0 (e.g. 0.4)', async () => {
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0.4,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts amount 1 (minimum valid value)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 1,
      }),
    ).resolves.toBeDefined()
  })

  it('accepts 0.6 which rounds to 1 (meets minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0.6,
      }),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when amount validation fails', async () => {
    await initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      amount: 0,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('initiateB2CPayment() — required field validation', () => {
  it('throws VALIDATION_ERROR when partyA is empty', async () => {
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyA: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when partyA is whitespace only', async () => {
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyA: '   ',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when partyB is empty', async () => {
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyB: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when accountReference is empty', async () => {
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        accountReference: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when resultUrl is empty', async () => {
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        resultUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when queueTimeOutUrl is empty', async () => {
    await expect(
      initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        queueTimeOutUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when required field validation fails', async () => {
    await initiateB2CPayment(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      partyA: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. initiateB2CPayment() — RESPONSE FIELDS (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2CPayment() — response fields (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('response includes OriginatorConversationID', async () => {
    const res = await initiateB2CPayment(
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
    const res = await initiateB2CPayment(
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
    const res = await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('ResponseCode "0" indicates the request was accepted', async () => {
    const res = await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(res.ResponseCode).toBe('0')
  })

  it('response matches the exact Daraja documented payload', async () => {
    const res = await initiateB2CPayment(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(res).toStrictEqual(INITIATE_RESPONSE)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. initiateB2CPayment() — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2CPayment() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      initiateB2CPayment(
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
      initiateB2CPayment(
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
// 9. isB2CResult() — RUNTIME TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2CResult() — runtime type guard', () => {
  it('returns true for a valid success result payload', () => {
    expect(isB2CResult(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true for a valid failure result payload', () => {
    expect(isB2CResult(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for a failure result with no ResultParameters', () => {
    expect(isB2CResult(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isB2CResult(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isB2CResult(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isB2CResult({})).toBe(false)
  })

  it('returns false when Result is missing', () => {
    expect(isB2CResult({ data: 'something' })).toBe(false)
  })

  it('returns false when ResultCode is missing from Result', () => {
    expect(isB2CResult({ Result: { ConversationID: 'x', OriginatorConversationID: 'y' } })).toBe(
      false,
    )
  })

  it('returns false when ConversationID is missing from Result', () => {
    expect(isB2CResult({ Result: { ResultCode: 0, OriginatorConversationID: 'y' } })).toBe(false)
  })

  it('returns false when OriginatorConversationID is missing from Result', () => {
    expect(isB2CResult({ Result: { ResultCode: 0, ConversationID: 'x' } })).toBe(false)
  })

  it('returns false for a non-object value', () => {
    expect(isB2CResult('string')).toBe(false)
    expect(isB2CResult(42)).toBe(false)
    expect(isB2CResult([])).toBe(false)
    expect(isB2CResult(true)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. isB2CSuccess() — SUCCESS TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2CSuccess() — success type guard', () => {
  it('returns true when ResultCode is "0" (string — documented in success sample)', () => {
    expect(isB2CSuccess(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true when ResultCode is 0 (number)', () => {
    const result: B2CResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: 0 },
    }
    expect(isB2CSuccess(result)).toBe(true)
  })

  it('returns false when ResultCode is 2001 (invalid initiator)', () => {
    expect(isB2CSuccess(FAILURE_RESULT)).toBe(false)
  })

  it('returns false when ResultCode is any non-zero number', () => {
    const result: B2CResult = {
      Result: { ...FAILURE_RESULT.Result, ResultCode: 1 },
    }
    expect(isB2CSuccess(result)).toBe(false)
  })

  it('returns false when ResultCode is a non-zero string', () => {
    const result: B2CResult = {
      Result: { ...FAILURE_RESULT.Result, ResultCode: '2001' },
    }
    expect(isB2CSuccess(result)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. isB2CFailure() — FAILURE TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2CFailure() — failure type guard', () => {
  it('returns false for success result (ResultCode "0")', () => {
    expect(isB2CFailure(SUCCESS_RESULT)).toBe(false)
  })

  it('returns false for success result (ResultCode 0)', () => {
    const result: B2CResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: 0 },
    }
    expect(isB2CFailure(result)).toBe(false)
  })

  it('returns true for failure result (ResultCode 2001)', () => {
    expect(isB2CFailure(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for failure result with no ResultParameters', () => {
    expect(isB2CFailure(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('isB2CSuccess and isB2CFailure are mutually exclusive', () => {
    expect(isB2CSuccess(SUCCESS_RESULT) && isB2CFailure(SUCCESS_RESULT)).toBe(false)
    expect(isB2CSuccess(FAILURE_RESULT) && isB2CFailure(FAILURE_RESULT)).toBe(false)
    expect(isB2CSuccess(SUCCESS_RESULT) || isB2CFailure(SUCCESS_RESULT)).toBe(true)
    expect(isB2CSuccess(FAILURE_RESULT) || isB2CFailure(FAILURE_RESULT)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. PAYLOAD EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2CTransactionId()', () => {
  it('returns TransactionID from success result', () => {
    expect(getB2CTransactionId(SUCCESS_RESULT)).toBe('QKA81LK5CY')
  })

  it('returns TransactionID from failure result (generic on failure)', () => {
    expect(getB2CTransactionId(FAILURE_RESULT)).toBe('OAK0000000')
  })
})

describe('getB2CConversationId()', () => {
  it('returns ConversationID from success result', () => {
    expect(getB2CConversationId(SUCCESS_RESULT)).toBe('12345677dfdf89099B3')
  })

  it('returns ConversationID from failure result', () => {
    expect(getB2CConversationId(FAILURE_RESULT)).toBe('AG_20200120_0000657265d5fa9ae5c0')
  })
})

describe('getB2COriginatorConversationId()', () => {
  it('returns OriginatorConversationID from success result', () => {
    expect(getB2COriginatorConversationId(SUCCESS_RESULT)).toBe('626f6ddf-ab37')
  })

  it('returns OriginatorConversationID from failure result', () => {
    expect(getB2COriginatorConversationId(FAILURE_RESULT)).toBe('12337-23509183-5')
  })
})

describe('getB2CResultDesc()', () => {
  it('returns ResultDesc from success result', () => {
    expect(getB2CResultDesc(SUCCESS_RESULT)).toBe('The service request is processed successfully')
  })

  it('returns ResultDesc from failure result', () => {
    expect(getB2CResultDesc(FAILURE_RESULT)).toBe('The initiator information is invalid.')
  })
})

describe('getB2CAmount()', () => {
  it('returns Amount as a number from success result', () => {
    expect(getB2CAmount(SUCCESS_RESULT)).toBe(190)
    expect(typeof getB2CAmount(SUCCESS_RESULT)).toBe('number')
  })

  it('returns null when ResultParameters is absent (failure case)', () => {
    expect(getB2CAmount(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when Amount key is not in parameters', () => {
    expect(getB2CAmount(FAILURE_NO_PARAMS)).toBeNull()
  })

  it('returns correct value for whole-number amount strings (e.g. "190.00" → 190)', () => {
    expect(getB2CAmount(SUCCESS_RESULT)).toBe(190)
  })

  it('returns Amount from single-parameter result (non-array form)', () => {
    expect(getB2CAmount(SUCCESS_SINGLE_PARAM)).toBe(500)
  })
})

describe('getB2CCurrency()', () => {
  it('returns "KES" from success result', () => {
    expect(getB2CCurrency(SUCCESS_RESULT)).toBe('KES')
  })

  it('returns "KES" as default when Currency is not in parameters', () => {
    expect(getB2CCurrency(FAILURE_RESULT)).toBe('KES')
  })

  it('returns "KES" when ResultParameters is absent', () => {
    expect(getB2CCurrency(FAILURE_NO_PARAMS)).toBe('KES')
  })
})

describe('getB2CReceiverPublicName()', () => {
  it('returns ReceiverPartyPublicName from success result', () => {
    expect(getB2CReceiverPublicName(SUCCESS_RESULT)).toBe('Bulk Disbursement Account')
  })

  it('returns null when not present in failure result', () => {
    expect(getB2CReceiverPublicName(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2CReceiverPublicName(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2CTransactionCompletedTime()', () => {
  it('returns TransactionCompletedTime from success result', () => {
    expect(getB2CTransactionCompletedTime(SUCCESS_RESULT)).toBe('20230420121530')
  })

  it('returns null when not present in failure result', () => {
    expect(getB2CTransactionCompletedTime(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2CTransactionCompletedTime(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2CDebitAccountBalance()', () => {
  it('returns DebitAccountBalance from success result', () => {
    expect(getB2CDebitAccountBalance(SUCCESS_RESULT)).toBe('{CurrencyCode=KES}')
  })

  it('returns null when not present in failure result', () => {
    expect(getB2CDebitAccountBalance(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2CDebitAccountBalance(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2CDebitPartyCharges()', () => {
  it('returns null when DebitPartyCharges is an empty string (no charges)', () => {
    // SUCCESS_RESULT has DebitPartyCharges: '' — empty string means no charges
    expect(getB2CDebitPartyCharges(SUCCESS_RESULT)).toBeNull()
  })

  it('returns charge string when charges are present', () => {
    const withCharges: B2CResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: {
          ResultParameter: [
            { Key: 'Amount', Value: '190.00' },
            { Key: 'DebitPartyCharges', Value: '5.00' },
          ],
        },
      },
    }
    expect(getB2CDebitPartyCharges(withCharges)).toBe('5.00')
  })

  it('returns null when not present in failure result', () => {
    expect(getB2CDebitPartyCharges(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2CDebitPartyCharges(FAILURE_NO_PARAMS)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. getB2CResultParam() — INTERNAL HELPER
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2CResultParam() — parameter extraction helper', () => {
  it('extracts a value from an array of ResultParameters', () => {
    expect(getB2CResultParam(SUCCESS_RESULT, 'Amount')).toBe('190.00')
  })

  it('extracts a value from a single ResultParameter (non-array form)', () => {
    expect(getB2CResultParam(SUCCESS_SINGLE_PARAM, 'Amount')).toBe('500.00')
  })

  it('returns undefined for a key not present in parameters', () => {
    expect(getB2CResultParam(SUCCESS_RESULT, 'NonExistentKey')).toBeUndefined()
  })

  it('returns undefined when ResultParameters is absent', () => {
    expect(getB2CResultParam(FAILURE_NO_PARAMS, 'Amount')).toBeUndefined()
  })

  it('returns undefined when ResultParameter array is empty', () => {
    const result: B2CResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: { ResultParameter: [] },
      },
    }
    expect(getB2CResultParam(result, 'Amount')).toBeUndefined()
  })

  it('extracts all documented parameter keys correctly', () => {
    expect(getB2CResultParam(SUCCESS_RESULT, 'DebitAccountBalance')).toBe('{CurrencyCode=KES}')
    expect(getB2CResultParam(SUCCESS_RESULT, 'Amount')).toBe('190.00')
    expect(getB2CResultParam(SUCCESS_RESULT, 'Currency')).toBe('KES')
    expect(getB2CResultParam(SUCCESS_RESULT, 'ReceiverPartyPublicName')).toBe(
      'Bulk Disbursement Account',
    )
    expect(getB2CResultParam(SUCCESS_RESULT, 'TransactionCompletedTime')).toBe('20230420121530')
    expect(getB2CResultParam(SUCCESS_RESULT, 'DebitPartyCharges')).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. CALLBACK PAYLOAD STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Successful result payload structure (Daraja spec)', () => {
  it('has a Result root object', () => {
    expect(SUCCESS_RESULT).toHaveProperty('Result')
    expect(typeof SUCCESS_RESULT.Result).toBe('object')
  })

  it('has ResultCode as "0" (string — per success docs sample)', () => {
    expect(SUCCESS_RESULT.Result.ResultCode).toBe('0')
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

  it('has ResultParameters with a ResultParameter array', () => {
    expect(SUCCESS_RESULT.Result.ResultParameters).toBeDefined()
    expect(Array.isArray(SUCCESS_RESULT.Result.ResultParameters?.ResultParameter)).toBe(true)
  })

  it('ResultParameters contains documented "Amount" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'Amount')).toBe(true)
  })

  it('ResultParameters contains documented "Currency" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'Currency')).toBe(true)
  })

  it('ResultParameters contains documented "DebitAccountBalance" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'DebitAccountBalance')).toBe(true)
  })
})

describe('Failed result payload structure (Daraja spec)', () => {
  it('has ResultCode as 2001 (number — per failure docs sample)', () => {
    expect(FAILURE_RESULT.Result.ResultCode).toBe(2001)
    expect(typeof FAILURE_RESULT.Result.ResultCode).toBe('number')
  })

  it('has a non-zero ResultCode', () => {
    expect(FAILURE_RESULT.Result.ResultCode).not.toBe(0)
    expect(FAILURE_RESULT.Result.ResultCode).not.toBe('0')
  })

  it('has ResultDesc as a non-empty string', () => {
    expect(typeof FAILURE_RESULT.Result.ResultDesc).toBe('string')
    expect(FAILURE_RESULT.Result.ResultDesc.length).toBeGreaterThan(0)
  })

  it('has a TransactionID even on failure (generic ID)', () => {
    expect(typeof FAILURE_RESULT.Result.TransactionID).toBe('string')
    expect(FAILURE_RESULT.Result.TransactionID.length).toBeGreaterThan(0)
  })

  it('may not have ResultParameters on failure', () => {
    // Failure result typically has no ResultParameters
    expect(FAILURE_RESULT.Result.ResultParameters).toBeUndefined()
  })

  it('isKnownB2CResultCode returns true for failure ResultCode 2001', () => {
    expect(isKnownB2CResultCode(FAILURE_RESULT.Result.ResultCode)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. DISCRIMINATED DISPATCH PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Discriminated dispatch pattern', () => {
  /**
   * Simulates a real result handler using the type guards.
   * Returns which branch was taken.
   */
  function handleResult(result: B2CResult): string {
    if (isB2CSuccess(result)) return 'success'
    if (isB2CFailure(result)) return 'failure'
    return 'unknown'
  }

  it('routes success result (ResultCode "0") to success branch', () => {
    expect(handleResult(SUCCESS_RESULT)).toBe('success')
  })

  it('routes success result (ResultCode 0) to success branch', () => {
    const result: B2CResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: 0 },
    }
    expect(handleResult(result)).toBe('success')
  })

  it('routes failure result (ResultCode 2001) to failure branch', () => {
    expect(handleResult(FAILURE_RESULT)).toBe('failure')
  })

  it('routes failure result with no params to failure branch', () => {
    expect(handleResult(FAILURE_NO_PARAMS)).toBe('failure')
  })

  it('success handler can safely extract transaction fields', () => {
    if (isB2CSuccess(SUCCESS_RESULT)) {
      expect(getB2CTransactionId(SUCCESS_RESULT)).toBe('QKA81LK5CY')
      expect(getB2CConversationId(SUCCESS_RESULT)).toBe('12345677dfdf89099B3')
      expect(getB2CAmount(SUCCESS_RESULT)).toBe(190)
      expect(getB2CCurrency(SUCCESS_RESULT)).toBe('KES')
    }
  })

  it('failure handler can safely extract error fields', () => {
    if (isB2CFailure(FAILURE_RESULT)) {
      expect(getB2CResultDesc(FAILURE_RESULT)).toBe('The initiator information is invalid.')
      expect(getB2CAmount(FAILURE_RESULT)).toBeNull()
      expect(getB2CReceiverPublicName(FAILURE_RESULT)).toBeNull()
    }
  })
})
