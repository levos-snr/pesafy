/**
 * __tests__/webhooks.test.ts
 *
 * Complete test suite for src/mpesa/webhooks/:
 *
 *   signature-verifier.ts
 *   - SAFARICOM_IPS             — official IP whitelist
 *   - verifyWebhookIP()         — IP allowlist check
 *   - parseStkPushWebhook()     — payload parser / shape guard
 *
 *   webhook-handler.ts
 *   - handleWebhook()           — main dispatcher
 *   - isSuccessfulCallback()    — ResultCode === 0 guard
 *   - extractTransactionId()    — MpesaReceiptNumber extractor
 *   - extractAmount()           — Amount extractor
 *   - extractPhoneNumber()      — PhoneNumber extractor
 *
 *   retry.ts
 *   - retryWithBackoff()        — exponential back-off helper
 *
 * Run: pnpm test
 */

import { describe, expect, it, vi } from 'vitest'

import {
  SAFARICOM_IPS,
  verifyWebhookIP,
  parseStkPushWebhook,
} from '../src/mpesa/webhooks/signature-verifier'

import {
  handleWebhook,
  isSuccessfulCallback,
  extractTransactionId,
  extractAmount,
  extractPhoneNumber,
} from '../src/mpesa/webhooks/webhook-handler'

import { retryWithBackoff } from '../src/mpesa/webhooks/retry'

import type { StkPushWebhook } from '../src/mpesa/webhooks/types'
import type {
  WebhookHandlerOptions,
  WebhookHandlerResult,
} from '../src/mpesa/webhooks/webhook-handler'

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SAFE_IP = '196.201.214.200'
const UNSAFE_IP = '1.2.3.4'

