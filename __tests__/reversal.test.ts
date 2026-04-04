/**
 * __tests__/reversal.test.ts
 *
 * Complete test suite for the Transaction Reversal module.
 * Strictly aligned with Safaricom Daraja Reversals API documentation.
 *
 * Covers:
 *   Constants
 *   - REVERSAL_RESULT_CODES             — All documented async ResultCode values
 *   - REVERSAL_ERROR_CODES              — All documented API-level errorCode values
 *   - REVERSAL_COMMAND_ID               — Fixed "TransactionReversal"
 *   - REVERSAL_RECEIVER_IDENTIFIER_TYPE — Fixed "11"
 *
 *   API
 *   - requestReversal()                 — POST /mpesa/reversal/v1/request
 *
 *   Type Guards
 *   - isReversalResult()
 *   - isReversalSuccess()
 *   - isReversalFailure()
 *   - isKnownReversalResultCode()
 *
 *   Extractors (from async result callback)
 *   - getReversalResultParam()
 *   - getReversalTransactionId()
 *   - getReversalConversationId()
 *   - getReversalOriginatorConversationId()
 *   - getReversalResultCode()
 *   - getReversalResultDesc()
 *   - getReversalAmount()
 *   - getReversalOriginalTransactionId()
 *   - getReversalCreditPartyPublicName()
 *   - getReversalDebitPartyPublicName()
 *   - getReversalDebitAccountBalance()
 *   - getReversalCompletedTime()
 *   - getReversalCharge()
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
import { requestReversal } from '../src/mpesa/reversal/request'
import {
  REVERSAL_COMMAND_ID,
  REVERSAL_ERROR_CODES,
  REVERSAL_RECEIVER_IDENTIFIER_TYPE,
  REVERSAL_RESULT_CODES,
  getReversalAmount,
  getReversalCharge,
  getReversalCompletedTime,
  getReversalConversationId,
  getReversalCreditPartyPublicName,
  getReversalDebitAccountBalance,
  getReversalDebitPartyPublicName,
  getReversalOriginalTransactionId,
  getReversalOriginatorConversationId,
  getReversalResultCode,
  getReversalResultDesc,
  getReversalResultParam,
  getReversalTransactionId,
  isKnownReversalResultCode,
  isReversalFailure,
  isReversalResult,
  isReversalSuccess,
} from '../src/mpesa/reversal/types'
import type { ReversalRequest, ReversalResponse, ReversalResult } from '../src/mpesa/reversal/types'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-reversal'
const SECURITY_CREDENTIAL = 'jUb+dOXJiBDui8FnruaFckZJQup3kmmCH5XJ4NY/Oo3KaUTmJbxUiVgzBjqdL533='
const INITIATOR_NAME = 'apiop37'

// ── Request fixture (from Daraja docs sample) ─────────────────────────────────

const BASE_REVERSAL_REQUEST: ReversalRequest = {
  transactionId: 'PDU91HIVIT',
  receiverParty: '603021',
  amount: 200,
  resultUrl: 'https://mydomain.com/reversal/result',
  queueTimeOutUrl: 'https://mydomain.com/reversal/queue',
  remarks: 'Payment reversal',
}

// ── Response fixtures (from Daraja docs) ──────────────────────────────────────

const REVERSAL_ACK_RESPONSE: ReversalResponse = {
  OriginatorConversationID: 'f1e2-4b95-a71d-b30d3cdbb7a7735297',
  ConversationID: 'AG_20210706_20106e9209f64bebd05b',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully.',
}

// ── Callback result fixtures (from Daraja docs) ───────────────────────────────

const SUCCESS_RESULT: ReversalResult = {
  Result: {
    ResultType: 0,
    ResultCode: 0,
    ResultDesc: 'The service request is processed successfully.',
    OriginatorConversationID: 'dad6-4c34-8787-c8cb963a496d1268232',
    ConversationID: 'AG_20211114_201018edbbf9f1582eaa',
    TransactionID: 'SKE52PAWR9',
    ResultParameters: {
      ResultParameter: [
        {
          Key: 'DebitAccountBalance',
          Value: 'Utility Account|KES|7722179.62|7722179.62|0.00|0.00',
        },
        { Key: 'Amount', Value: 1.0 },
        { Key: 'TransCompletedTime', Value: 20211114132711 },
        { Key: 'OriginalTransactionID', Value: 'SKC82PACB8' },
        { Key: 'Charge', Value: 0.0 },
        { Key: 'CreditPartyPublicName', Value: '254705912645 - NICHOLAS JOHN SONGOK' },
        { Key: 'DebitPartyPublicName', Value: '600992 - Safaricom Daraja 992' },
      ],
    },
    ReferenceData: {
      ReferenceItem: {
        Key: 'QueueTimeoutURL',
        Value: 'https://internalsandbox.safaricom.co.ke/mpesa/reversalresults/v1/submit',
      },
    },
  },
}

const FAILURE_RESULT_INVALID_TX: ReversalResult = {
  Result: {
    ResultType: 0,
    ResultCode: 'R000002',
    ResultDesc: 'The OriginalTransactionID is invalid.',
    OriginatorConversationID: '3124-481d-b706-10bdd6fbc8e21792398',
    ConversationID: 'AG_20211114_2010573069aefb6b625a',
    TransactionID: 'SKE0000000',
    ReferenceData: {
      ReferenceItem: {
        Key: 'QueueTimeoutURL',
        Value: 'https://internalsandbox.safaricom.co.ke/mpesa/reversalresults/v1/submit',
      },
    },
  },
}

const FAILURE_RESULT_ALREADY_REVERSED: ReversalResult = {
  Result: {
    ResultType: 0,
    ResultCode: 'R000001',
    ResultDesc: 'The transaction has already been reversed.',
    OriginatorConversationID: 'abc1-1234-5678-def9012345678901',
    ConversationID: 'AG_20211114_abc123',
    TransactionID: 'SKE0000001',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. REVERSAL_COMMAND_ID CONSTANT
// ═══════════════════════════════════════════════════════════════════════════════

describe('REVERSAL_COMMAND_ID (documented by Daraja)', () => {
  it('is "TransactionReversal" — the only allowed CommandID', () => {
    expect(REVERSAL_COMMAND_ID).toBe('TransactionReversal')
  })

  it('is a string', () => {
    expect(typeof REVERSAL_COMMAND_ID).toBe('string')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. REVERSAL_RECEIVER_IDENTIFIER_TYPE CONSTANT
// ═══════════════════════════════════════════════════════════════════════════════

describe('REVERSAL_RECEIVER_IDENTIFIER_TYPE (documented by Daraja)', () => {
  it('is "11" — the only valid value per Daraja docs', () => {
    expect(REVERSAL_RECEIVER_IDENTIFIER_TYPE).toBe('11')
  })

  it('is a string (not a number)', () => {
    expect(typeof REVERSAL_RECEIVER_IDENTIFIER_TYPE).toBe('string')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. REVERSAL_RESULT_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('REVERSAL_RESULT_CODES (documented by Daraja)', () => {
  it('SUCCESS is 0 (number)', () => {
    expect(REVERSAL_RESULT_CODES.SUCCESS).toBe(0)
    expect(typeof REVERSAL_RESULT_CODES.SUCCESS).toBe('number')
  })

  it('INSUFFICIENT_BALANCE is 1', () => {
    expect(REVERSAL_RESULT_CODES.INSUFFICIENT_BALANCE).toBe(1)
  })

  it('DEBIT_PARTY_INVALID_STATE is 11', () => {
    expect(REVERSAL_RESULT_CODES.DEBIT_PARTY_INVALID_STATE).toBe(11)
  })

  it('INITIATOR_NOT_ALLOWED is 21', () => {
    expect(REVERSAL_RESULT_CODES.INITIATOR_NOT_ALLOWED).toBe(21)
  })

  it('INITIATOR_INFORMATION_INVALID is 2001', () => {
    expect(REVERSAL_RESULT_CODES.INITIATOR_INFORMATION_INVALID).toBe(2001)
  })

  it('DECLINED_ACCOUNT_RULE is 2006', () => {
    expect(REVERSAL_RESULT_CODES.DECLINED_ACCOUNT_RULE).toBe(2006)
  })

  it('NOT_PERMITTED is 2028', () => {
    expect(REVERSAL_RESULT_CODES.NOT_PERMITTED).toBe(2028)
  })

  it('SECURITY_CREDENTIAL_LOCKED is 8006', () => {
    expect(REVERSAL_RESULT_CODES.SECURITY_CREDENTIAL_LOCKED).toBe(8006)
  })

  it('ALREADY_REVERSED is "R000001" (string per Daraja docs)', () => {
    expect(REVERSAL_RESULT_CODES.ALREADY_REVERSED).toBe('R000001')
    expect(typeof REVERSAL_RESULT_CODES.ALREADY_REVERSED).toBe('string')
  })

  it('INVALID_TRANSACTION_ID is "R000002" (string per Daraja docs)', () => {
    expect(REVERSAL_RESULT_CODES.INVALID_TRANSACTION_ID).toBe('R000002')
    expect(typeof REVERSAL_RESULT_CODES.INVALID_TRANSACTION_ID).toBe('string')
  })

  it('contains exactly 10 documented result codes', () => {
    expect(Object.keys(REVERSAL_RESULT_CODES)).toHaveLength(10)
  })

  it('R000001 and R000002 are string codes (not numeric) per Daraja docs', () => {
    expect(typeof REVERSAL_RESULT_CODES.ALREADY_REVERSED).toBe('string')
    expect(typeof REVERSAL_RESULT_CODES.INVALID_TRANSACTION_ID).toBe('string')
  })

  it('numeric result codes are all numbers', () => {
    const numericCodes = [
      REVERSAL_RESULT_CODES.SUCCESS,
      REVERSAL_RESULT_CODES.INSUFFICIENT_BALANCE,
      REVERSAL_RESULT_CODES.DEBIT_PARTY_INVALID_STATE,
      REVERSAL_RESULT_CODES.INITIATOR_NOT_ALLOWED,
      REVERSAL_RESULT_CODES.INITIATOR_INFORMATION_INVALID,
      REVERSAL_RESULT_CODES.DECLINED_ACCOUNT_RULE,
      REVERSAL_RESULT_CODES.NOT_PERMITTED,
      REVERSAL_RESULT_CODES.SECURITY_CREDENTIAL_LOCKED,
    ]
    for (const code of numericCodes) {
      expect(typeof code).toBe('number')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. REVERSAL_ERROR_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('REVERSAL_ERROR_CODES (documented by Daraja)', () => {
  it('INVALID_ACCESS_TOKEN is "404.001.03"', () => {
    expect(REVERSAL_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('404.001.03')
  })

  it('BAD_REQUEST is "400.002.02"', () => {
    expect(REVERSAL_ERROR_CODES.BAD_REQUEST).toBe('400.002.02')
  })

  it('RESOURCE_NOT_FOUND is "404.001.01"', () => {
    expect(REVERSAL_ERROR_CODES.RESOURCE_NOT_FOUND).toBe('404.001.01')
  })

  it('INTERNAL_SERVER_ERROR is "500.001.1001"', () => {
    expect(REVERSAL_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('500.001.1001')
  })

  it('SPIKE_ARREST is "500.003.02"', () => {
    expect(REVERSAL_ERROR_CODES.SPIKE_ARREST).toBe('500.003.02')
  })

  it('QUOTA_VIOLATION is "500.003.03"', () => {
    expect(REVERSAL_ERROR_CODES.QUOTA_VIOLATION).toBe('500.003.03')
  })

  it('contains exactly 6 documented error codes', () => {
    expect(Object.keys(REVERSAL_ERROR_CODES)).toHaveLength(6)
  })

  it('all error codes are non-empty strings', () => {
    for (const code of Object.values(REVERSAL_ERROR_CODES)) {
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. requestReversal() — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestReversal() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
  })

  it('returns the Daraja acknowledgement on success', async () => {
    const result = await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    expect(result).toStrictEqual(REVERSAL_ACK_RESPONSE)
  })

  it('calls the correct sandbox endpoint', async () => {
    await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/reversal/v1/request`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('calls the correct production endpoint', async () => {
    await requestReversal(
      PROD_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/mpesa/reversal/v1/request`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
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
// 6. requestReversal() — REQUEST BODY SHAPE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestReversal() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  async function makeRequest(overrides?: Partial<ReversalRequest>) {
    await requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REVERSAL_REQUEST,
      ...overrides,
    })
  }

  it('sends Initiator as the initiatorName argument', async () => {
    await makeRequest()
    expect(getBody()['Initiator']).toBe(INITIATOR_NAME)
  })

  it('sends SecurityCredential as provided', async () => {
    await makeRequest()
    expect(getBody()['SecurityCredential']).toBe(SECURITY_CREDENTIAL)
  })

  it('sends CommandID as "TransactionReversal" (only allowed value per docs)', async () => {
    await makeRequest()
    expect(getBody()['CommandID']).toBe('TransactionReversal')
    expect(getBody()['CommandID']).toBe(REVERSAL_COMMAND_ID)
  })

  it('sends TransactionID exactly as provided', async () => {
    await makeRequest()
    expect(getBody()['TransactionID']).toBe('PDU91HIVIT')
  })

  it('sends Amount as a string per Daraja docs sample', async () => {
    await makeRequest()
    const amount = getBody()['Amount']
    expect(typeof amount).toBe('string')
    expect(amount).toBe('200')
  })

  it('rounds fractional amounts before stringifying (99.7 → "100")', async () => {
    await makeRequest({ amount: 99.7 })
    expect(getBody()['Amount']).toBe('100')
  })

  it('sends ReceiverParty as a string', async () => {
    await makeRequest()
    const rp = getBody()['ReceiverParty']
    expect(typeof rp).toBe('string')
    expect(rp).toBe('603021')
  })

  it('sends RecieverIdentifierType as "11" always (per Daraja docs)', async () => {
    await makeRequest()
    expect(getBody()['RecieverIdentifierType']).toBe('11')
  })

  it('sends RecieverIdentifierType "11" even when not in request (default)', async () => {
    const req: ReversalRequest = { ...BASE_REVERSAL_REQUEST }
    delete req.receiverIdentifierType
    await requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, req)
    expect(getBody()['RecieverIdentifierType']).toBe('11')
  })

  it('sends ResultURL exactly as provided', async () => {
    await makeRequest()
    expect(getBody()['ResultURL']).toBe('https://mydomain.com/reversal/result')
  })

  it('sends QueueTimeOutURL exactly as provided', async () => {
    await makeRequest()
    expect(getBody()['QueueTimeOutURL']).toBe('https://mydomain.com/reversal/queue')
  })

  it('sends Remarks as provided', async () => {
    await makeRequest()
    expect(getBody()['Remarks']).toBe('Payment reversal')
  })

  it('defaults Remarks to "Transaction Reversal" when not provided', async () => {
    const req: ReversalRequest = { ...BASE_REVERSAL_REQUEST }
    delete req.remarks
    await requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, req)
    expect(getBody()['Remarks']).toBe('Transaction Reversal')
  })

  it('includes Occasion field when provided', async () => {
    await makeRequest({ occasion: 'Monthly reconciliation' })
    expect(getBody()['Occasion']).toBe('Monthly reconciliation')
  })

  it('does NOT include Occasion field when not provided', async () => {
    const req: ReversalRequest = { ...BASE_REVERSAL_REQUEST }
    delete req.occasion
    await requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, req)
    expect(getBody()).not.toHaveProperty('Occasion')
  })

  it('sends exactly 10 fields in the request body (without Occasion)', async () => {
    await makeRequest()
    const body = getBody()
    const expectedFields = [
      'Initiator',
      'SecurityCredential',
      'CommandID',
      'TransactionID',
      'Amount',
      'ReceiverParty',
      'RecieverIdentifierType',
      'ResultURL',
      'QueueTimeOutURL',
      'Remarks',
    ]
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(10)
  })

  it('sends exactly 11 fields when Occasion is provided', async () => {
    await makeRequest({ occasion: 'Test' })
    expect(Object.keys(getBody())).toHaveLength(11)
    expect(getBody()).toHaveProperty('Occasion')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. requestReversal() — RESPONSE FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestReversal() — response fields (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
  })

  it('response includes OriginatorConversationID', async () => {
    const res = await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    expect(typeof res.OriginatorConversationID).toBe('string')
    expect(res.OriginatorConversationID.length).toBeGreaterThan(0)
  })

  it('response includes ConversationID', async () => {
    const res = await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    expect(typeof res.ConversationID).toBe('string')
    expect(res.ConversationID.length).toBeGreaterThan(0)
  })

  it('response includes ResponseCode', async () => {
    const res = await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('ResponseCode "0" indicates the request was accepted', async () => {
    const res = await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    expect(res.ResponseCode).toBe('0')
  })

  it('response matches exact Daraja documented shape', async () => {
    const res = await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    expect(res).toStrictEqual(REVERSAL_ACK_RESPONSE)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. requestReversal() — transactionId VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestReversal() — transactionId validation', () => {
  it('throws VALIDATION_ERROR when transactionId is empty string', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        transactionId: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when transactionId is whitespace only', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        transactionId: '   ',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when transactionId is missing', async () => {
    await requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REVERSAL_REQUEST,
      transactionId: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })

  it('error message mentions TransactionID', async () => {
    const err = await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      { ...BASE_REVERSAL_REQUEST, transactionId: '' },
    ).catch((e: unknown) => e as { message: string })
    expect(err.message.toLowerCase()).toContain('transactionid')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. requestReversal() — receiverParty VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestReversal() — receiverParty validation', () => {
  it('throws VALIDATION_ERROR when receiverParty is empty string', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        receiverParty: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when receiverParty is whitespace only', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        receiverParty: '   ',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when receiverParty is missing', async () => {
    await requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REVERSAL_REQUEST,
      receiverParty: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. requestReversal() — receiverIdentifierType VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestReversal() — receiverIdentifierType validation (must be "11" per docs)', () => {
  it('accepts receiverIdentifierType "11" (the only valid value)', async () => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        receiverIdentifierType: '11',
      }),
    ).resolves.toBeDefined()
  })

  it('accepts when receiverIdentifierType is omitted (defaults to "11")', async () => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
    const req: ReversalRequest = { ...BASE_REVERSAL_REQUEST }
    delete req.receiverIdentifierType
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, req),
    ).resolves.toBeDefined()
  })

  it('throws VALIDATION_ERROR when receiverIdentifierType is "1" (MSISDN — wrong for Reversals)', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        receiverIdentifierType: '1' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when receiverIdentifierType is "2" (Till — wrong for Reversals)', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        receiverIdentifierType: '2' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when receiverIdentifierType is "4" (ShortCode — wrong for Reversals)', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        receiverIdentifierType: '4' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('error message mentions "11" as the required value', async () => {
    const err = await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      { ...BASE_REVERSAL_REQUEST, receiverIdentifierType: '4' as never },
    ).catch((e: unknown) => e as { message: string })
    expect(err.message).toContain('11')
  })

  it('does not call httpRequest when receiverIdentifierType is invalid', async () => {
    await requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REVERSAL_REQUEST,
      receiverIdentifierType: '4' as never,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. requestReversal() — amount VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestReversal() — amount validation', () => {
  it('throws VALIDATION_ERROR for amount 0', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        amount: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for negative amount', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        amount: -100,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount that rounds to 0 (e.g. 0.4)', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        amount: 0.4,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts amount 1 (minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        amount: 1,
      }),
    ).resolves.toBeDefined()
  })

  it('rounds 99.7 to 100 and sends "100"', async () => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
    await requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REVERSAL_REQUEST,
      amount: 99.7,
    })
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(body['Amount']).toBe('100')
  })

  it('does not call httpRequest when amount validation fails', async () => {
    await requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REVERSAL_REQUEST,
      amount: 0,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. requestReversal() — URL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestReversal() — URL validation', () => {
  it('throws VALIDATION_ERROR when resultUrl is empty', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        resultUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when queueTimeOutUrl is empty', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        queueTimeOutUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when resultUrl is whitespace only', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        resultUrl: '   ',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when queueTimeOutUrl is whitespace only', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        queueTimeOutUrl: '   ',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when resultUrl is missing', async () => {
    await requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REVERSAL_REQUEST,
      resultUrl: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. requestReversal() — remarks VALIDATION (2–100 chars per docs)
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestReversal() — remarks validation (2–100 chars per Daraja docs)', () => {
  it('throws VALIDATION_ERROR for remarks with 1 character (below minimum)', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        remarks: 'x',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for remarks with 101 characters (above maximum)', async () => {
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        remarks: 'x'.repeat(101),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts remarks with exactly 2 characters (minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        remarks: 'OK',
      }),
    ).resolves.toBeDefined()
  })

  it('accepts remarks with exactly 100 characters (maximum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REVERSAL_REQUEST,
        remarks: 'x'.repeat(100),
      }),
    ).resolves.toBeDefined()
  })

  it('default remarks "Transaction Reversal" passes validation (18 chars)', async () => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
    const req: ReversalRequest = { ...BASE_REVERSAL_REQUEST }
    delete req.remarks
    await expect(
      requestReversal(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, req),
    ).resolves.toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. requestReversal() — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestReversal() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      requestReversal(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REVERSAL_REQUEST,
      ),
    ).rejects.toThrow('ECONNRESET')
  })

  it('propagates a network timeout Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(
      requestReversal(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REVERSAL_REQUEST,
      ),
    ).rejects.toThrow('ETIMEDOUT')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. isReversalResult() — TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isReversalResult() — type guard', () => {
  it('returns true for a valid successful result payload', () => {
    expect(isReversalResult(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true for a valid failed result payload (R000002)', () => {
    expect(isReversalResult(FAILURE_RESULT_INVALID_TX)).toBe(true)
  })

  it('returns true for a valid failed result payload (R000001)', () => {
    expect(isReversalResult(FAILURE_RESULT_ALREADY_REVERSED)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isReversalResult(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isReversalResult(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isReversalResult({})).toBe(false)
  })

  it('returns false when Result is missing', () => {
    expect(isReversalResult({ SomethingElse: {} })).toBe(false)
  })

  it('returns false when ResultCode is missing', () => {
    const bad = {
      Result: {
        ResultDesc: 'Success',
        ConversationID: 'AG_123',
      },
    }
    expect(isReversalResult(bad)).toBe(false)
  })

  it('returns false when ConversationID is missing', () => {
    const bad = {
      Result: {
        ResultCode: 0,
        ResultDesc: 'Success',
      },
    }
    expect(isReversalResult(bad)).toBe(false)
  })

  it('returns false for a plain string', () => {
    expect(isReversalResult('string')).toBe(false)
  })

  it('returns false for a number', () => {
    expect(isReversalResult(42)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 16. isReversalSuccess() — TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isReversalSuccess() — type guard', () => {
  it('returns true when ResultCode is 0 (success)', () => {
    expect(isReversalSuccess(SUCCESS_RESULT)).toBe(true)
  })

  it('returns false when ResultCode is "R000002" (invalid transaction)', () => {
    expect(isReversalSuccess(FAILURE_RESULT_INVALID_TX)).toBe(false)
  })

  it('returns false when ResultCode is "R000001" (already reversed)', () => {
    expect(isReversalSuccess(FAILURE_RESULT_ALREADY_REVERSED)).toBe(false)
  })

  it('returns false when ResultCode is 1 (insufficient balance)', () => {
    const r: ReversalResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultCode: REVERSAL_RESULT_CODES.INSUFFICIENT_BALANCE,
        ResultParameters: undefined,
      },
    }
    expect(isReversalSuccess(r)).toBe(false)
  })

  it('returns false when ResultCode is 2001 (initiator information invalid)', () => {
    const r: ReversalResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultCode: REVERSAL_RESULT_CODES.INITIATOR_INFORMATION_INVALID,
        ResultParameters: undefined,
      },
    }
    expect(isReversalSuccess(r)).toBe(false)
  })

  it('returns false when ResultCode is 8006 (security credential locked)', () => {
    const r: ReversalResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultCode: REVERSAL_RESULT_CODES.SECURITY_CREDENTIAL_LOCKED,
        ResultParameters: undefined,
      },
    }
    expect(isReversalSuccess(r)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 17. isReversalFailure() — TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isReversalFailure() — type guard', () => {
  it('returns false when ResultCode is 0 (success)', () => {
    expect(isReversalFailure(SUCCESS_RESULT)).toBe(false)
  })

  it('returns true when ResultCode is "R000002"', () => {
    expect(isReversalFailure(FAILURE_RESULT_INVALID_TX)).toBe(true)
  })

  it('returns true when ResultCode is "R000001"', () => {
    expect(isReversalFailure(FAILURE_RESULT_ALREADY_REVERSED)).toBe(true)
  })

  it('isReversalSuccess and isReversalFailure are mutually exclusive', () => {
    for (const result of [
      SUCCESS_RESULT,
      FAILURE_RESULT_INVALID_TX,
      FAILURE_RESULT_ALREADY_REVERSED,
    ]) {
      expect(isReversalSuccess(result) !== isReversalFailure(result)).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 18. isKnownReversalResultCode()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isKnownReversalResultCode()', () => {
  it('returns true for 0 (success)', () => {
    expect(isKnownReversalResultCode(0)).toBe(true)
  })

  it('returns true for 1 (insufficient balance)', () => {
    expect(isKnownReversalResultCode(1)).toBe(true)
  })

  it('returns true for 11 (debit party invalid state)', () => {
    expect(isKnownReversalResultCode(11)).toBe(true)
  })

  it('returns true for 21 (initiator not allowed)', () => {
    expect(isKnownReversalResultCode(21)).toBe(true)
  })

  it('returns true for 2001 (initiator info invalid)', () => {
    expect(isKnownReversalResultCode(2001)).toBe(true)
  })

  it('returns true for 2006 (declined account rule)', () => {
    expect(isKnownReversalResultCode(2006)).toBe(true)
  })

  it('returns true for 2028 (not permitted)', () => {
    expect(isKnownReversalResultCode(2028)).toBe(true)
  })

  it('returns true for 8006 (security credential locked)', () => {
    expect(isKnownReversalResultCode(8006)).toBe(true)
  })

  it('returns true for "R000001" (already reversed)', () => {
    expect(isKnownReversalResultCode('R000001')).toBe(true)
  })

  it('returns true for "R000002" (invalid transaction ID)', () => {
    expect(isKnownReversalResultCode('R000002')).toBe(true)
  })

  it('returns false for an undocumented numeric code', () => {
    expect(isKnownReversalResultCode(9999)).toBe(false)
  })

  it('returns false for a negative number', () => {
    expect(isKnownReversalResultCode(-1)).toBe(false)
  })

  it('returns false for an undocumented string code', () => {
    expect(isKnownReversalResultCode('R999999')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 19. RESULT EXTRACTORS — success callback
// ═══════════════════════════════════════════════════════════════════════════════

describe('getReversalTransactionId()', () => {
  it('returns the reversal receipt number from a successful result', () => {
    expect(getReversalTransactionId(SUCCESS_RESULT)).toBe('SKE52PAWR9')
  })

  it('returns the TransactionID from a failed result', () => {
    expect(getReversalTransactionId(FAILURE_RESULT_INVALID_TX)).toBe('SKE0000000')
  })
})

describe('getReversalConversationId()', () => {
  it('returns ConversationID from a successful result', () => {
    expect(getReversalConversationId(SUCCESS_RESULT)).toBe('AG_20211114_201018edbbf9f1582eaa')
  })

  it('returns ConversationID from a failed result', () => {
    expect(getReversalConversationId(FAILURE_RESULT_INVALID_TX)).toBe(
      'AG_20211114_2010573069aefb6b625a',
    )
  })
})

describe('getReversalOriginatorConversationId()', () => {
  it('returns OriginatorConversationID from a successful result', () => {
    expect(getReversalOriginatorConversationId(SUCCESS_RESULT)).toBe(
      'dad6-4c34-8787-c8cb963a496d1268232',
    )
  })

  it('returns OriginatorConversationID from a failed result', () => {
    expect(getReversalOriginatorConversationId(FAILURE_RESULT_INVALID_TX)).toBe(
      '3124-481d-b706-10bdd6fbc8e21792398',
    )
  })
})

describe('getReversalResultCode()', () => {
  it('returns 0 (number) for a successful result', () => {
    expect(getReversalResultCode(SUCCESS_RESULT)).toBe(0)
    expect(typeof getReversalResultCode(SUCCESS_RESULT)).toBe('number')
  })

  it('returns "R000002" (string) for an invalid transaction ID result', () => {
    expect(getReversalResultCode(FAILURE_RESULT_INVALID_TX)).toBe('R000002')
    expect(typeof getReversalResultCode(FAILURE_RESULT_INVALID_TX)).toBe('string')
  })

  it('returns "R000001" (string) for an already-reversed result', () => {
    expect(getReversalResultCode(FAILURE_RESULT_ALREADY_REVERSED)).toBe('R000001')
  })
})

describe('getReversalResultDesc()', () => {
  it('returns ResultDesc from a successful result', () => {
    expect(getReversalResultDesc(SUCCESS_RESULT)).toBe(
      'The service request is processed successfully.',
    )
  })

  it('returns ResultDesc from a failed result', () => {
    expect(getReversalResultDesc(FAILURE_RESULT_INVALID_TX)).toBe(
      'The OriginalTransactionID is invalid.',
    )
  })
})

describe('getReversalResultParam()', () => {
  it('extracts Amount from a successful result', () => {
    expect(getReversalResultParam(SUCCESS_RESULT, 'Amount')).toBe(1.0)
  })

  it('extracts OriginalTransactionID from a successful result', () => {
    expect(getReversalResultParam(SUCCESS_RESULT, 'OriginalTransactionID')).toBe('SKC82PACB8')
  })

  it('extracts TransCompletedTime from a successful result', () => {
    expect(getReversalResultParam(SUCCESS_RESULT, 'TransCompletedTime')).toBe(20211114132711)
  })

  it('extracts Charge from a successful result', () => {
    expect(getReversalResultParam(SUCCESS_RESULT, 'Charge')).toBe(0.0)
  })

  it('extracts CreditPartyPublicName from a successful result', () => {
    expect(getReversalResultParam(SUCCESS_RESULT, 'CreditPartyPublicName')).toBe(
      '254705912645 - NICHOLAS JOHN SONGOK',
    )
  })

  it('extracts DebitPartyPublicName from a successful result', () => {
    expect(getReversalResultParam(SUCCESS_RESULT, 'DebitPartyPublicName')).toBe(
      '600992 - Safaricom Daraja 992',
    )
  })

  it('extracts DebitAccountBalance from a successful result', () => {
    expect(getReversalResultParam(SUCCESS_RESULT, 'DebitAccountBalance')).toBe(
      'Utility Account|KES|7722179.62|7722179.62|0.00|0.00',
    )
  })

  it('returns undefined for any key when result has no ResultParameters (failure)', () => {
    expect(getReversalResultParam(FAILURE_RESULT_INVALID_TX, 'Amount')).toBeUndefined()
    expect(
      getReversalResultParam(FAILURE_RESULT_INVALID_TX, 'OriginalTransactionID'),
    ).toBeUndefined()
  })
})

describe('getReversalAmount()', () => {
  it('returns the reversed amount as a number', () => {
    expect(getReversalAmount(SUCCESS_RESULT)).toBe(1.0)
    expect(typeof getReversalAmount(SUCCESS_RESULT)).toBe('number')
  })

  it('returns undefined when result has no ResultParameters', () => {
    expect(getReversalAmount(FAILURE_RESULT_INVALID_TX)).toBeUndefined()
  })
})

describe('getReversalOriginalTransactionId()', () => {
  it('returns the original transaction ID that was reversed', () => {
    expect(getReversalOriginalTransactionId(SUCCESS_RESULT)).toBe('SKC82PACB8')
  })

  it('returns undefined when result has no ResultParameters', () => {
    expect(getReversalOriginalTransactionId(FAILURE_RESULT_INVALID_TX)).toBeUndefined()
  })
})

describe('getReversalCreditPartyPublicName()', () => {
  it('returns the credit party public name (refunded customer)', () => {
    expect(getReversalCreditPartyPublicName(SUCCESS_RESULT)).toBe(
      '254705912645 - NICHOLAS JOHN SONGOK',
    )
  })

  it('format includes MSISDN and customer name separated by " - "', () => {
    const name = getReversalCreditPartyPublicName(SUCCESS_RESULT)
    expect(name).toContain(' - ')
  })

  it('returns undefined when result has no ResultParameters', () => {
    expect(getReversalCreditPartyPublicName(FAILURE_RESULT_INVALID_TX)).toBeUndefined()
  })
})

describe('getReversalDebitPartyPublicName()', () => {
  it('returns the debit party public name (your shortcode)', () => {
    expect(getReversalDebitPartyPublicName(SUCCESS_RESULT)).toBe('600992 - Safaricom Daraja 992')
  })

  it('returns undefined when result has no ResultParameters', () => {
    expect(getReversalDebitPartyPublicName(FAILURE_RESULT_INVALID_TX)).toBeUndefined()
  })
})

describe('getReversalDebitAccountBalance()', () => {
  it('returns the debit account balance string', () => {
    const balance = getReversalDebitAccountBalance(SUCCESS_RESULT)
    expect(typeof balance).toBe('string')
    expect(balance).toContain('Utility Account')
    expect(balance).toContain('KES')
  })

  it('returns undefined when result has no ResultParameters', () => {
    expect(getReversalDebitAccountBalance(FAILURE_RESULT_INVALID_TX)).toBeUndefined()
  })
})

describe('getReversalCompletedTime()', () => {
  it('returns completion time as a number in YYYYMMDDHHmmss format', () => {
    const time = getReversalCompletedTime(SUCCESS_RESULT)
    expect(time).toBe(20211114132711)
    expect(typeof time).toBe('number')
  })

  it('TransCompletedTime has 14 digits (YYYYMMDDHHmmss)', () => {
    const time = getReversalCompletedTime(SUCCESS_RESULT)
    expect(String(time)).toHaveLength(14)
  })

  it('returns undefined when result has no ResultParameters', () => {
    expect(getReversalCompletedTime(FAILURE_RESULT_INVALID_TX)).toBeUndefined()
  })
})

describe('getReversalCharge()', () => {
  it('returns the charge as a number (usually 0 for reversals per docs)', () => {
    expect(getReversalCharge(SUCCESS_RESULT)).toBe(0.0)
    expect(typeof getReversalCharge(SUCCESS_RESULT)).toBe('number')
  })

  it('returns undefined when result has no ResultParameters', () => {
    expect(getReversalCharge(FAILURE_RESULT_INVALID_TX)).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 20. CALLBACK STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Reversal callback structure (Daraja spec)', () => {
  it('successful result has all documented top-level fields', () => {
    const r = SUCCESS_RESULT.Result
    expect(typeof r.ResultType).toBe('number')
    expect(r.ResultCode).toBe(0)
    expect(typeof r.ResultDesc).toBe('string')
    expect(typeof r.OriginatorConversationID).toBe('string')
    expect(typeof r.ConversationID).toBe('string')
    expect(typeof r.TransactionID).toBe('string')
  })

  it('successful result has ResultParameters with 7 documented keys', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter ?? []
    const keys = params.map((p) => p.Key)
    const expectedKeys = [
      'DebitAccountBalance',
      'Amount',
      'TransCompletedTime',
      'OriginalTransactionID',
      'Charge',
      'CreditPartyPublicName',
      'DebitPartyPublicName',
    ]
    for (const key of expectedKeys) {
      expect(keys).toContain(key)
    }
    expect(params).toHaveLength(7)
  })

  it('failed result (R000002) has no ResultParameters', () => {
    expect(FAILURE_RESULT_INVALID_TX.Result.ResultParameters).toBeUndefined()
  })

  it('failed result has ResultCode as string "R000002"', () => {
    expect(FAILURE_RESULT_INVALID_TX.Result.ResultCode).toBe('R000002')
    expect(typeof FAILURE_RESULT_INVALID_TX.Result.ResultCode).toBe('string')
  })

  it('successful result has ResultCode as number 0', () => {
    expect(SUCCESS_RESULT.Result.ResultCode).toBe(0)
    expect(typeof SUCCESS_RESULT.Result.ResultCode).toBe('number')
  })

  it('both result types have ReferenceData (QueueTimeoutURL)', () => {
    const successRef = SUCCESS_RESULT.Result.ReferenceData
    const failureRef = FAILURE_RESULT_INVALID_TX.Result.ReferenceData
    expect(successRef).toBeDefined()
    expect(failureRef).toBeDefined()
  })

  it('TransactionID is a non-empty string in both success and failure', () => {
    expect(SUCCESS_RESULT.Result.TransactionID.length).toBeGreaterThan(0)
    expect(FAILURE_RESULT_INVALID_TX.Result.TransactionID.length).toBeGreaterThan(0)
  })

  it('ConversationID starts with "AG_" per Daraja convention', () => {
    expect(SUCCESS_RESULT.Result.ConversationID).toMatch(/^AG_/)
    expect(FAILURE_RESULT_INVALID_TX.Result.ConversationID).toMatch(/^AG_/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 21. INTEGRATION — Constants and helpers work together
// ═══════════════════════════════════════════════════════════════════════════════

describe('Constants and helpers work together (integration)', () => {
  it('REVERSAL_RESULT_CODES.SUCCESS === 0 matches isReversalSuccess logic', () => {
    const successResult: ReversalResult = {
      Result: {
        ResultType: 0,
        ResultCode: REVERSAL_RESULT_CODES.SUCCESS,
        ResultDesc: 'Success',
        OriginatorConversationID: 'test-originator',
        ConversationID: 'AG_test',
        TransactionID: 'TESTTXID',
      },
    }
    expect(isReversalSuccess(successResult)).toBe(true)
    expect(isReversalFailure(successResult)).toBe(false)
  })

  it('REVERSAL_RESULT_CODES.INVALID_TRANSACTION_ID "R000002" detected by isKnownReversalResultCode', () => {
    expect(isKnownReversalResultCode(REVERSAL_RESULT_CODES.INVALID_TRANSACTION_ID)).toBe(true)
  })

  it('REVERSAL_RESULT_CODES.ALREADY_REVERSED "R000001" detected by isKnownReversalResultCode', () => {
    expect(isKnownReversalResultCode(REVERSAL_RESULT_CODES.ALREADY_REVERSED)).toBe(true)
  })

  it('all REVERSAL_RESULT_CODES values pass isKnownReversalResultCode', () => {
    for (const code of Object.values(REVERSAL_RESULT_CODES)) {
      expect(isKnownReversalResultCode(code)).toBe(true)
    }
  })

  it('all REVERSAL_ERROR_CODES are non-empty strings', () => {
    for (const code of Object.values(REVERSAL_ERROR_CODES)) {
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
    }
  })

  it('REVERSAL_RESULT_CODES are all either numbers or "R" prefixed strings', () => {
    for (const [key, code] of Object.entries(REVERSAL_RESULT_CODES)) {
      if (typeof code === 'string') {
        expect(code).toMatch(/^R\d{6}$/)
      } else {
        expect(typeof code).toBe('number')
      }
      expect(key).toBeTruthy()
    }
  })

  it('requestReversal sends REVERSAL_COMMAND_ID in request body', async () => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
    await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(body['CommandID']).toBe(REVERSAL_COMMAND_ID)
  })

  it('requestReversal sends REVERSAL_RECEIVER_IDENTIFIER_TYPE in request body', async () => {
    mockHttpRequest.mockResolvedValue({ data: REVERSAL_ACK_RESPONSE } as never)
    await requestReversal(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REVERSAL_REQUEST,
    )
    const call = mockHttpRequest.mock.calls[0]
    const body = (call?.[1] as { body: Record<string, unknown> }).body
    expect(body['RecieverIdentifierType']).toBe(REVERSAL_RECEIVER_IDENTIFIER_TYPE)
    expect(body['RecieverIdentifierType']).toBe('11')
  })
})
