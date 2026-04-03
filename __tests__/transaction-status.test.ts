/**
 * __tests__/transaction-status.test.ts
 *
 * Complete test suite for the Transaction Status module:
 *
 *   Constants
 *   - TRANSACTION_STATUS_ERROR_CODES   — documented API error codes
 *   - TRANSACTION_STATUS_RESULT_CODES  — documented result codes
 *
 *   queryTransactionStatus()
 *   - POST /mpesa/transactionstatus/v1/query
 *   - Request body shape (Daraja spec)
 *   - Validation — transactionId / originalConversationId / required fields
 *   - Response fields
 *   - Error propagation
 *   - Sandbox vs production URLs
 *
 *   Type guards
 *   - isTransactionStatusResult()
 *   - isTransactionStatusSuccess()
 *   - isTransactionStatusFailure()
 *   - isKnownTransactionStatusResultCode()
 *
 *   Payload extractors
 *   - getTransactionStatusTransactionId()
 *   - getTransactionStatusConversationId()
 *   - getTransactionStatusOriginatorConversationId()
 *   - getTransactionStatusResultDesc()
 *   - getTransactionStatusResultCode()
 *   - getTransactionStatusAmount()
 *   - getTransactionStatusReceiptNo()
 *   - getTransactionStatusStatus()
 *   - getTransactionStatusDebitPartyName()
 *   - getTransactionStatusCreditPartyName()
 *   - getTransactionStatusDebitAccountBalance()
 *   - getTransactionStatusTransactionDate()
 *   - getTransactionStatusResultParam()
 *
 * Strictly covers only what is documented in the Safaricom Daraja
 * Transaction Status API documentation.
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
import { queryTransactionStatus } from '../src/mpesa/transaction-status/query'
import {
  getTransactionStatusAmount,
  getTransactionStatusConversationId,
  getTransactionStatusCreditPartyName,
  getTransactionStatusDebitAccountBalance,
  getTransactionStatusDebitPartyName,
  getTransactionStatusOriginatorConversationId,
  getTransactionStatusReceiptNo,
  getTransactionStatusResultCode,
  getTransactionStatusResultDesc,
  getTransactionStatusResultParam,
  getTransactionStatusStatus,
  getTransactionStatusTransactionDate,
  getTransactionStatusTransactionId,
  isKnownTransactionStatusResultCode,
  isTransactionStatusFailure,
  isTransactionStatusResult,
  isTransactionStatusSuccess,
} from '../src/mpesa/transaction-status/webhooks'
import {
  TRANSACTION_STATUS_ERROR_CODES,
  TRANSACTION_STATUS_RESULT_CODES,
} from '../src/mpesa/transaction-status/types'
import type {
  TransactionStatusRequest,
  TransactionStatusResponse,
  TransactionStatusResult,
} from '../src/mpesa/transaction-status/types'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-txstatus'
const SECURITY_CREDENTIAL = 'EncryptedInitiatorPassword=='
const INITIATOR_NAME = 'testapiuser'

// ── Request fixtures ──────────────────────────────────────────────────────────

const BASE_REQUEST_TX_ID: TransactionStatusRequest = {
  transactionId: 'NEF61H8J60',
  partyA: '600782',
  identifierType: '4',
  resultUrl: 'https://mydomain.com/txstatus/result',
  queueTimeOutUrl: 'https://mydomain.com/txstatus/timeout',
  remarks: 'OK',
  occasion: 'OK',
}

const BASE_REQUEST_CONV_ID: TransactionStatusRequest = {
  originalConversationId: '7071-4170-a0e5-8345632bad4421',
  partyA: '600782',
  identifierType: '4',
  resultUrl: 'https://mydomain.com/txstatus/result',
  queueTimeOutUrl: 'https://mydomain.com/txstatus/timeout',
}

const BASE_REQUEST_BOTH: TransactionStatusRequest = {
  transactionId: 'NEF61H8J60',
  originalConversationId: '7071-4170-a0e5-8345632bad4421',
  partyA: '600782',
  identifierType: '4',
  resultUrl: 'https://mydomain.com/txstatus/result',
  queueTimeOutUrl: 'https://mydomain.com/txstatus/timeout',
}

// ── Response fixtures (from Daraja docs) ──────────────────────────────────────

const INITIATE_RESPONSE: TransactionStatusResponse = {
  OriginatorConversationID: '1236-7134259-1',
  ConversationID: 'AG_20210709_1234409f86436c583e3f',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully.',
}

// ── Callback payload fixtures (from Daraja docs) ──────────────────────────────

const SUCCESS_RESULT: TransactionStatusResult = {
  Result: {
    ResultType: 0,
    ResultCode: 0,
    ResultDesc: 'The service request is processed successfully',
    OriginatorConversationID: '3213-416199-2',
    ConversationID: 'AG_20180223_0000493344ae97d86f75',
    TransactionID: 'MBN31H462N',
    ResultParameters: {
      ResultParameter: [
        { Key: 'DebitPartyName', Value: '600310 Safaricom333' },
        { Key: 'TransactionStatus', Value: 'Completed' },
        { Key: 'Amount', Value: '300' },
        { Key: 'ReceiptNo', Value: 'MBN31H462N' },
        { Key: 'DebitAccountBalance', Value: '{Amount=0}' },
        { Key: 'TransactionDate', Value: '20180223095051' },
        { Key: 'CreditPartyName', Value: '254708374149 - John Doe' },
      ],
    },
    ReferenceData: {
      ReferenceItem: { Key: 'Occasion' },
    },
  },
}

// ResultCode as string "0" — Daraja inconsistency handling
const SUCCESS_RESULT_STRING_CODE: TransactionStatusResult = {
  Result: {
    ...SUCCESS_RESULT.Result,
    ResultCode: '0',
    ResultType: '0',
  },
}

const FAILURE_RESULT: TransactionStatusResult = {
  Result: {
    ResultType: 0,
    ResultCode: 2001,
    ResultDesc: 'The initiator information is invalid.',
    OriginatorConversationID: '12337-23509183-5',
    ConversationID: 'AG_20200120_0000657265d5fa9ae5c0',
    TransactionID: 'OAK0000000',
  },
}

const FAILURE_NO_PARAMS: TransactionStatusResult = {
  Result: {
    ResultType: 0,
    ResultCode: 2001,
    ResultDesc: 'The initiator information is invalid.',
    OriginatorConversationID: 'ORG-001',
    ConversationID: 'CONV-001',
    TransactionID: 'OAK0000000',
  },
}

// Single ResultParameter (non-array Daraja inconsistency)
const SUCCESS_SINGLE_PARAM: TransactionStatusResult = {
  Result: {
    ResultType: 0,
    ResultCode: 0,
    ResultDesc: 'The service request is processed successfully',
    OriginatorConversationID: 'ORG-SINGLE',
    ConversationID: 'CONV-SINGLE',
    TransactionID: 'MBN0000001',
    ResultParameters: {
      ResultParameter: { Key: 'Amount', Value: '500' },
    },
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TRANSACTION_STATUS_ERROR_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TRANSACTION_STATUS_ERROR_CODES (documented by Daraja)', () => {
  it('INVALID_ACCESS_TOKEN is "400.003.01"', () => {
    expect(TRANSACTION_STATUS_ERROR_CODES.INVALID_ACCESS_TOKEN).toBe('400.003.01')
  })

  it('BAD_REQUEST is "400.003.02"', () => {
    expect(TRANSACTION_STATUS_ERROR_CODES.BAD_REQUEST).toBe('400.003.02')
  })

  it('INTERNAL_SERVER_ERROR is "500.003.1001"', () => {
    expect(TRANSACTION_STATUS_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('500.003.1001')
  })

  it('QUOTA_VIOLATION is "500.003.03"', () => {
    expect(TRANSACTION_STATUS_ERROR_CODES.QUOTA_VIOLATION).toBe('500.003.03')
  })

  it('SPIKE_ARREST is "500.003.02"', () => {
    expect(TRANSACTION_STATUS_ERROR_CODES.SPIKE_ARREST).toBe('500.003.02')
  })

  it('NOT_FOUND is "404.003.01"', () => {
    expect(TRANSACTION_STATUS_ERROR_CODES.NOT_FOUND).toBe('404.003.01')
  })

  it('INVALID_AUTH_HEADER is "404.001.04"', () => {
    expect(TRANSACTION_STATUS_ERROR_CODES.INVALID_AUTH_HEADER).toBe('404.001.04')
  })

  it('INVALID_PAYLOAD is "400.002.05"', () => {
    expect(TRANSACTION_STATUS_ERROR_CODES.INVALID_PAYLOAD).toBe('400.002.05')
  })

  it('contains exactly 8 documented error codes', () => {
    expect(Object.keys(TRANSACTION_STATUS_ERROR_CODES)).toHaveLength(8)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TRANSACTION_STATUS_RESULT_CODES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TRANSACTION_STATUS_RESULT_CODES (documented by Daraja)', () => {
  it('SUCCESS is 0 (numeric)', () => {
    expect(TRANSACTION_STATUS_RESULT_CODES.SUCCESS).toBe(0)
    expect(typeof TRANSACTION_STATUS_RESULT_CODES.SUCCESS).toBe('number')
  })

  it('INVALID_INITIATOR is 2001', () => {
    expect(TRANSACTION_STATUS_RESULT_CODES.INVALID_INITIATOR).toBe(2001)
    expect(typeof TRANSACTION_STATUS_RESULT_CODES.INVALID_INITIATOR).toBe('number')
  })

  it('contains exactly 2 documented result codes', () => {
    expect(Object.keys(TRANSACTION_STATUS_RESULT_CODES)).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. isKnownTransactionStatusResultCode()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isKnownTransactionStatusResultCode()', () => {
  it('returns true for 0 (success)', () => {
    expect(isKnownTransactionStatusResultCode(0)).toBe(true)
  })

  it('returns true for 2001 (invalid initiator)', () => {
    expect(isKnownTransactionStatusResultCode(2001)).toBe(true)
  })

  it('returns true for "0" (string variant)', () => {
    expect(isKnownTransactionStatusResultCode('0')).toBe(true)
  })

  it('returns true for "2001" (string variant)', () => {
    expect(isKnownTransactionStatusResultCode('2001')).toBe(true)
  })

  it('returns false for an undocumented code', () => {
    expect(isKnownTransactionStatusResultCode(9999)).toBe(false)
  })

  it('returns false for a negative number', () => {
    expect(isKnownTransactionStatusResultCode(-1)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isKnownTransactionStatusResultCode(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isKnownTransactionStatusResultCode(undefined)).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isKnownTransactionStatusResultCode('')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. queryTransactionStatus() — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryTransactionStatus() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('returns the Daraja acknowledgement when using transactionId', async () => {
    const result = await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(result).toStrictEqual(INITIATE_RESPONSE)
  })

  it('returns the Daraja acknowledgement when using originalConversationId', async () => {
    const result = await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_CONV_ID,
    )
    expect(result).toStrictEqual(INITIATE_RESPONSE)
  })

  it('returns the Daraja acknowledgement when both transactionId and originalConversationId are provided', async () => {
    const result = await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_BOTH,
    )
    expect(result).toStrictEqual(INITIATE_RESPONSE)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. queryTransactionStatus() — ENDPOINT SHAPE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryTransactionStatus() — endpoint shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  function getCallArgs() {
    const call = mockHttpRequest.mock.calls[0]
    if (!call) throw new Error('httpRequest was not called')
    const [url, options] = call as [
      string,
      { method: string; headers: Record<string, string>; body: Record<string, unknown> },
    ]
    return { url, options, headers: options.headers ?? {}, body: options.body ?? {} }
  }

  it('calls the correct sandbox endpoint', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    const { url } = getCallArgs()
    expect(url).toBe(`${SANDBOX_URL}/mpesa/transactionstatus/v1/query`)
  })

  it('calls the correct production endpoint', async () => {
    await queryTransactionStatus(
      PROD_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    const { url } = getCallArgs()
    expect(url).toBe(`${PROD_URL}/mpesa/transactionstatus/v1/query`)
  })

  it('uses POST method (Daraja Transaction Status API requirement)', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    const { options } = getCallArgs()
    expect(options.method).toBe('POST')
  })

  it('sends Authorization header with Bearer token', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    const { headers } = getCallArgs()
    expect(headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. queryTransactionStatus() — REQUEST BODY SHAPE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryTransactionStatus() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends Initiator as the provided initiator name', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['Initiator']).toBe(INITIATOR_NAME)
  })

  it('sends SecurityCredential as provided', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['SecurityCredential']).toBe(SECURITY_CREDENTIAL)
  })

  it('sends CommandID as "TransactionStatusQuery" by default', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['CommandID']).toBe('TransactionStatusQuery')
  })

  it('sends CommandID as "TransactionStatusQuery" when explicitly provided', async () => {
    await queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST_TX_ID,
      commandId: 'TransactionStatusQuery',
    })
    expect(getBody()['CommandID']).toBe('TransactionStatusQuery')
  })

  it('sends TransactionID from transactionId field', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['TransactionID']).toBe('NEF61H8J60')
  })

  it('sends OriginalConversationID from originalConversationId field', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_CONV_ID,
    )
    expect(getBody()['OriginalConversationID']).toBe('7071-4170-a0e5-8345632bad4421')
  })

  it('sends empty string for TransactionID when only originalConversationId is provided', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_CONV_ID,
    )
    expect(getBody()['TransactionID']).toBe('')
  })

  it('sends empty string for OriginalConversationID when only transactionId is provided', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['OriginalConversationID']).toBe('')
  })

  it('sends both TransactionID and OriginalConversationID when both provided', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_BOTH,
    )
    expect(getBody()['TransactionID']).toBe('NEF61H8J60')
    expect(getBody()['OriginalConversationID']).toBe('7071-4170-a0e5-8345632bad4421')
  })

  it('sends PartyA exactly as provided', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['PartyA']).toBe('600782')
  })

  it('sends IdentifierType as "4"', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['IdentifierType']).toBe('4')
  })

  it('sends IdentifierType as "1" (MSISDN) when configured', async () => {
    await queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST_TX_ID,
      identifierType: '1',
    })
    expect(getBody()['IdentifierType']).toBe('1')
  })

  it('sends IdentifierType as "2" (Till) when configured', async () => {
    await queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST_TX_ID,
      identifierType: '2',
    })
    expect(getBody()['IdentifierType']).toBe('2')
  })

  it('sends ResultURL exactly as provided', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['ResultURL']).toBe('https://mydomain.com/txstatus/result')
  })

  it('sends QueueTimeOutURL exactly as provided', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['QueueTimeOutURL']).toBe('https://mydomain.com/txstatus/timeout')
  })

  it('sends Remarks exactly as provided', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['Remarks']).toBe('OK')
  })

  it('defaults Remarks to "Transaction Status Query" when not provided', async () => {
    const { remarks: _, ...withoutRemarks } = BASE_REQUEST_TX_ID
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutRemarks,
    )
    expect(getBody()['Remarks']).toBe('Transaction Status Query')
  })

  it('sends Occasion exactly as provided', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(getBody()['Occasion']).toBe('OK')
  })

  it('defaults Occasion to "" when not provided', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_CONV_ID,
    )
    expect(getBody()['Occasion']).toBe('')
  })

  it('sends exactly 11 documented body fields', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    const body = getBody()
    const expectedFields = [
      'Initiator',
      'SecurityCredential',
      'CommandID',
      'TransactionID',
      'OriginalConversationID',
      'PartyA',
      'IdentifierType',
      'ResultURL',
      'QueueTimeOutURL',
      'Remarks',
      'Occasion',
    ]
    for (const field of expectedFields) {
      expect(body).toHaveProperty(field)
    }
    expect(Object.keys(body)).toHaveLength(11)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. queryTransactionStatus() — VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryTransactionStatus() — identifier validation', () => {
  it('throws VALIDATION_ERROR when neither transactionId nor originalConversationId is provided', async () => {
    const { transactionId: _, ...withoutId } = BASE_REQUEST_TX_ID
    await expect(
      queryTransactionStatus(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        withoutId,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('error message mentions both transactionId and originalConversationId', async () => {
    const { transactionId: _, ...withoutId } = BASE_REQUEST_TX_ID
    const err = await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutId,
    ).catch((e: { message: string }) => e)
    expect(err.message).toContain('transactionId')
    expect(err.message).toContain('originalConversationId')
  })

  it('throws VALIDATION_ERROR when transactionId is an empty string', async () => {
    await expect(
      queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST_TX_ID,
        transactionId: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when transactionId is whitespace only', async () => {
    await expect(
      queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST_TX_ID,
        transactionId: '   ',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not throw when only transactionId is provided (no originalConversationId)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      queryTransactionStatus(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REQUEST_TX_ID,
      ),
    ).resolves.toBeDefined()
  })

  it('does not throw when only originalConversationId is provided (no transactionId)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      queryTransactionStatus(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REQUEST_CONV_ID,
      ),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when identifier validation fails', async () => {
    const { transactionId: _, ...withoutId } = BASE_REQUEST_TX_ID
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      withoutId,
    ).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('queryTransactionStatus() — required field validation', () => {
  it('throws VALIDATION_ERROR when partyA is empty', async () => {
    await expect(
      queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST_TX_ID,
        partyA: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when partyA is whitespace only', async () => {
    await expect(
      queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST_TX_ID,
        partyA: '   ',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when identifierType is missing', async () => {
    await expect(
      queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST_TX_ID,
        identifierType: '' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when resultUrl is empty', async () => {
    await expect(
      queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST_TX_ID,
        resultUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when queueTimeOutUrl is empty', async () => {
    await expect(
      queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST_TX_ID,
        queueTimeOutUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when required field validation fails', async () => {
    await queryTransactionStatus(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST_TX_ID,
      partyA: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. queryTransactionStatus() — RESPONSE FIELDS (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryTransactionStatus() — response fields (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('response includes OriginatorConversationID', async () => {
    const res = await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(typeof res.OriginatorConversationID).toBe('string')
    expect(res.OriginatorConversationID.length).toBeGreaterThan(0)
  })

  it('response includes ConversationID', async () => {
    const res = await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(typeof res.ConversationID).toBe('string')
    expect(res.ConversationID.length).toBeGreaterThan(0)
  })

  it('response includes ResponseCode', async () => {
    const res = await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('response includes ResponseDescription', async () => {
    const res = await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(typeof res.ResponseDescription).toBe('string')
  })

  it('ResponseCode "0" indicates the request was accepted', async () => {
    const res = await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(res.ResponseCode).toBe('0')
  })

  it('response matches the exact Daraja documented payload', async () => {
    const res = await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    expect(res).toStrictEqual(INITIATE_RESPONSE)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. queryTransactionStatus() — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryTransactionStatus() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      queryTransactionStatus(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REQUEST_TX_ID,
      ),
    ).rejects.toThrow('ECONNRESET')
  })

  it('propagates a network timeout Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(
      queryTransactionStatus(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REQUEST_TX_ID,
      ),
    ).rejects.toThrow('ETIMEDOUT')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. isTransactionStatusResult() — RUNTIME TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isTransactionStatusResult() — runtime type guard', () => {
  it('returns true for a valid success result payload', () => {
    expect(isTransactionStatusResult(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true for a valid failure result payload', () => {
    expect(isTransactionStatusResult(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for a failure result with no ResultParameters', () => {
    expect(isTransactionStatusResult(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('returns true when ResultCode is a string', () => {
    expect(isTransactionStatusResult(SUCCESS_RESULT_STRING_CODE)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isTransactionStatusResult(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isTransactionStatusResult(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isTransactionStatusResult({})).toBe(false)
  })

  it('returns false when Result is missing', () => {
    expect(isTransactionStatusResult({ data: 'something' })).toBe(false)
  })

  it('returns false when ResultCode is missing from Result', () => {
    expect(
      isTransactionStatusResult({ Result: { ConversationID: 'x', OriginatorConversationID: 'y' } }),
    ).toBe(false)
  })

  it('returns false when ConversationID is missing from Result', () => {
    expect(
      isTransactionStatusResult({ Result: { ResultCode: 0, OriginatorConversationID: 'y' } }),
    ).toBe(false)
  })

  it('returns false when OriginatorConversationID is missing from Result', () => {
    expect(isTransactionStatusResult({ Result: { ResultCode: 0, ConversationID: 'x' } })).toBe(
      false,
    )
  })

  it('returns false for non-object values', () => {
    expect(isTransactionStatusResult('string')).toBe(false)
    expect(isTransactionStatusResult(42)).toBe(false)
    expect(isTransactionStatusResult([])).toBe(false)
    expect(isTransactionStatusResult(true)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. isTransactionStatusSuccess() — SUCCESS TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isTransactionStatusSuccess() — success type guard', () => {
  it('returns true when ResultCode is 0 (number)', () => {
    expect(isTransactionStatusSuccess(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true when ResultCode is "0" (string)', () => {
    expect(isTransactionStatusSuccess(SUCCESS_RESULT_STRING_CODE)).toBe(true)
  })

  it('returns false when ResultCode is 2001 (invalid initiator)', () => {
    expect(isTransactionStatusSuccess(FAILURE_RESULT)).toBe(false)
  })

  it('returns false when ResultCode is any non-zero number', () => {
    const result: TransactionStatusResult = {
      Result: { ...FAILURE_RESULT.Result, ResultCode: 1 },
    }
    expect(isTransactionStatusSuccess(result)).toBe(false)
  })

  it('returns false when ResultCode is a non-zero string', () => {
    const result: TransactionStatusResult = {
      Result: { ...FAILURE_RESULT.Result, ResultCode: '2001' },
    }
    expect(isTransactionStatusSuccess(result)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. isTransactionStatusFailure() — FAILURE TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('isTransactionStatusFailure() — failure type guard', () => {
  it('returns false for success result (ResultCode 0)', () => {
    expect(isTransactionStatusFailure(SUCCESS_RESULT)).toBe(false)
  })

  it('returns false for success result (ResultCode "0")', () => {
    expect(isTransactionStatusFailure(SUCCESS_RESULT_STRING_CODE)).toBe(false)
  })

  it('returns true for failure result (ResultCode 2001)', () => {
    expect(isTransactionStatusFailure(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for failure result with no ResultParameters', () => {
    expect(isTransactionStatusFailure(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('isTransactionStatusSuccess and isTransactionStatusFailure are mutually exclusive', () => {
    expect(
      isTransactionStatusSuccess(SUCCESS_RESULT) && isTransactionStatusFailure(SUCCESS_RESULT),
    ).toBe(false)
    expect(
      isTransactionStatusSuccess(FAILURE_RESULT) && isTransactionStatusFailure(FAILURE_RESULT),
    ).toBe(false)
    expect(
      isTransactionStatusSuccess(SUCCESS_RESULT) || isTransactionStatusFailure(SUCCESS_RESULT),
    ).toBe(true)
    expect(
      isTransactionStatusSuccess(FAILURE_RESULT) || isTransactionStatusFailure(FAILURE_RESULT),
    ).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. CORE FIELD EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTransactionStatusTransactionId()', () => {
  it('returns TransactionID from success result', () => {
    expect(getTransactionStatusTransactionId(SUCCESS_RESULT)).toBe('MBN31H462N')
  })

  it('returns TransactionID from failure result', () => {
    expect(getTransactionStatusTransactionId(FAILURE_RESULT)).toBe('OAK0000000')
  })
})

describe('getTransactionStatusConversationId()', () => {
  it('returns ConversationID from success result', () => {
    expect(getTransactionStatusConversationId(SUCCESS_RESULT)).toBe(
      'AG_20180223_0000493344ae97d86f75',
    )
  })

  it('returns ConversationID from failure result', () => {
    expect(getTransactionStatusConversationId(FAILURE_RESULT)).toBe(
      'AG_20200120_0000657265d5fa9ae5c0',
    )
  })
})

describe('getTransactionStatusOriginatorConversationId()', () => {
  it('returns OriginatorConversationID from success result', () => {
    expect(getTransactionStatusOriginatorConversationId(SUCCESS_RESULT)).toBe('3213-416199-2')
  })

  it('returns OriginatorConversationID from failure result', () => {
    expect(getTransactionStatusOriginatorConversationId(FAILURE_RESULT)).toBe('12337-23509183-5')
  })
})

describe('getTransactionStatusResultDesc()', () => {
  it('returns ResultDesc from success result', () => {
    expect(getTransactionStatusResultDesc(SUCCESS_RESULT)).toBe(
      'The service request is processed successfully',
    )
  })

  it('returns ResultDesc from failure result', () => {
    expect(getTransactionStatusResultDesc(FAILURE_RESULT)).toBe(
      'The initiator information is invalid.',
    )
  })
})

describe('getTransactionStatusResultCode()', () => {
  it('returns numeric 0 from success result', () => {
    expect(getTransactionStatusResultCode(SUCCESS_RESULT)).toBe(0)
  })

  it('returns string "0" when ResultCode is a string', () => {
    expect(getTransactionStatusResultCode(SUCCESS_RESULT_STRING_CODE)).toBe('0')
  })

  it('returns 2001 from failure result', () => {
    expect(getTransactionStatusResultCode(FAILURE_RESULT)).toBe(2001)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. RESULT PARAMETER EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTransactionStatusAmount()', () => {
  it('returns Amount as a number from success result', () => {
    expect(getTransactionStatusAmount(SUCCESS_RESULT)).toBe(300)
    expect(typeof getTransactionStatusAmount(SUCCESS_RESULT)).toBe('number')
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getTransactionStatusAmount(FAILURE_NO_PARAMS)).toBeNull()
  })

  it('returns null when Amount key is not in parameters', () => {
    expect(getTransactionStatusAmount(FAILURE_RESULT)).toBeNull()
  })

  it('returns Amount from single-parameter result (non-array form)', () => {
    expect(getTransactionStatusAmount(SUCCESS_SINGLE_PARAM)).toBe(500)
  })
})

describe('getTransactionStatusReceiptNo()', () => {
  it('returns ReceiptNo from success result', () => {
    expect(getTransactionStatusReceiptNo(SUCCESS_RESULT)).toBe('MBN31H462N')
  })

  it('returns null when not present in failure result', () => {
    expect(getTransactionStatusReceiptNo(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getTransactionStatusReceiptNo(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getTransactionStatusStatus()', () => {
  it('returns TransactionStatus from success result', () => {
    expect(getTransactionStatusStatus(SUCCESS_RESULT)).toBe('Completed')
  })

  it('returns null when not present in failure result', () => {
    expect(getTransactionStatusStatus(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getTransactionStatusStatus(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getTransactionStatusDebitPartyName()', () => {
  it('returns DebitPartyName from success result', () => {
    expect(getTransactionStatusDebitPartyName(SUCCESS_RESULT)).toBe('600310 Safaricom333')
  })

  it('returns null when not present in failure result', () => {
    expect(getTransactionStatusDebitPartyName(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getTransactionStatusDebitPartyName(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getTransactionStatusCreditPartyName()', () => {
  it('returns CreditPartyName from success result', () => {
    expect(getTransactionStatusCreditPartyName(SUCCESS_RESULT)).toBe('254708374149 - John Doe')
  })

  it('returns null when not present in failure result', () => {
    expect(getTransactionStatusCreditPartyName(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getTransactionStatusCreditPartyName(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getTransactionStatusDebitAccountBalance()', () => {
  it('returns DebitAccountBalance from success result', () => {
    expect(getTransactionStatusDebitAccountBalance(SUCCESS_RESULT)).toBe('{Amount=0}')
  })

  it('returns null when not present in failure result', () => {
    expect(getTransactionStatusDebitAccountBalance(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getTransactionStatusDebitAccountBalance(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getTransactionStatusTransactionDate()', () => {
  it('returns TransactionDate from success result', () => {
    expect(getTransactionStatusTransactionDate(SUCCESS_RESULT)).toBe('20180223095051')
  })

  it('returns null when not present in failure result', () => {
    expect(getTransactionStatusTransactionDate(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getTransactionStatusTransactionDate(FAILURE_NO_PARAMS)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. getTransactionStatusResultParam() — INTERNAL HELPER
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTransactionStatusResultParam() — parameter extraction helper', () => {
  it('extracts a value from an array of ResultParameters', () => {
    expect(getTransactionStatusResultParam(SUCCESS_RESULT, 'Amount')).toBe('300')
  })

  it('extracts a value from a single ResultParameter (non-array form)', () => {
    expect(getTransactionStatusResultParam(SUCCESS_SINGLE_PARAM, 'Amount')).toBe('500')
  })

  it('returns undefined for a key not present in parameters', () => {
    expect(getTransactionStatusResultParam(SUCCESS_RESULT, 'NonExistentKey')).toBeUndefined()
  })

  it('returns undefined when ResultParameters is absent', () => {
    expect(getTransactionStatusResultParam(FAILURE_NO_PARAMS, 'Amount')).toBeUndefined()
  })

  it('returns undefined when ResultParameter array is empty', () => {
    const result: TransactionStatusResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: { ResultParameter: [] },
      },
    }
    expect(getTransactionStatusResultParam(result, 'Amount')).toBeUndefined()
  })

  it('extracts all documented parameter keys correctly', () => {
    expect(getTransactionStatusResultParam(SUCCESS_RESULT, 'DebitPartyName')).toBe(
      '600310 Safaricom333',
    )
    expect(getTransactionStatusResultParam(SUCCESS_RESULT, 'TransactionStatus')).toBe('Completed')
    expect(getTransactionStatusResultParam(SUCCESS_RESULT, 'Amount')).toBe('300')
    expect(getTransactionStatusResultParam(SUCCESS_RESULT, 'ReceiptNo')).toBe('MBN31H462N')
    expect(getTransactionStatusResultParam(SUCCESS_RESULT, 'DebitAccountBalance')).toBe(
      '{Amount=0}',
    )
    expect(getTransactionStatusResultParam(SUCCESS_RESULT, 'TransactionDate')).toBe(
      '20180223095051',
    )
    expect(getTransactionStatusResultParam(SUCCESS_RESULT, 'CreditPartyName')).toBe(
      '254708374149 - John Doe',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 16. CALLBACK PAYLOAD STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Successful result payload structure (Daraja spec)', () => {
  it('has a Result root object', () => {
    expect(SUCCESS_RESULT).toHaveProperty('Result')
    expect(typeof SUCCESS_RESULT.Result).toBe('object')
  })

  it('has ResultCode 0 (number — per success docs sample)', () => {
    expect(SUCCESS_RESULT.Result.ResultCode).toBe(0)
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

  it('ResultParameters contains documented "TransactionStatus" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'TransactionStatus')).toBe(true)
  })

  it('ResultParameters contains documented "ReceiptNo" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'ReceiptNo')).toBe(true)
  })

  it('ResultParameters contains documented "DebitPartyName" key', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'DebitPartyName')).toBe(true)
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
    expect(FAILURE_RESULT.Result.ResultParameters).toBeUndefined()
  })

  it('isKnownTransactionStatusResultCode returns true for failure ResultCode 2001', () => {
    expect(isKnownTransactionStatusResultCode(FAILURE_RESULT.Result.ResultCode)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 17. DISCRIMINATED DISPATCH PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Discriminated dispatch pattern', () => {
  function handleResult(result: TransactionStatusResult): string {
    if (isTransactionStatusSuccess(result)) return 'success'
    if (isTransactionStatusFailure(result)) return 'failure'
    return 'unknown'
  }

  it('routes success result (ResultCode 0) to success branch', () => {
    expect(handleResult(SUCCESS_RESULT)).toBe('success')
  })

  it('routes success result (ResultCode "0") to success branch', () => {
    expect(handleResult(SUCCESS_RESULT_STRING_CODE)).toBe('success')
  })

  it('routes failure result (ResultCode 2001) to failure branch', () => {
    expect(handleResult(FAILURE_RESULT)).toBe('failure')
  })

  it('routes failure result with no params to failure branch', () => {
    expect(handleResult(FAILURE_NO_PARAMS)).toBe('failure')
  })

  it('success handler can safely extract all documented fields', () => {
    if (isTransactionStatusSuccess(SUCCESS_RESULT)) {
      expect(getTransactionStatusTransactionId(SUCCESS_RESULT)).toBe('MBN31H462N')
      expect(getTransactionStatusConversationId(SUCCESS_RESULT)).toBe(
        'AG_20180223_0000493344ae97d86f75',
      )
      expect(getTransactionStatusAmount(SUCCESS_RESULT)).toBe(300)
      expect(getTransactionStatusReceiptNo(SUCCESS_RESULT)).toBe('MBN31H462N')
      expect(getTransactionStatusStatus(SUCCESS_RESULT)).toBe('Completed')
      expect(getTransactionStatusDebitPartyName(SUCCESS_RESULT)).toBe('600310 Safaricom333')
    }
  })

  it('failure handler can safely extract error fields', () => {
    if (isTransactionStatusFailure(FAILURE_RESULT)) {
      expect(getTransactionStatusResultDesc(FAILURE_RESULT)).toBe(
        'The initiator information is invalid.',
      )
      expect(getTransactionStatusAmount(FAILURE_RESULT)).toBeNull()
      expect(getTransactionStatusReceiptNo(FAILURE_RESULT)).toBeNull()
      expect(getTransactionStatusStatus(FAILURE_RESULT)).toBeNull()
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 18. SANDBOX vs PRODUCTION URLS
// ═══════════════════════════════════════════════════════════════════════════════

describe('queryTransactionStatus() — sandbox vs production environment', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('uses the sandbox base URL when configured with sandbox', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    const [url] = mockHttpRequest.mock.calls[0] as [string]
    expect(url.startsWith(SANDBOX_URL)).toBe(true)
  })

  it('uses the production base URL when configured with production', async () => {
    await queryTransactionStatus(
      PROD_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    const [url] = mockHttpRequest.mock.calls[0] as [string]
    expect(url.startsWith(PROD_URL)).toBe(true)
  })

  it('sandbox and production use different URLs', async () => {
    await queryTransactionStatus(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    const [sandboxUrl] = mockHttpRequest.mock.calls[0] as [string]
    mockHttpRequest.mockClear()

    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await queryTransactionStatus(
      PROD_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST_TX_ID,
    )
    const [prodUrl] = mockHttpRequest.mock.calls[0] as [string]

    expect(sandboxUrl).not.toBe(prodUrl)
  })
})