const SUCCESS_WEBHOOK: StkPushWebhook = {
  Body: {
    stkCallback: {
      MerchantRequestID: '29115-34620561-1',
      CheckoutRequestID: 'ws_CO_191220191020363925',
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      CallbackMetadata: {
        Item: [
          { Name: 'Amount', Value: 1.0 },
          { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
          { Name: 'TransactionDate', Value: 20191219102115 },
          { Name: 'PhoneNumber', Value: 254708374149 },
        ],
      },
    },
  },
}

const FAILURE_WEBHOOK: StkPushWebhook = {
  Body: {
    stkCallback: {
      MerchantRequestID: '29115-34620561-2',
      CheckoutRequestID: 'ws_CO_191220191020363926',
      ResultCode: 1032,
      ResultDesc: 'Request cancelled by user.',
    },
  },
}

const INSUFFICIENT_BALANCE_WEBHOOK: StkPushWebhook = {
  Body: {
    stkCallback: {
      MerchantRequestID: '29115-34620561-3',
      CheckoutRequestID: 'ws_CO_191220191020363927',
      ResultCode: 1,
      ResultDesc: 'The balance is insufficient for the transaction.',
    },
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SAFARICOM_IPS — official whitelist
// ═══════════════════════════════════════════════════════════════════════════════

describe('SAFARICOM_IPS — official IP whitelist', () => {
  it('is a non-empty readonly array', () => {
    expect(Array.isArray(SAFARICOM_IPS)).toBe(true)
    expect(SAFARICOM_IPS.length).toBeGreaterThan(0)
  })

  it('contains exactly 12 documented IPs', () => {
    expect(SAFARICOM_IPS).toHaveLength(12)
  })

  it('contains 196.201.214.200', () => expect(SAFARICOM_IPS).toContain('196.201.214.200'))
  it('contains 196.201.214.206', () => expect(SAFARICOM_IPS).toContain('196.201.214.206'))
  it('contains 196.201.213.114', () => expect(SAFARICOM_IPS).toContain('196.201.213.114'))
  it('contains 196.201.214.207', () => expect(SAFARICOM_IPS).toContain('196.201.214.207'))
  it('contains 196.201.214.208', () => expect(SAFARICOM_IPS).toContain('196.201.214.208'))
  it('contains 196.201.213.44', () => expect(SAFARICOM_IPS).toContain('196.201.213.44'))
  it('contains 196.201.212.127', () => expect(SAFARICOM_IPS).toContain('196.201.212.127'))
  it('contains 196.201.212.138', () => expect(SAFARICOM_IPS).toContain('196.201.212.138'))
  it('contains 196.201.212.129', () => expect(SAFARICOM_IPS).toContain('196.201.212.129'))
  it('contains 196.201.212.136', () => expect(SAFARICOM_IPS).toContain('196.201.212.136'))
  it('contains 196.201.212.74', () => expect(SAFARICOM_IPS).toContain('196.201.212.74'))
  it('contains 196.201.212.69', () => expect(SAFARICOM_IPS).toContain('196.201.212.69'))

  it('all IPs are non-empty strings', () => {
    for (const ip of SAFARICOM_IPS) {
      expect(typeof ip).toBe('string')
      expect(ip.length).toBeGreaterThan(0)
    }
  })

  it('all IPs match IPv4 format', () => {
    const ipv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
    for (const ip of SAFARICOM_IPS) {
      expect(ipv4.test(ip)).toBe(true)
    }
  })

  it('has no duplicate entries', () => {
    const unique = new Set(SAFARICOM_IPS)
    expect(unique.size).toBe(SAFARICOM_IPS.length)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. verifyWebhookIP()
// ═══════════════════════════════════════════════════════════════════════════════

describe('verifyWebhookIP()', () => {
  it('returns true for a whitelisted Safaricom IP', () => {
    expect(verifyWebhookIP(SAFE_IP)).toBe(true)
  })

  it('returns true for all 12 whitelisted IPs', () => {
    for (const ip of SAFARICOM_IPS) {
      expect(verifyWebhookIP(ip)).toBe(true)
    }
  })

  it('returns false for an unknown IP', () => {
    expect(verifyWebhookIP(UNSAFE_IP)).toBe(false)
  })

  it('returns false for localhost (127.0.0.1)', () => {
    expect(verifyWebhookIP('127.0.0.1')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(verifyWebhookIP('')).toBe(false)
  })

  it('returns false for a private IP (192.168.x.x)', () => {
    expect(verifyWebhookIP('192.168.1.1')).toBe(false)
  })

  it('returns false for a private IP (10.x.x.x)', () => {
    expect(verifyWebhookIP('10.0.0.1')).toBe(false)
  })

  it('accepts a custom allowedIPs list — returns true when IP is in it', () => {
    expect(verifyWebhookIP('10.0.0.1', ['10.0.0.1', '10.0.0.2'])).toBe(true)
  })

  it('accepts a custom allowedIPs list — returns false when IP is not in it', () => {
    expect(verifyWebhookIP(SAFE_IP, ['10.0.0.1'])).toBe(false)
  })

  it('returns false when custom allowedIPs list is empty', () => {
    expect(verifyWebhookIP(SAFE_IP, [])).toBe(false)
  })

  it('is case-sensitive — trailing space is not in the list', () => {
    expect(verifyWebhookIP('196.201.214.200')).toBe(true)
    expect(verifyWebhookIP('196.201.214.200 ')).toBe(false)
  })

  it('does not match partial IP strings', () => {
    expect(verifyWebhookIP('196.201.214')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. parseStkPushWebhook()
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseStkPushWebhook()', () => {
  it('returns the typed payload for a valid success webhook', () => {
    const result = parseStkPushWebhook(SUCCESS_WEBHOOK)
    expect(result).not.toBeNull()
    expect(result?.Body.stkCallback.ResultCode).toBe(0)
  })

  it('returns the typed payload for a valid failure webhook', () => {
    const result = parseStkPushWebhook(FAILURE_WEBHOOK)
    expect(result).not.toBeNull()
    expect(result?.Body.stkCallback.ResultCode).toBe(1032)
  })

  it('returns null for null input', () => {
    expect(parseStkPushWebhook(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(parseStkPushWebhook(undefined)).toBeNull()
  })

  it('returns null for an empty object', () => {
    expect(parseStkPushWebhook({})).toBeNull()
  })

  it('returns null when Body is missing', () => {
    expect(parseStkPushWebhook({ stkCallback: {} })).toBeNull()
  })

  it('returns null when stkCallback is missing from Body', () => {
    expect(parseStkPushWebhook({ Body: {} })).toBeNull()
  })

  it('returns null for a plain string', () => {
    expect(parseStkPushWebhook('not a webhook')).toBeNull()
  })

  it('returns null for a number', () => {
    expect(parseStkPushWebhook(42)).toBeNull()
  })

  it('returns null for an array', () => {
    expect(parseStkPushWebhook([])).toBeNull()
  })

  it('preserves the full webhook payload when valid', () => {
    expect(parseStkPushWebhook(SUCCESS_WEBHOOK)).toStrictEqual(SUCCESS_WEBHOOK)
  })

  it('returns a payload with CallbackMetadata for a success webhook', () => {
    const result = parseStkPushWebhook(SUCCESS_WEBHOOK)
    expect(result?.Body.stkCallback.CallbackMetadata).toBeDefined()
    expect(Array.isArray(result?.Body.stkCallback.CallbackMetadata?.Item)).toBe(true)
  })

  it('returns a payload without CallbackMetadata for a failure webhook', () => {
    const result = parseStkPushWebhook(FAILURE_WEBHOOK)
    expect(result?.Body.stkCallback.CallbackMetadata).toBeUndefined()
  })

  it('correctly parses MerchantRequestID', () => {
    expect(parseStkPushWebhook(SUCCESS_WEBHOOK)?.Body.stkCallback.MerchantRequestID).toBe(
      '29115-34620561-1',
    )
  })

  it('correctly parses CheckoutRequestID', () => {
    expect(parseStkPushWebhook(SUCCESS_WEBHOOK)?.Body.stkCallback.CheckoutRequestID).toBe(
      'ws_CO_191220191020363925',
    )
  })

  it('returns the same object reference (pass-through, no cloning)', () => {
    const result = parseStkPushWebhook(SUCCESS_WEBHOOK)
    expect(result).toBe(SUCCESS_WEBHOOK)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. isSuccessfulCallback()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isSuccessfulCallback()', () => {
  it('returns true when ResultCode is 0 (success)', () => {
    expect(isSuccessfulCallback(SUCCESS_WEBHOOK)).toBe(true)
  })

  it('returns false when ResultCode is 1032 (user cancelled)', () => {
    expect(isSuccessfulCallback(FAILURE_WEBHOOK)).toBe(false)
  })

  it('returns false when ResultCode is 1 (insufficient balance)', () => {
    expect(isSuccessfulCallback(INSUFFICIENT_BALANCE_WEBHOOK)).toBe(false)
  })

  it('returns false when ResultCode is 1037 (phone unreachable)', () => {
    const w: StkPushWebhook = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'x',
          CheckoutRequestID: 'y',
          ResultCode: 1037,
          ResultDesc: 'DS timeout user cannot be reached',
        },
      },
    }
    expect(isSuccessfulCallback(w)).toBe(false)
  })

  it('returns false when ResultCode is 2001 (invalid PIN)', () => {
    const w: StkPushWebhook = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'x',
          CheckoutRequestID: 'y',
          ResultCode: 2001,
          ResultDesc: 'The initiator information is invalid.',
        },
      },
    }
    expect(isSuccessfulCallback(w)).toBe(false)
  })

  it('ResultCode 0 is the only truthy code among documented codes', () => {
    const pass = [0]
    const fail = [1, 1032, 1037, 2001, 999, -1, 100]

    for (const code of pass) {
      const w: StkPushWebhook = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'x',
            CheckoutRequestID: 'y',
            ResultCode: code,
            ResultDesc: '',
          },
        },
      }
      expect(isSuccessfulCallback(w)).toBe(true)
    }

    for (const code of fail) {
      const w: StkPushWebhook = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'x',
            CheckoutRequestID: 'y',
            ResultCode: code,
            ResultDesc: '',
          },
        },
      }
      expect(isSuccessfulCallback(w)).toBe(false)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. extractTransactionId()
// ═══════════════════════════════════════════════════════════════════════════════

describe('extractTransactionId()', () => {
  it('returns MpesaReceiptNumber from a success webhook', () => {
    expect(extractTransactionId(SUCCESS_WEBHOOK)).toBe('NLJ7RT61SV')
  })

  it('returns null when CallbackMetadata is absent (failure webhook)', () => {
    expect(extractTransactionId(FAILURE_WEBHOOK)).toBeNull()
  })

  it('returns null when MpesaReceiptNumber item is not in metadata', () => {
    const w: StkPushWebhook = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'x',
          CheckoutRequestID: 'y',
          ResultCode: 0,
          ResultDesc: 'ok',
          CallbackMetadata: { Item: [{ Name: 'Amount', Value: 100 }] },
        },
      },
    }
    expect(extractTransactionId(w)).toBeNull()
  })

  it('returns a string value', () => {
    expect(typeof extractTransactionId(SUCCESS_WEBHOOK)).toBe('string')
  })

  it('returns the receipt as a non-empty string', () => {
    const txId = extractTransactionId(SUCCESS_WEBHOOK)
    expect((txId ?? '').length).toBeGreaterThan(0)
  })

  it('converts any non-string Value to a string', () => {
    const w: StkPushWebhook = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'x',
          CheckoutRequestID: 'y',
          ResultCode: 0,
          ResultDesc: 'ok',
          CallbackMetadata: { Item: [{ Name: 'MpesaReceiptNumber', Value: 12345 }] },
        },
      },
    }
    const result = extractTransactionId(w)
    expect(result).toBe('12345')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. extractAmount()
// ═══════════════════════════════════════════════════════════════════════════════

describe('extractAmount()', () => {
  it('returns Amount as a number from a success webhook', () => {
    expect(extractAmount(SUCCESS_WEBHOOK)).toBe(1)
    expect(typeof extractAmount(SUCCESS_WEBHOOK)).toBe('number')
  })

  it('returns null when CallbackMetadata is absent (failure webhook)', () => {
    expect(extractAmount(FAILURE_WEBHOOK)).toBeNull()
  })

  it('returns null when Amount item is not in metadata', () => {
    const w: StkPushWebhook = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'x',
          CheckoutRequestID: 'y',
          ResultCode: 0,
          ResultDesc: 'ok',
          CallbackMetadata: { Item: [{ Name: 'MpesaReceiptNumber', Value: 'ABC123' }] },
        },
      },
    }
    expect(extractAmount(w)).toBeNull()
  })

  it('correctly extracts a larger amount', () => {
    const w: StkPushWebhook = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'x',
          CheckoutRequestID: 'y',
          ResultCode: 0,
          ResultDesc: 'ok',
          CallbackMetadata: { Item: [{ Name: 'Amount', Value: 5000 }] },
        },
      },
    }
    expect(extractAmount(w)).toBe(5000)
  })

  it('returns a floating point amount when Daraja sends decimals', () => {
    const w: StkPushWebhook = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'x',
          CheckoutRequestID: 'y',
          ResultCode: 0,
          ResultDesc: 'ok',
          CallbackMetadata: { Item: [{ Name: 'Amount', Value: 1234.56 }] },
        },
      },
    }
    expect(extractAmount(w)).toBe(1234.56)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. extractPhoneNumber()
// ═══════════════════════════════════════════════════════════════════════════════

describe('extractPhoneNumber()', () => {
  it('returns PhoneNumber as a string from a success webhook', () => {
    expect(extractPhoneNumber(SUCCESS_WEBHOOK)).toBe('254708374149')
    expect(typeof extractPhoneNumber(SUCCESS_WEBHOOK)).toBe('string')
  })

  it('returns null when CallbackMetadata is absent (failure webhook)', () => {
    expect(extractPhoneNumber(FAILURE_WEBHOOK)).toBeNull()
  })

  it('returns null when PhoneNumber item is not in metadata', () => {
    const w: StkPushWebhook = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'x',
          CheckoutRequestID: 'y',
          ResultCode: 0,
          ResultDesc: 'ok',
          CallbackMetadata: { Item: [{ Name: 'Amount', Value: 100 }] },
        },
      },
    }
    expect(extractPhoneNumber(w)).toBeNull()
  })

  it('converts numeric PhoneNumber to string', () => {
    const phone = extractPhoneNumber(SUCCESS_WEBHOOK)
    expect(typeof phone).toBe('string')
    expect(phone).toBe('254708374149')
  })

  it('returns a 12-digit string for a standard Safaricom MSISDN', () => {
    const phone = extractPhoneNumber(SUCCESS_WEBHOOK)
    expect(phone?.length).toBe(12)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. handleWebhook() — IP verification
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleWebhook() — IP verification', () => {
  it('accepts a request from a whitelisted IP', () => {
    expect(handleWebhook(SUCCESS_WEBHOOK, { requestIP: SAFE_IP }).success).toBe(true)
  })

  it('rejects a request from an unknown IP', () => {
    expect(handleWebhook(SUCCESS_WEBHOOK, { requestIP: UNSAFE_IP }).success).toBe(false)
  })

  it('includes an error message containing the rejected IP', () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { requestIP: UNSAFE_IP })
    expect(typeof result.error).toBe('string')
    expect(result.error).toContain(UNSAFE_IP)
  })

  it('data is null when IP is rejected', () => {
    expect(handleWebhook(SUCCESS_WEBHOOK, { requestIP: UNSAFE_IP }).data).toBeNull()
  })

  it('eventType is null when IP is rejected', () => {
    expect(handleWebhook(SUCCESS_WEBHOOK, { requestIP: UNSAFE_IP }).eventType).toBeNull()
  })

  it('skips IP check when skipIPCheck is true', () => {
    expect(
      handleWebhook(SUCCESS_WEBHOOK, { requestIP: UNSAFE_IP, skipIPCheck: true }).success,
    ).toBe(true)
  })

  it('skips IP check when no requestIP is provided', () => {
    expect(handleWebhook(SUCCESS_WEBHOOK, {}).success).toBe(true)
  })

  it('accepts a custom allowedIPs list', () => {
    const customIP = '10.0.0.1'
    expect(
      handleWebhook(SUCCESS_WEBHOOK, { requestIP: customIP, allowedIPs: [customIP] }).success,
    ).toBe(true)
  })

  it('rejects when requestIP is not in custom allowedIPs', () => {
    expect(
      handleWebhook(SUCCESS_WEBHOOK, { requestIP: SAFE_IP, allowedIPs: ['10.0.0.1'] }).success,
    ).toBe(false)
  })

  it('rejects all Safaricom IPs when they are not in custom allowedIPs', () => {
    for (const ip of SAFARICOM_IPS) {
      const result = handleWebhook(SUCCESS_WEBHOOK, { requestIP: ip, allowedIPs: ['10.0.0.1'] })
      expect(result.success).toBe(false)
    }
  })

  it('accepts all Safaricom IPs with the default whitelist', () => {
    for (const ip of SAFARICOM_IPS) {
      const result = handleWebhook(SUCCESS_WEBHOOK, { requestIP: ip })
      expect(result.success).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. handleWebhook() — payload parsing
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleWebhook() — payload parsing', () => {
  it('returns success=true and eventType="stk_push" for a valid STK success webhook', () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { skipIPCheck: true })
    expect(result.success).toBe(true)
    expect(result.eventType).toBe('stk_push')
  })

  it('returns the parsed webhook data unchanged', () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { skipIPCheck: true })
    expect(result.data).toStrictEqual(SUCCESS_WEBHOOK)
  })

  it('returns success=true for a failure STK webhook (valid shape, failed payment)', () => {
    const result = handleWebhook(FAILURE_WEBHOOK, { skipIPCheck: true })
    expect(result.success).toBe(true)
    expect(result.eventType).toBe('stk_push')
  })

  it('returns success=true for an insufficient-balance webhook', () => {
    const result = handleWebhook(INSUFFICIENT_BALANCE_WEBHOOK, { skipIPCheck: true })
    expect(result.success).toBe(true)
  })

  it('returns success=false for an unrecognised object payload', () => {
    expect(handleWebhook({ foo: 'bar' }, { skipIPCheck: true }).success).toBe(false)
  })

  it('error is a non-empty string for an unrecognised payload', () => {
    const result = handleWebhook({ foo: 'bar' }, { skipIPCheck: true })
    expect(typeof result.error).toBe('string')
    expect((result.error ?? '').length).toBeGreaterThan(0)
  })

  it('eventType is null for an unrecognised payload', () => {
    expect(handleWebhook({ foo: 'bar' }, { skipIPCheck: true }).eventType).toBeNull()
  })

  it('data is null for an unrecognised payload', () => {
    expect(handleWebhook({ foo: 'bar' }, { skipIPCheck: true }).data).toBeNull()
  })

  it('returns success=false for null body', () => {
    expect(handleWebhook(null, { skipIPCheck: true }).success).toBe(false)
  })

  it('returns success=false for undefined body', () => {
    expect(handleWebhook(undefined, { skipIPCheck: true }).success).toBe(false)
  })

  it('returns success=false for an empty object body', () => {
    expect(handleWebhook({}, { skipIPCheck: true }).success).toBe(false)
  })

  it('returns success=false for a string body', () => {
    expect(handleWebhook('not a webhook', { skipIPCheck: true }).success).toBe(false)
  })

  it('returns success=false for a number body', () => {
    expect(handleWebhook(42, { skipIPCheck: true }).success).toBe(false)
  })

  it('returns success=false for an array body', () => {
    expect(handleWebhook([], { skipIPCheck: true }).success).toBe(false)
  })

  it('returns success=false for a body missing stkCallback', () => {
    expect(handleWebhook({ Body: {} }, { skipIPCheck: true }).success).toBe(false)
  })

  it('returns success=false for a body with Body but no inner stkCallback key', () => {
    expect(handleWebhook({ Body: { other: 'data' } }, { skipIPCheck: true }).success).toBe(false)
  })

  it('with no options: requestIP is undefined — IP check is skipped', () => {
    expect(handleWebhook(SUCCESS_WEBHOOK).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. handleWebhook() — result structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleWebhook() — result structure', () => {
  it('always has success, eventType, data properties', () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { skipIPCheck: true }) as WebhookHandlerResult
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('eventType')
    expect(result).toHaveProperty('data')
  })

  it('success result has error=undefined', () => {
    expect(handleWebhook(SUCCESS_WEBHOOK, { skipIPCheck: true }).error).toBeUndefined()
  })

  it('failure result has error as a string', () => {
    expect(typeof handleWebhook({}, { skipIPCheck: true }).error).toBe('string')
  })

  it('ip-rejected result has error as a string', () => {
    expect(typeof handleWebhook(SUCCESS_WEBHOOK, { requestIP: UNSAFE_IP }).error).toBe('string')
  })

  it('the data in a success result is the typed StkPushWebhook', () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { skipIPCheck: true })
    const webhook = result.data as StkPushWebhook
    expect(webhook.Body.stkCallback.ResultCode).toBe(0)
  })

  it('success result eventType is always "stk_push" for a valid STK body', () => {
    expect(handleWebhook(SUCCESS_WEBHOOK, { skipIPCheck: true }).eventType).toBe('stk_push')
    expect(handleWebhook(FAILURE_WEBHOOK, { skipIPCheck: true }).eventType).toBe('stk_push')
  })

  it('failure result eventType is always null', () => {
    expect(handleWebhook(null, { skipIPCheck: true }).eventType).toBeNull()
    expect(handleWebhook({}, { skipIPCheck: true }).eventType).toBeNull()
    expect(handleWebhook(SUCCESS_WEBHOOK, { requestIP: UNSAFE_IP }).eventType).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. End-to-end flows
// ═══════════════════════════════════════════════════════════════════════════════

describe('End-to-end — handleWebhook → extractors', () => {
  it('full success flow: safe IP → extracted receipt, amount, phone', () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { requestIP: SAFE_IP })
    expect(result.success).toBe(true)

    const webhook = result.data as StkPushWebhook
    expect(isSuccessfulCallback(webhook)).toBe(true)
    expect(extractTransactionId(webhook)).toBe('NLJ7RT61SV')
    expect(extractAmount(webhook)).toBe(1)
    expect(extractPhoneNumber(webhook)).toBe('254708374149')
  })

  it('full failure flow: safe IP → valid shape but failed payment, all extractors return null', () => {
    const result = handleWebhook(FAILURE_WEBHOOK, { requestIP: SAFE_IP })
    expect(result.success).toBe(true)

    const webhook = result.data as StkPushWebhook
    expect(isSuccessfulCallback(webhook)).toBe(false)
    expect(extractTransactionId(webhook)).toBeNull()
    expect(extractAmount(webhook)).toBeNull()
    expect(extractPhoneNumber(webhook)).toBeNull()
  })

  it('rejected IP: data is null, extractors cannot be applied', () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { requestIP: UNSAFE_IP })
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
  })

  it('skipIPCheck: unsafe IP still reaches extractors correctly', () => {
    const result = handleWebhook(SUCCESS_WEBHOOK, { requestIP: '8.8.8.8', skipIPCheck: true })
    expect(result.success).toBe(true)
    const webhook = result.data as StkPushWebhook
    expect(isSuccessfulCallback(webhook)).toBe(true)
    expect(extractTransactionId(webhook)).toBe('NLJ7RT61SV')
  })

  it('all four metadata fields are extractable from SUCCESS_WEBHOOK', () => {
    const w = parseStkPushWebhook(SUCCESS_WEBHOOK)!
    expect(w.Body.stkCallback.CallbackMetadata?.Item).toHaveLength(4)
    expect(extractTransactionId(w)).toBeTruthy()
    expect(extractAmount(w)).toBeGreaterThan(0)
    expect(extractPhoneNumber(w)).toMatch(/^254\d{9}$/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. retryWithBackoff() — success paths
// ═══════════════════════════════════════════════════════════════════════════════

describe('retryWithBackoff() — success on first attempt', () => {
  it('returns success=true when fn resolves immediately', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 1 })
    expect(result.success).toBe(true)
    expect(result.data).toBe('ok')
  })

  it('attempts is 1 when fn succeeds on the first call', async () => {
    const fn = vi.fn().mockResolvedValue('data')
    const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 1 })
    expect(result.attempts).toBe(1)
  })

  it('fn is called exactly once on first-attempt success', async () => {
    const fn = vi.fn().mockResolvedValue('data')
    await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 1 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes the resolved value through correctly', async () => {
    const payload = { id: 42, status: 'saved' }
    const fn = vi.fn().mockResolvedValue(payload)
    const result = await retryWithBackoff(fn)
    expect(result.data).toStrictEqual(payload)
  })

  it('resolves undefined correctly', async () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    const result = await retryWithBackoff(fn, { maxRetries: 1, initialDelay: 1 })
    expect(result.success).toBe(true)
    expect(result.data).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. retryWithBackoff() — retry on failure
// ═══════════════════════════════════════════════════════════════════════════════

describe('retryWithBackoff() — retry on failure', () => {
  it('retries and returns success when fn eventually resolves', async () => {
    let calls = 0
    const fn = vi.fn().mockImplementation(() => {
      calls++
      if (calls < 3) return Promise.reject(new Error('temporary'))
      return Promise.resolve('recovered')
    })

    const result = await retryWithBackoff(fn, { maxRetries: 5, initialDelay: 1 })
    expect(result.success).toBe(true)
    expect(result.data).toBe('recovered')
    expect(result.attempts).toBe(3)
  })

  it('returns success=false after maxRetries is exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    const result = await retryWithBackoff(fn, { maxRetries: 2, initialDelay: 1 })
    expect(result.success).toBe(false)
  })

  it('total attempts = maxRetries + 1 when all fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    const result = await retryWithBackoff(fn, { maxRetries: 2, initialDelay: 1 })
    // first attempt + 2 retries = 3
    expect(result.attempts).toBe(3)
  })

  it('fn is called maxRetries + 1 times when all fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    await retryWithBackoff(fn, { maxRetries: 2, initialDelay: 1 })
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('returns the last error when all retries are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    const result = await retryWithBackoff(fn, { maxRetries: 2, initialDelay: 1 })
    expect(result.error).toBeDefined()
    expect(result.error instanceof Error).toBe(true)
  })

  it('error message is "Max retries exceeded" when the loop exhausts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    const result = await retryWithBackoff(fn, { maxRetries: 1, initialDelay: 1 })
    expect(result.error?.message).toBe('Max retries exceeded')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. retryWithBackoff() — maxRetries: 0 (no retries — the previously failing case)
// ═══════════════════════════════════════════════════════════════════════════════

describe('retryWithBackoff() — maxRetries: 0 (one attempt, no retries)', () => {
  it('calls fn exactly once when maxRetries is 0 and fn fails', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    await retryWithBackoff(fn, { maxRetries: 0, initialDelay: 1 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns success=false immediately when maxRetries is 0 and fn fails', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    const result = await retryWithBackoff(fn, { maxRetries: 0, initialDelay: 1 })
    expect(result.success).toBe(false)
  })

  it('attempts is 1 when maxRetries is 0', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    const result = await retryWithBackoff(fn, { maxRetries: 0, initialDelay: 1 })
    expect(result.attempts).toBe(1)
  })

  it('calls fn exactly once when maxRetries is 0 and fn succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retryWithBackoff(fn, { maxRetries: 0, initialDelay: 1 })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(true)
    expect(result.data).toBe('ok')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. retryWithBackoff() — result structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('retryWithBackoff() — result structure', () => {
  it('always returns an object with success and attempts fields', async () => {
    const fn = vi.fn().mockResolvedValue('x')
    const result = await retryWithBackoff(fn, { maxRetries: 1, initialDelay: 1 })
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('attempts')
  })

  it('success result includes a data field', async () => {
    const fn = vi.fn().mockResolvedValue('value')
    const result = await retryWithBackoff(fn, { maxRetries: 1, initialDelay: 1 })
    expect(result).toHaveProperty('data')
  })

  it('failure result includes an error field', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    const result = await retryWithBackoff(fn, { maxRetries: 0, initialDelay: 1 })
    expect(result).toHaveProperty('error')
  })

  it('attempts is always a positive integer', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 1 })
    expect(Number.isInteger(result.attempts)).toBe(true)
    expect(result.attempts).toBeGreaterThan(0)
  })

  it('success result has no error property set', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retryWithBackoff(fn, { maxRetries: 1, initialDelay: 1 })
    expect(result.error).toBeUndefined()
  })

  it('failure result has no data property set', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    const result = await retryWithBackoff(fn, { maxRetries: 0, initialDelay: 1 })
    expect(result.data).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 16. retryWithBackoff() — maxRetryDuration
// ═══════════════════════════════════════════════════════════════════════════════

describe('retryWithBackoff() — maxRetryDuration', () => {
  it('stops and returns failure when maxRetryDuration is 0 (already exceeded after first attempt)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    const result = await retryWithBackoff(fn, {
      maxRetries: 100,
      initialDelay: 1,
      maxRetryDuration: 0,
    })
    expect(result.success).toBe(false)
    // fn was called at least once before the duration check returned early on the next loop
    expect(fn).toHaveBeenCalled()
  })

  it('error message is "Max retry duration exceeded" when duration is hit', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    const result = await retryWithBackoff(fn, {
      maxRetries: 100,
      initialDelay: 1,
      maxRetryDuration: 0,
    })
    expect(result.error?.message).toBe('Max retry duration exceeded')
  })

  it('still succeeds if fn resolves on the very first attempt even with maxRetryDuration: 0', async () => {
    const fn = vi.fn().mockResolvedValue('fast')
    const result = await retryWithBackoff(fn, {
      maxRetries: 5,
      initialDelay: 1,
      maxRetryDuration: 999_999_999,
    })
    expect(result.success).toBe(true)
    expect(result.data).toBe('fast')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 17. retryWithBackoff() — default options
// ═══════════════════════════════════════════════════════════════════════════════

describe('retryWithBackoff() — default options', () => {
  it('succeeds immediately with no options specified', async () => {
    const fn = vi.fn().mockResolvedValue('default')
    const result = await retryWithBackoff(fn)
    expect(result.success).toBe(true)
    expect(result.data).toBe('default')
    expect(result.attempts).toBe(1)
  })
})
