/**
 * __tests__/b2c-disbursement.test.ts
 *
 * Complete test suite for the B2C Disbursement module.
 * Covers: BusinessPayment, SalaryPayment, PromotionPayment
 * Endpoint: POST /mpesa/b2c/v3/paymentrequest
 *
 * Run: pnpm test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/utils/http', () => ({ httpRequest: vi.fn() }))

import { httpRequest } from '../src/utils/http'
import { initiateB2CDisbursement } from '../src/mpesa/b2c-disbursement/payment'
import {
  getB2CDisbursementAmount,
  getB2CDisbursementCompletedTime,
  getB2CDisbursementConversationId,
  getB2CDisbursementOriginatorConversationId,
  getB2CDisbursementReceiptNumber,
  getB2CDisbursementReceiverName,
  getB2CDisbursementResultCode,
  getB2CDisbursementResultDesc,
  getB2CDisbursementResultParam,
  getB2CDisbursementTransactionId,
  getB2CDisbursementUtilityBalance,
  getB2CDisbursementWorkingBalance,
  isB2CDisbursementFailure,
  isB2CDisbursementRecipientRegistered,
  isB2CDisbursementResult,
  isB2CDisbursementSuccess,
  isKnownB2CDisbursementResultCode,
} from '../src/mpesa/b2c-disbursement/webhooks'
import { B2C_DISBURSEMENT_RESULT_CODES } from '../src/mpesa/b2c-disbursement/types'
import type {
  B2CDisbursementRequest,
  B2CDisbursementResponse,
  B2CDisbursementResult,
} from '../src/mpesa/b2c-disbursement/types'

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const ACCESS_TOKEN = 'test-bearer-token-b2c-disbursement'
const SECURITY_CREDENTIAL = 'EncryptedPassword=='
const INITIATOR_NAME = 'testapi'

const BASE_REQUEST: B2CDisbursementRequest = {
  originatorConversationId: '600997_Test_32et3241ed8yu',
  commandId: 'BusinessPayment',
  amount: 10,
  partyA: '600992',
  partyB: '254705912645',
  remarks: 'Payment',
  queueTimeOutUrl: 'https://mydomain.com/timeout',
  resultUrl: 'https://mydomain.com/result',
}

const INITIATE_RESPONSE: B2CDisbursementResponse = {
  ConversationID: 'AG_20240706_20106e9209f64bebd05b',
  OriginatorConversationID: '600997_Test_32et3241ed8yu',
  ResponseCode: '0',
  ResponseDescription: 'Accept the service request successfully.',
}

// Success result (from Daraja docs - flat Result structure)
const SUCCESS_RESULT: B2CDisbursementResult = {
  Result: {
    ResultType: 0,
    ResultCode: 0,
    ResultDesc: 'The service request is processed successfully.',
    OriginatorConversationID: '53e3-4ba8-815c-ac45c57a3db0',
    ConversationID: 'AG_20240706_2010759fd5662ef6d054',
    TransactionID: 'SG632NMUAB',
    ResultParameters: {
      ResultParameter: [
        { Key: 'TransactionAmount', Value: 10 },
        { Key: 'TransactionReceipt', Value: 'SG632NMUAB' },
        { Key: 'ReceiverPartyPublicName', Value: '254705912645 - John Doe' },
        { Key: 'TransactionCompletedDateTime', Value: '19.07.2024 12:00:00' },
        { Key: 'B2CUtilityAccountAvailableFunds', Value: 9000 },
        { Key: 'B2CWorkingAccountAvailableFunds', Value: 900000 },
        { Key: 'B2CRecipientIsRegisteredCustomer', Value: 'Y' },
        { Key: 'B2CChargesPaidAccountAvailableFunds', Value: 0 },
      ],
    },
  },
}

const FAILURE_RESULT: B2CDisbursementResult = {
  Result: {
    ResultType: 0,
    ResultCode: 2001,
    ResultDesc: 'The initiator information is invalid.',
    OriginatorConversationID: '53e3-4ba8-815c-ac45c57a3db0',
    ConversationID: 'AG_20240706_2010759fd5662ef6d054',
    TransactionID: 'OAK0000000',
  },
}

const FAILURE_NO_PARAMS: B2CDisbursementResult = {
  Result: {
    ResultType: 0,
    ResultCode: 1,
    ResultDesc: 'Insufficient funds in the utility account.',
    OriginatorConversationID: 'ORG-001',
    ConversationID: 'CONV-001',
    TransactionID: 'OAK0000001',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. B2C_DISBURSEMENT_RESULT_CODES
// ═══════════════════════════════════════════════════════════════════════════════

describe('B2C_DISBURSEMENT_RESULT_CODES (documented by Daraja)', () => {
  it('SUCCESS is 0', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.SUCCESS).toBe(0)
    expect(typeof B2C_DISBURSEMENT_RESULT_CODES.SUCCESS).toBe('number')
  })

  it('INSUFFICIENT_BALANCE is 1', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.INSUFFICIENT_BALANCE).toBe(1)
  })

  it('AMOUNT_TOO_SMALL is 2', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.AMOUNT_TOO_SMALL).toBe(2)
  })

  it('AMOUNT_TOO_LARGE is 3', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.AMOUNT_TOO_LARGE).toBe(3)
  })

  it('DAILY_LIMIT_EXCEEDED is 4', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.DAILY_LIMIT_EXCEEDED).toBe(4)
  })

  it('MAX_BALANCE_EXCEEDED is 8', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.MAX_BALANCE_EXCEEDED).toBe(8)
  })

  it('DEBIT_PARTY_INVALID is 11', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.DEBIT_PARTY_INVALID).toBe(11)
  })

  it('INITIATOR_NOT_ALLOWED is 21', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.INITIATOR_NOT_ALLOWED).toBe(21)
  })

  it('INVALID_INITIATOR_INFO is 2001', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.INVALID_INITIATOR_INFO).toBe(2001)
  })

  it('ACCOUNT_INACTIVE is 2006', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.ACCOUNT_INACTIVE).toBe(2006)
  })

  it('PRODUCT_NOT_PERMITTED is 2028', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.PRODUCT_NOT_PERMITTED).toBe(2028)
  })

  it('CUSTOMER_NOT_REGISTERED is 2040', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.CUSTOMER_NOT_REGISTERED).toBe(2040)
  })

  it('SECURITY_CREDENTIAL_LOCKED is 8006', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.SECURITY_CREDENTIAL_LOCKED).toBe(8006)
  })

  it('OPERATOR_DOES_NOT_EXIST is "SFC_IC0003" (string — only non-numeric code)', () => {
    expect(B2C_DISBURSEMENT_RESULT_CODES.OPERATOR_DOES_NOT_EXIST).toBe('SFC_IC0003')
    expect(typeof B2C_DISBURSEMENT_RESULT_CODES.OPERATOR_DOES_NOT_EXIST).toBe('string')
  })

  it('contains exactly 14 documented result codes', () => {
    expect(Object.keys(B2C_DISBURSEMENT_RESULT_CODES)).toHaveLength(14)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. isKnownB2CDisbursementResultCode()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isKnownB2CDisbursementResultCode()', () => {
  it('returns true for 0 (success)', () => {
    expect(isKnownB2CDisbursementResultCode(0)).toBe(true)
  })

  it('returns true for 1 (insufficient balance)', () => {
    expect(isKnownB2CDisbursementResultCode(1)).toBe(true)
  })

  it('returns true for 2', () => {
    expect(isKnownB2CDisbursementResultCode(2)).toBe(true)
  })

  it('returns true for 3', () => {
    expect(isKnownB2CDisbursementResultCode(3)).toBe(true)
  })

  it('returns true for 4', () => {
    expect(isKnownB2CDisbursementResultCode(4)).toBe(true)
  })

  it('returns true for 8', () => {
    expect(isKnownB2CDisbursementResultCode(8)).toBe(true)
  })

  it('returns true for 11', () => {
    expect(isKnownB2CDisbursementResultCode(11)).toBe(true)
  })

  it('returns true for 21', () => {
    expect(isKnownB2CDisbursementResultCode(21)).toBe(true)
  })

  it('returns true for 2001', () => {
    expect(isKnownB2CDisbursementResultCode(2001)).toBe(true)
  })

  it('returns true for 2006', () => {
    expect(isKnownB2CDisbursementResultCode(2006)).toBe(true)
  })

  it('returns true for 2028', () => {
    expect(isKnownB2CDisbursementResultCode(2028)).toBe(true)
  })

  it('returns true for 2040', () => {
    expect(isKnownB2CDisbursementResultCode(2040)).toBe(true)
  })

  it('returns true for 8006', () => {
    expect(isKnownB2CDisbursementResultCode(8006)).toBe(true)
  })

  it('returns true for "SFC_IC0003" (the only string result code)', () => {
    expect(isKnownB2CDisbursementResultCode('SFC_IC0003')).toBe(true)
  })

  it('returns true for "0" (string variant)', () => {
    expect(isKnownB2CDisbursementResultCode('0')).toBe(true)
  })

  it('returns true for "2001" (string variant)', () => {
    expect(isKnownB2CDisbursementResultCode('2001')).toBe(true)
  })

  it('returns false for an undocumented code', () => {
    expect(isKnownB2CDisbursementResultCode(9999)).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isKnownB2CDisbursementResultCode('')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isKnownB2CDisbursementResultCode(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isKnownB2CDisbursementResultCode(undefined)).toBe(false)
  })

  it('returns false for a negative number', () => {
    expect(isKnownB2CDisbursementResultCode(-1)).toBe(false)
  })

  it('returns false for an arbitrary string', () => {
    expect(isKnownB2CDisbursementResultCode('UNKNOWN_CODE')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. initiateB2CDisbursement() — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2CDisbursement() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('returns the Daraja acknowledgement on success', async () => {
    const result = await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(result).toStrictEqual(INITIATE_RESPONSE)
  })

  it('calls the correct Daraja B2C endpoint', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${SANDBOX_URL}/mpesa/b2c/v3/paymentrequest`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses the production endpoint URL', async () => {
    await initiateB2CDisbursement(
      PROD_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(mockHttpRequest).toHaveBeenCalledWith(
      `${PROD_URL}/mpesa/b2c/v3/paymentrequest`,
      expect.any(Object),
    )
  })

  it('sends Authorization header with Bearer token', async () => {
    await initiateB2CDisbursement(
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
// 4. initiateB2CDisbursement() — REQUEST BODY SHAPE
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2CDisbursement() — request body shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  function getBody(): Record<string, unknown> {
    const call = mockHttpRequest.mock.calls[0]
    return (call?.[1] as { body: Record<string, unknown> }).body
  }

  it('sends OriginatorConversationID as provided', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['OriginatorConversationID']).toBe('600997_Test_32et3241ed8yu')
  })

  it('sends InitiatorName (not Initiator) as the operator username', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['InitiatorName']).toBe('testapi')
    expect(getBody()).not.toHaveProperty('Initiator')
  })

  it('sends SecurityCredential as provided', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['SecurityCredential']).toBe(SECURITY_CREDENTIAL)
  })

  it('sends CommandID as provided', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['CommandID']).toBe('BusinessPayment')
  })

  it('sends Amount as a number (not a string)', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['Amount']).toBe('number')
    expect(getBody()['Amount']).toBe(10)
  })

  it('rounds fractional amounts (e.g. 10.7 → 11)', async () => {
    await initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      amount: 10.7,
    })
    expect(getBody()['Amount']).toBe(11)
  })

  it('sends PartyA as a string', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['PartyA']).toBe('string')
    expect(getBody()['PartyA']).toBe('600992')
  })

  it('sends PartyB as a string', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof getBody()['PartyB']).toBe('string')
    expect(getBody()['PartyB']).toBe('254705912645')
  })

  it('sends Remarks exactly as provided', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['Remarks']).toBe('Payment')
  })

  it('sends QueueTimeOutURL exactly as provided', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['QueueTimeOutURL']).toBe('https://mydomain.com/timeout')
  })

  it('sends ResultURL exactly as provided', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(getBody()['ResultURL']).toBe('https://mydomain.com/result')
  })

  it('does NOT send SenderIdentifierType or RecieverIdentifierType (not in this API)', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    const body = getBody()
    expect(body).not.toHaveProperty('SenderIdentifierType')
    expect(body).not.toHaveProperty('RecieverIdentifierType')
  })

  it('sends 10 fields when Occassion is not provided', async () => {
    await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(Object.keys(getBody())).toHaveLength(10)
    expect(getBody()).not.toHaveProperty('Occassion')
  })

  it('sends 11 fields when Occassion is provided (note Daraja typo: Occassion)', async () => {
    await initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      occasion: 'ChristmasPay',
    })
    const body = getBody()
    expect(Object.keys(body)).toHaveLength(11)
    expect(body['Occassion']).toBe('ChristmasPay')
  })

  it('omits Occassion when it is an empty string', async () => {
    await initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      occasion: '',
    })
    expect(getBody()).not.toHaveProperty('Occassion')
  })

  it('omits Occassion when it is whitespace only', async () => {
    await initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      occasion: '   ',
    })
    expect(getBody()).not.toHaveProperty('Occassion')
  })

  it('accepts SalaryPayment as CommandID', async () => {
    await initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      commandId: 'SalaryPayment',
    })
    expect(getBody()['CommandID']).toBe('SalaryPayment')
  })

  it('accepts PromotionPayment as CommandID', async () => {
    await initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      commandId: 'PromotionPayment',
    })
    expect(getBody()['CommandID']).toBe('PromotionPayment')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. initiateB2CDisbursement() — VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2CDisbursement() — CommandID validation', () => {
  it('throws VALIDATION_ERROR for an invalid commandId', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        commandId: 'BusinessPayToBulk' as never,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('error message lists the valid commandIds', async () => {
    const error = await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      { ...BASE_REQUEST, commandId: 'UnknownCommand' as never },
    ).catch((e: unknown) => e as { message: string })
    expect(error.message).toContain('BusinessPayment')
    expect(error.message).toContain('SalaryPayment')
    expect(error.message).toContain('PromotionPayment')
  })

  it('does not call httpRequest when commandId is invalid', async () => {
    await initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      commandId: 'BadCommand' as never,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('initiateB2CDisbursement() — amount validation', () => {
  it('throws VALIDATION_ERROR for amount below minimum (< 10)', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 9,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount 0', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for negative amount', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: -100,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR for amount that rounds below 10', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 9.4,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('accepts amount 10 (minimum per Daraja docs)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 10,
      }),
    ).resolves.toBeDefined()
  })

  it('accepts 9.6 which rounds to 10 (meets minimum)', async () => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        amount: 9.6,
      }),
    ).resolves.toBeDefined()
  })

  it('does not call httpRequest when amount validation fails', async () => {
    await initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      amount: 0,
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

describe('initiateB2CDisbursement() — required field validation', () => {
  it('throws VALIDATION_ERROR when originatorConversationId is empty', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        originatorConversationId: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when partyA is empty', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyA: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when partyB is empty', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        partyB: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when remarks is empty', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        remarks: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when resultUrl is empty', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        resultUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws VALIDATION_ERROR when queueTimeOutUrl is empty', async () => {
    await expect(
      initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
        ...BASE_REQUEST,
        queueTimeOutUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('does not call httpRequest when required field validation fails', async () => {
    await initiateB2CDisbursement(SANDBOX_URL, ACCESS_TOKEN, SECURITY_CREDENTIAL, INITIATOR_NAME, {
      ...BASE_REQUEST,
      partyA: '',
    }).catch(() => {})
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. initiateB2CDisbursement() — RESPONSE FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2CDisbursement() — response fields (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: INITIATE_RESPONSE } as never)
  })

  it('response includes ConversationID', async () => {
    const res = await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ConversationID).toBe('string')
    expect(res.ConversationID.length).toBeGreaterThan(0)
  })

  it('response includes OriginatorConversationID', async () => {
    const res = await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.OriginatorConversationID).toBe('string')
  })

  it('response includes ResponseCode', async () => {
    const res = await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(typeof res.ResponseCode).toBe('string')
  })

  it('ResponseCode "0" indicates acceptance', async () => {
    const res = await initiateB2CDisbursement(
      SANDBOX_URL,
      ACCESS_TOKEN,
      SECURITY_CREDENTIAL,
      INITIATOR_NAME,
      BASE_REQUEST,
    )
    expect(res.ResponseCode).toBe('0')
  })

  it('response matches exact Daraja documented payload', async () => {
    const res = await initiateB2CDisbursement(
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
// 7. initiateB2CDisbursement() — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('initiateB2CDisbursement() — error propagation', () => {
  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      initiateB2CDisbursement(
        SANDBOX_URL,
        ACCESS_TOKEN,
        SECURITY_CREDENTIAL,
        INITIATOR_NAME,
        BASE_REQUEST,
      ),
    ).rejects.toThrow('ECONNRESET')
  })

  it('propagates a network timeout Error', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(
      initiateB2CDisbursement(
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
// 8. isB2CDisbursementResult()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2CDisbursementResult() — runtime type guard', () => {
  it('returns true for a valid success result', () => {
    expect(isB2CDisbursementResult(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true for a valid failure result', () => {
    expect(isB2CDisbursementResult(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for a failure result with no ResultParameters', () => {
    expect(isB2CDisbursementResult(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isB2CDisbursementResult(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isB2CDisbursementResult(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isB2CDisbursementResult({})).toBe(false)
  })

  it('returns false when Result is missing', () => {
    expect(isB2CDisbursementResult({ data: 'something' })).toBe(false)
  })

  it('returns false when ResultCode is missing from Result', () => {
    expect(
      isB2CDisbursementResult({ Result: { ConversationID: 'x', OriginatorConversationID: 'y' } }),
    ).toBe(false)
  })

  it('returns false when ConversationID is missing', () => {
    expect(
      isB2CDisbursementResult({ Result: { ResultCode: 0, OriginatorConversationID: 'y' } }),
    ).toBe(false)
  })

  it('returns false when OriginatorConversationID is missing', () => {
    expect(isB2CDisbursementResult({ Result: { ResultCode: 0, ConversationID: 'x' } })).toBe(false)
  })

  it('returns false for non-object values', () => {
    expect(isB2CDisbursementResult('string')).toBe(false)
    expect(isB2CDisbursementResult(42)).toBe(false)
    expect(isB2CDisbursementResult([])).toBe(false)
    expect(isB2CDisbursementResult(true)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. isB2CDisbursementSuccess() / isB2CDisbursementFailure()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isB2CDisbursementSuccess()', () => {
  it('returns true when ResultCode is 0 (number)', () => {
    expect(isB2CDisbursementSuccess(SUCCESS_RESULT)).toBe(true)
  })

  it('returns true when ResultCode is "0" (string)', () => {
    const result: B2CDisbursementResult = {
      Result: { ...SUCCESS_RESULT.Result, ResultCode: '0' },
    }
    expect(isB2CDisbursementSuccess(result)).toBe(true)
  })

  it('returns false when ResultCode is 2001', () => {
    expect(isB2CDisbursementSuccess(FAILURE_RESULT)).toBe(false)
  })

  it('returns false when ResultCode is 1 (insufficient balance)', () => {
    expect(isB2CDisbursementSuccess(FAILURE_NO_PARAMS)).toBe(false)
  })
})

describe('isB2CDisbursementFailure()', () => {
  it('returns false for success (ResultCode 0)', () => {
    expect(isB2CDisbursementFailure(SUCCESS_RESULT)).toBe(false)
  })

  it('returns true for failure (ResultCode 2001)', () => {
    expect(isB2CDisbursementFailure(FAILURE_RESULT)).toBe(true)
  })

  it('returns true for failure (ResultCode 1)', () => {
    expect(isB2CDisbursementFailure(FAILURE_NO_PARAMS)).toBe(true)
  })

  it('isB2CDisbursementSuccess and isB2CDisbursementFailure are mutually exclusive', () => {
    expect(
      isB2CDisbursementSuccess(SUCCESS_RESULT) && isB2CDisbursementFailure(SUCCESS_RESULT),
    ).toBe(false)
    expect(
      isB2CDisbursementSuccess(FAILURE_RESULT) && isB2CDisbursementFailure(FAILURE_RESULT),
    ).toBe(false)
    expect(
      isB2CDisbursementSuccess(SUCCESS_RESULT) || isB2CDisbursementFailure(SUCCESS_RESULT),
    ).toBe(true)
    expect(
      isB2CDisbursementSuccess(FAILURE_RESULT) || isB2CDisbursementFailure(FAILURE_RESULT),
    ).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. PAYLOAD EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2CDisbursementTransactionId()', () => {
  it('returns TransactionID from success result', () => {
    expect(getB2CDisbursementTransactionId(SUCCESS_RESULT)).toBe('SG632NMUAB')
  })

  it('returns TransactionID from failure result', () => {
    expect(getB2CDisbursementTransactionId(FAILURE_RESULT)).toBe('OAK0000000')
  })
})

describe('getB2CDisbursementConversationId()', () => {
  it('returns ConversationID from success result', () => {
    expect(getB2CDisbursementConversationId(SUCCESS_RESULT)).toBe(
      'AG_20240706_2010759fd5662ef6d054',
    )
  })

  it('returns ConversationID from failure result', () => {
    expect(getB2CDisbursementConversationId(FAILURE_RESULT)).toBe(
      'AG_20240706_2010759fd5662ef6d054',
    )
  })
})

describe('getB2CDisbursementOriginatorConversationId()', () => {
  it('returns OriginatorConversationID from success result', () => {
    expect(getB2CDisbursementOriginatorConversationId(SUCCESS_RESULT)).toBe(
      '53e3-4ba8-815c-ac45c57a3db0',
    )
  })
})

describe('getB2CDisbursementResultDesc()', () => {
  it('returns ResultDesc from success result', () => {
    expect(getB2CDisbursementResultDesc(SUCCESS_RESULT)).toBe(
      'The service request is processed successfully.',
    )
  })

  it('returns ResultDesc from failure result', () => {
    expect(getB2CDisbursementResultDesc(FAILURE_RESULT)).toBe(
      'The initiator information is invalid.',
    )
  })
})

describe('getB2CDisbursementResultCode()', () => {
  it('returns 0 for success result', () => {
    expect(getB2CDisbursementResultCode(SUCCESS_RESULT)).toBe(0)
  })

  it('returns 2001 for failure result', () => {
    expect(getB2CDisbursementResultCode(FAILURE_RESULT)).toBe(2001)
  })
})

describe('getB2CDisbursementAmount()', () => {
  it('returns TransactionAmount as a number from success result', () => {
    expect(getB2CDisbursementAmount(SUCCESS_RESULT)).toBe(10)
    expect(typeof getB2CDisbursementAmount(SUCCESS_RESULT)).toBe('number')
  })

  it('returns null when ResultParameters is absent', () => {
    expect(getB2CDisbursementAmount(FAILURE_RESULT)).toBeNull()
  })

  it('returns null when ResultParameters is absent (no params)', () => {
    expect(getB2CDisbursementAmount(FAILURE_NO_PARAMS)).toBeNull()
  })
})

describe('getB2CDisbursementReceiptNumber()', () => {
  it('returns TransactionReceipt from success result', () => {
    expect(getB2CDisbursementReceiptNumber(SUCCESS_RESULT)).toBe('SG632NMUAB')
  })

  it('returns null when absent', () => {
    expect(getB2CDisbursementReceiptNumber(FAILURE_RESULT)).toBeNull()
  })
})

describe('getB2CDisbursementReceiverName()', () => {
  it('returns ReceiverPartyPublicName from success result', () => {
    expect(getB2CDisbursementReceiverName(SUCCESS_RESULT)).toBe('254705912645 - John Doe')
  })

  it('returns null when absent', () => {
    expect(getB2CDisbursementReceiverName(FAILURE_RESULT)).toBeNull()
  })
})

describe('getB2CDisbursementCompletedTime()', () => {
  it('returns TransactionCompletedDateTime from success result', () => {
    expect(getB2CDisbursementCompletedTime(SUCCESS_RESULT)).toBe('19.07.2024 12:00:00')
  })

  it('returns null when absent', () => {
    expect(getB2CDisbursementCompletedTime(FAILURE_RESULT)).toBeNull()
  })
})

describe('getB2CDisbursementUtilityBalance()', () => {
  it('returns B2CUtilityAccountAvailableFunds from success result', () => {
    expect(getB2CDisbursementUtilityBalance(SUCCESS_RESULT)).toBe(9000)
  })

  it('returns null when absent', () => {
    expect(getB2CDisbursementUtilityBalance(FAILURE_RESULT)).toBeNull()
  })
})

describe('getB2CDisbursementWorkingBalance()', () => {
  it('returns B2CWorkingAccountAvailableFunds from success result', () => {
    expect(getB2CDisbursementWorkingBalance(SUCCESS_RESULT)).toBe(900000)
  })

  it('returns null when absent', () => {
    expect(getB2CDisbursementWorkingBalance(FAILURE_RESULT)).toBeNull()
  })
})

describe('isB2CDisbursementRecipientRegistered()', () => {
  it('returns true when B2CRecipientIsRegisteredCustomer is "Y"', () => {
    expect(isB2CDisbursementRecipientRegistered(SUCCESS_RESULT)).toBe(true)
  })

  it('returns false when value is "N"', () => {
    const result: B2CDisbursementResult = {
      Result: {
        ...SUCCESS_RESULT.Result,
        ResultParameters: {
          ResultParameter: [{ Key: 'B2CRecipientIsRegisteredCustomer', Value: 'N' }],
        },
      },
    }
    expect(isB2CDisbursementRecipientRegistered(result)).toBe(false)
  })

  it('returns null when ResultParameters is absent', () => {
    expect(isB2CDisbursementRecipientRegistered(FAILURE_RESULT)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. getB2CDisbursementResultParam() — internal helper
// ═══════════════════════════════════════════════════════════════════════════════

describe('getB2CDisbursementResultParam()', () => {
  it('extracts a value from an array of ResultParameters', () => {
    expect(getB2CDisbursementResultParam(SUCCESS_RESULT, 'TransactionAmount')).toBe(10)
  })

  it('returns undefined for a key not present', () => {
    expect(getB2CDisbursementResultParam(SUCCESS_RESULT, 'NonExistent')).toBeUndefined()
  })

  it('returns undefined when ResultParameters is absent', () => {
    expect(getB2CDisbursementResultParam(FAILURE_RESULT, 'TransactionAmount')).toBeUndefined()
  })

  it('extracts all documented result parameter keys', () => {
    expect(getB2CDisbursementResultParam(SUCCESS_RESULT, 'TransactionAmount')).toBe(10)
    expect(getB2CDisbursementResultParam(SUCCESS_RESULT, 'TransactionReceipt')).toBe('SG632NMUAB')
    expect(getB2CDisbursementResultParam(SUCCESS_RESULT, 'ReceiverPartyPublicName')).toBe(
      '254705912645 - John Doe',
    )
    expect(getB2CDisbursementResultParam(SUCCESS_RESULT, 'TransactionCompletedDateTime')).toBe(
      '19.07.2024 12:00:00',
    )
    expect(getB2CDisbursementResultParam(SUCCESS_RESULT, 'B2CUtilityAccountAvailableFunds')).toBe(
      9000,
    )
    expect(getB2CDisbursementResultParam(SUCCESS_RESULT, 'B2CWorkingAccountAvailableFunds')).toBe(
      900000,
    )
    expect(getB2CDisbursementResultParam(SUCCESS_RESULT, 'B2CRecipientIsRegisteredCustomer')).toBe(
      'Y',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. RESULT PAYLOAD STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Success result payload structure (Daraja spec)', () => {
  it('has ResultCode 0 (number)', () => {
    expect(SUCCESS_RESULT.Result.ResultCode).toBe(0)
    expect(typeof SUCCESS_RESULT.Result.ResultCode).toBe('number')
  })

  it('has ResultDesc as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.ResultDesc).toBe('string')
    expect(SUCCESS_RESULT.Result.ResultDesc.length).toBeGreaterThan(0)
  })

  it('has TransactionID as a non-empty string', () => {
    expect(typeof SUCCESS_RESULT.Result.TransactionID).toBe('string')
    expect(SUCCESS_RESULT.Result.TransactionID.length).toBeGreaterThan(0)
  })

  it('has ResultParameters with a ResultParameter array', () => {
    expect(SUCCESS_RESULT.Result.ResultParameters).toBeDefined()
    expect(Array.isArray(SUCCESS_RESULT.Result.ResultParameters?.ResultParameter)).toBe(true)
  })

  it('ResultParameters contains TransactionAmount', () => {
    const params = SUCCESS_RESULT.Result.ResultParameters?.ResultParameter as Array<{
      Key: string
      Value: unknown
    }>
    expect(params.some((p) => p.Key === 'TransactionAmount')).toBe(true)
  })
})

describe('Failed result payload structure (Daraja spec)', () => {
  it('has non-zero ResultCode', () => {
    expect(FAILURE_RESULT.Result.ResultCode).not.toBe(0)
  })

  it('may not have ResultParameters on failure', () => {
    expect(FAILURE_RESULT.Result.ResultParameters).toBeUndefined()
  })

  it('isKnownB2CDisbursementResultCode returns true for failure code 2001', () => {
    expect(isKnownB2CDisbursementResultCode(FAILURE_RESULT.Result.ResultCode)).toBe(true)
  })

  it('isKnownB2CDisbursementResultCode returns true for failure code 1', () => {
    expect(isKnownB2CDisbursementResultCode(FAILURE_NO_PARAMS.Result.ResultCode)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. DISCRIMINATED DISPATCH PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Discriminated dispatch pattern', () => {
  function handleResult(result: B2CDisbursementResult): string {
    if (isB2CDisbursementSuccess(result)) return 'success'
    if (isB2CDisbursementFailure(result)) return 'failure'
    return 'unknown'
  }

  it('routes success result (ResultCode 0) to success branch', () => {
    expect(handleResult(SUCCESS_RESULT)).toBe('success')
  })

  it('routes failure result (ResultCode 2001) to failure branch', () => {
    expect(handleResult(FAILURE_RESULT)).toBe('failure')
  })

  it('routes failure result (ResultCode 1) to failure branch', () => {
    expect(handleResult(FAILURE_NO_PARAMS)).toBe('failure')
  })

  it('success handler can safely extract all fields', () => {
    if (isB2CDisbursementSuccess(SUCCESS_RESULT)) {
      expect(getB2CDisbursementTransactionId(SUCCESS_RESULT)).toBe('SG632NMUAB')
      expect(getB2CDisbursementAmount(SUCCESS_RESULT)).toBe(10)
      expect(getB2CDisbursementReceiptNumber(SUCCESS_RESULT)).toBe('SG632NMUAB')
      expect(isB2CDisbursementRecipientRegistered(SUCCESS_RESULT)).toBe(true)
    }
  })

  it('failure handler can safely extract error fields', () => {
    if (isB2CDisbursementFailure(FAILURE_RESULT)) {
      expect(getB2CDisbursementResultDesc(FAILURE_RESULT)).toBe(
        'The initiator information is invalid.',
      )
      expect(getB2CDisbursementAmount(FAILURE_RESULT)).toBeNull()
      expect(getB2CDisbursementReceiptNumber(FAILURE_RESULT)).toBeNull()
    }
  })
})
