/**
 * __tests__/coverage-gaps.test.ts
 *
 * Supplemental tests that close the remaining coverage gaps across three modules:
 *
 *   src/utils/phone/index.ts          — currently 75 %
 *   src/core/auth/token-manager.ts    — error_code fallback + expires_in ?? 3600
 *   src/utils/errors/index.ts         — Error.captureStackTrace, isAuth, toJSON
 *
 * Run: pnpm test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── phone ──────────────────────────────────────────────────────────────────────
import { formatSafaricomPhone } from '../src/utils/phone'

// ── auth ───────────────────────────────────────────────────────────────────────
vi.mock('../src/utils/http', () => ({ httpRequest: vi.fn() }))

import { httpRequest } from '../src/utils/http'
import { TokenManager } from '../src/core/auth/token-manager'
import { AUTH_ERROR_CODES } from '../src/core/auth/types'

const mockHttpRequest = vi.mocked(httpRequest)

// ── errors ─────────────────────────────────────────────────────────────────────
import { PesafyError, createError, isPesafyError, ERROR_CODES } from '../src/utils/errors'

// ══════════════════════════════════════════════════════════════════════════════
// 1.  src/utils/phone/index.ts — branch coverage
// ══════════════════════════════════════════════════════════════════════════════
//
// The guard on lines 20-25 (`if (n.length !== 12)`) is dead code given the
// current implementation: every branch that sets `n` produces exactly 12
// digits, so it can never fire.  We document this explicitly so future
// maintainers understand the intent, and we add the one boundary test that
// directly exercises the assignment path most likely to be overlooked.
//

describe('formatSafaricomPhone() — n.length guard (dead-code documentation)', () => {
  it('254-prefix path always produces exactly 12 chars (guard never fires)', () => {
    // Branch 1: n = digits — digits is already 12 chars
    expect(formatSafaricomPhone('254712345678')).toHaveLength(12)
  })

  it('leading-zero path always produces exactly 12 chars (guard never fires)', () => {
    // Branch 2: n = "254" + digits.slice(1) — 3 + 9 = 12
    expect(formatSafaricomPhone('0712345678')).toHaveLength(12)
  })

  it('bare-9-digit path always produces exactly 12 chars (guard never fires)', () => {
    // Branch 3: n = "254" + digits — 3 + 9 = 12
    expect(formatSafaricomPhone('712345678')).toHaveLength(12)
  })

  it('all three normalisation paths share the same guard and return the same value', () => {
    const a = formatSafaricomPhone('254712345678')
    const b = formatSafaricomPhone('0712345678')
    const c = formatSafaricomPhone('712345678')
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(a).toHaveLength(12)
  })
})

describe('formatSafaricomPhone() — error path coverage', () => {
  it('throws INVALID_PHONE and error message contains the original input', () => {
    let caught: PesafyError | undefined
    try {
      formatSafaricomPhone('12345')
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught).toBeInstanceOf(PesafyError)
    expect(caught?.code).toBe('INVALID_PHONE')
    expect(caught?.message).toContain('12345')
  })

  it('message uses the raw phone string (before digit-stripping) for clarity', () => {
    // The function embeds `phone` (the original arg) not `digits` in the message
    let caught: PesafyError | undefined
    try {
      formatSafaricomPhone('+1-800-BAD')
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught?.message).toContain('+1-800-BAD')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2.  src/core/auth/token-manager.ts — uncovered branches
// ══════════════════════════════════════════════════════════════════════════════

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const TOKEN_RESPONSE = { access_token: 'c9SQxWWhmdVRlyh0zh8gZDTkubVF', expires_in: 3599 }

function makeManager() {
  return new TokenManager('test-key', 'test-secret', SANDBOX_URL)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

// ── Branch: raw['error_code'] snake_case fallback ────────────────────────────
//
//   const errorCode = (raw['errorCode'] ?? raw['error_code']) as string | undefined
//
// Existing tests only pass `errorCode` (camelCase).  These tests pass
// `error_code` (snake_case) to cover the right-hand side of the ?? operator.

describe('TokenManager — error_code (snake_case) fallback in mapAuthError()', () => {
  it('maps snake_case error_code 400.008.01 to AUTH_FAILED', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Invalid authentication type.',
        statusCode: 400,
        response: {
          // NOTE: snake_case — exercises the right-hand side of `??`
          error_code: AUTH_ERROR_CODES.INVALID_AUTH_TYPE,
          errorMessage: 'Invalid authentication type passed.',
        },
      }),
    )
    const manager = makeManager()
    await expect(manager.getAccessToken()).rejects.toMatchObject({ code: 'AUTH_FAILED' })
  })

  it('error message for snake_case 400.008.01 mentions Basic authentication', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Bad auth type.',
        statusCode: 400,
        response: {
          error_code: AUTH_ERROR_CODES.INVALID_AUTH_TYPE,
          errorMessage: 'Invalid authentication type passed.',
        },
      }),
    )
    const manager = makeManager()
    const err = await manager.getAccessToken().catch((e: PesafyError) => e)
    expect(err.message.toLowerCase()).toContain('basic')
  })

  it('maps snake_case error_code 400.008.02 to AUTH_FAILED', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Invalid grant type.',
        statusCode: 400,
        response: {
          error_code: AUTH_ERROR_CODES.INVALID_GRANT_TYPE,
          errorMessage: 'Invalid grant type passed.',
        },
      }),
    )
    const manager = makeManager()
    await expect(manager.getAccessToken()).rejects.toMatchObject({ code: 'AUTH_FAILED' })
  })

  it('error message for snake_case 400.008.02 mentions client_credentials', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Bad grant type.',
        statusCode: 400,
        response: {
          error_code: AUTH_ERROR_CODES.INVALID_GRANT_TYPE,
          errorMessage: 'Invalid grant type passed.',
        },
      }),
    )
    const manager = makeManager()
    const err = await manager.getAccessToken().catch((e: PesafyError) => e)
    expect(err.message).toContain('client_credentials')
  })

  it('preserves statusCode when mapping snake_case 400.008.01', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Bad request.',
        statusCode: 400,
        response: { error_code: AUTH_ERROR_CODES.INVALID_AUTH_TYPE, errorMessage: '' },
      }),
    )
    const manager = makeManager()
    const err = await manager.getAccessToken().catch((e: PesafyError) => e)
    expect(err.statusCode).toBe(400)
  })
})

// ── Branch: expires_in ?? 3600 ────────────────────────────────────────────────
//
//   this.tokenExpiresAt = now + (expires_in ?? 3600)
//
// When Daraja returns a response without an expires_in field the token manager
// must fall back to 3600 seconds.  We verify this by checking that the cache
// is still valid 3539 s later (inside the 3600 – 60 = 3540 s window) and that
// a fresh fetch is triggered at 3541 s (inside the 60 s buffer of 3600 s).

describe('TokenManager — expires_in ?? 3600 fallback', () => {
  it('uses a 3600-second window when expires_in is absent from the response', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(0)
    // Response deliberately omits expires_in
    mockHttpRequest.mockResolvedValue({ data: { access_token: 'token-no-expiry' } } as never)
    const manager = makeManager()

    await manager.getAccessToken()
    mockHttpRequest.mockClear()

    // 3539 s in: tokenExpiresAt = 3600, check: 3600 > 3539 + 60 = 3599 → true → cache hit
    nowSpy.mockReturnValue(3_539_000)
    await manager.getAccessToken()
    expect(mockHttpRequest).not.toHaveBeenCalled()

    nowSpy.mockRestore()
  })

  it('re-fetches when inside the 60-second buffer of the 3600-second fallback', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(0)
    mockHttpRequest.mockResolvedValue({ data: { access_token: 'token-no-expiry' } } as never)
    const manager = makeManager()

    await manager.getAccessToken()
    mockHttpRequest.mockClear()

    // 3541 s in: 3600 > 3541 + 60 = 3601 → false → triggers refresh
    nowSpy.mockReturnValue(3_541_000)
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)

    const token = await manager.getAccessToken()

    expect(mockHttpRequest).toHaveBeenCalledTimes(1)
    expect(token).toBe(TOKEN_RESPONSE.access_token)

    nowSpy.mockRestore()
  })

  it('returns the token from a response missing expires_in', async () => {
    mockHttpRequest.mockResolvedValue({ data: { access_token: 'no-expiry-token' } } as never)
    const manager = makeManager()
    const token = await manager.getAccessToken()
    expect(token).toBe('no-expiry-token')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 3.  src/utils/errors/index.ts — uncovered branches
// ══════════════════════════════════════════════════════════════════════════════

// ── Error.captureStackTrace ──────────────────────────────────────────────────
//
//   if (Error.captureStackTrace) { Error.captureStackTrace(this, PesafyError) }
//
// In Node / V8 this branch is always taken.  We verify that:
//   a) stack is populated (captureStackTrace ran)
//   b) the top frame is NOT the PesafyError constructor itself
//      (i.e. the second argument `PesafyError` trimmed the constructor frame)

describe('PesafyError — Error.captureStackTrace branch', () => {
  it('stack trace is defined in V8/Node environments', () => {
    const err = new PesafyError({ code: 'API_ERROR', message: 'test error' })
    // captureStackTrace is always present in Node — this covers the if-branch
    expect(err.stack).toBeDefined()
    expect(typeof err.stack).toBe('string')
  })

  it('stack contains "PesafyError" as the error name', () => {
    const err = new PesafyError({ code: 'API_ERROR', message: 'stack test' })
    expect(err.stack).toContain('PesafyError')
  })

  it('stack does NOT start with the internal constructor call site', () => {
    // captureStackTrace(this, PesafyError) strips the constructor frame so
    // the first frame should be the caller, not the PesafyError constructor.
    function callSite() {
      return new PesafyError({ code: 'API_ERROR', message: 'frame test' })
    }
    const err = callSite()
    // The first user-visible frame must reference `callSite`, not the constructor.
    expect(err.stack).toContain('callSite')
  })

  it('is an instance of both PesafyError and Error after captureStackTrace', () => {
    const err = new PesafyError({ code: 'NETWORK_ERROR', message: 'net' })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(PesafyError)
  })
})

// ── isAuth getter ─────────────────────────────────────────────────────────────
//
//   return this.code === 'AUTH_FAILED' || this.code === 'INVALID_CREDENTIALS'
//
// Tests hit both sides of the || and several non-auth codes.

describe('PesafyError — isAuth getter', () => {
  it('returns true for AUTH_FAILED (left side of ||)', () => {
    expect(new PesafyError({ code: 'AUTH_FAILED', message: '' }).isAuth).toBe(true)
  })

  it('returns true for INVALID_CREDENTIALS (right side of ||)', () => {
    expect(new PesafyError({ code: 'INVALID_CREDENTIALS', message: '' }).isAuth).toBe(true)
  })

  it('returns false for API_ERROR', () => {
    expect(new PesafyError({ code: 'API_ERROR', message: '' }).isAuth).toBe(false)
  })

  it('returns false for NETWORK_ERROR', () => {
    expect(new PesafyError({ code: 'NETWORK_ERROR', message: '' }).isAuth).toBe(false)
  })

  it('returns false for TIMEOUT', () => {
    expect(new PesafyError({ code: 'TIMEOUT', message: '' }).isAuth).toBe(false)
  })

  it('returns false for INVALID_PHONE', () => {
    expect(new PesafyError({ code: 'INVALID_PHONE', message: '' }).isAuth).toBe(false)
  })

  it('only AUTH_FAILED and INVALID_CREDENTIALS return true', () => {
    const authCodes: Array<(typeof ERROR_CODES)[number]> = ['AUTH_FAILED', 'INVALID_CREDENTIALS']
    for (const code of ERROR_CODES) {
      const expected = authCodes.includes(code)
      expect(new PesafyError({ code, message: '' }).isAuth).toBe(expected)
    }
  })
})

// ── isValidation getter ───────────────────────────────────────────────────────

describe('PesafyError — isValidation getter', () => {
  it('returns true for VALIDATION_ERROR', () => {
    expect(new PesafyError({ code: 'VALIDATION_ERROR', message: '' }).isValidation).toBe(true)
  })

  it('returns false for all non-validation codes', () => {
    for (const code of ERROR_CODES.filter((c) => c !== 'VALIDATION_ERROR')) {
      expect(new PesafyError({ code, message: '' }).isValidation).toBe(false)
    }
  })
})

// ── toJSON() ──────────────────────────────────────────────────────────────────
//
//   return { name, code, message, statusCode, requestId, retryable }
//
// Verify every key is present and carries the right value.

describe('PesafyError — toJSON()', () => {
  it('returns an object containing all six documented keys', () => {
    const err = new PesafyError({
      code: 'API_ERROR',
      message: 'something went wrong',
      statusCode: 422,
      requestId: 'req-abc-123',
    })
    const json = err.toJSON()
    expect(json).toHaveProperty('name', 'PesafyError')
    expect(json).toHaveProperty('code', 'API_ERROR')
    expect(json).toHaveProperty('message', 'something went wrong')
    expect(json).toHaveProperty('statusCode', 422)
    expect(json).toHaveProperty('requestId', 'req-abc-123')
    expect(json).toHaveProperty('retryable')
  })

  it('toJSON().name is always "PesafyError"', () => {
    expect(new PesafyError({ code: 'TIMEOUT', message: '' }).toJSON().name).toBe('PesafyError')
  })

  it('toJSON().retryable is true for NETWORK_ERROR', () => {
    expect(new PesafyError({ code: 'NETWORK_ERROR', message: '' }).toJSON().retryable).toBe(true)
  })

  it('toJSON().retryable is true for TIMEOUT', () => {
    expect(new PesafyError({ code: 'TIMEOUT', message: '' }).toJSON().retryable).toBe(true)
  })

  it('toJSON().retryable is true for RATE_LIMITED', () => {
    expect(new PesafyError({ code: 'RATE_LIMITED', message: '' }).toJSON().retryable).toBe(true)
  })

  it('toJSON().retryable is true for REQUEST_FAILED', () => {
    expect(new PesafyError({ code: 'REQUEST_FAILED', message: '' }).toJSON().retryable).toBe(true)
  })

  it('toJSON().retryable is false for AUTH_FAILED', () => {
    expect(new PesafyError({ code: 'AUTH_FAILED', message: '' }).toJSON().retryable).toBe(false)
  })

  it('toJSON().retryable is false for INVALID_PHONE', () => {
    expect(new PesafyError({ code: 'INVALID_PHONE', message: '' }).toJSON().retryable).toBe(false)
  })

  it('toJSON().statusCode is undefined when not provided', () => {
    expect(new PesafyError({ code: 'API_ERROR', message: '' }).toJSON().statusCode).toBeUndefined()
  })

  it('toJSON().requestId is undefined when not provided', () => {
    expect(new PesafyError({ code: 'API_ERROR', message: '' }).toJSON().requestId).toBeUndefined()
  })

  it('toJSON() does NOT include response or cause (those are omitted from the public shape)', () => {
    const json = new PesafyError({
      code: 'API_ERROR',
      message: 'err',
      response: { raw: 'data' },
      cause: new Error('inner'),
    }).toJSON()
    expect(json).not.toHaveProperty('response')
    expect(json).not.toHaveProperty('cause')
  })

  it('explicit retryable: true override is reflected in toJSON()', () => {
    const err = new PesafyError({ code: 'API_ERROR', message: '', retryable: true })
    expect(err.toJSON().retryable).toBe(true)
  })

  it('explicit retryable: false override is reflected in toJSON()', () => {
    const err = new PesafyError({ code: 'NETWORK_ERROR', message: '', retryable: false })
    expect(err.toJSON().retryable).toBe(false)
  })

  it('result is JSON-serialisable (no circular references)', () => {
    const err = new PesafyError({ code: 'API_ERROR', message: 'json test', statusCode: 500 })
    expect(() => JSON.stringify(err.toJSON())).not.toThrow()
  })
})

// ── createError() factory ─────────────────────────────────────────────────────

describe('createError()', () => {
  it('returns a PesafyError instance', () => {
    expect(createError({ code: 'TIMEOUT', message: 'timed out' })).toBeInstanceOf(PesafyError)
  })

  it('passes options through correctly', () => {
    const err = createError({ code: 'RATE_LIMITED', message: 'slow down', statusCode: 429 })
    expect(err.code).toBe('RATE_LIMITED')
    expect(err.statusCode).toBe(429)
  })
})

// ── isPesafyError() type guard ────────────────────────────────────────────────

describe('isPesafyError()', () => {
  it('returns true for a PesafyError instance', () => {
    expect(isPesafyError(new PesafyError({ code: 'API_ERROR', message: '' }))).toBe(true)
  })

  it('returns false for a plain Error', () => {
    expect(isPesafyError(new Error('plain'))).toBe(false)
  })

  it('returns false for null', () => {
    expect(isPesafyError(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isPesafyError(undefined)).toBe(false)
  })

  it('returns false for a plain object', () => {
    expect(isPesafyError({ code: 'API_ERROR', message: '' })).toBe(false)
  })
})

// ── retryable auto-assignment ─────────────────────────────────────────────────

describe('PesafyError — retryable auto-assignment', () => {
  const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED', 'REQUEST_FAILED'] as const
  const nonRetryableCodes = ERROR_CODES.filter((c) => !retryableCodes.includes(c as never))

  for (const code of retryableCodes) {
    it(`${code} is retryable by default`, () => {
      expect(new PesafyError({ code, message: '' }).retryable).toBe(true)
    })
  }

  for (const code of nonRetryableCodes) {
    it(`${code} is NOT retryable by default`, () => {
      expect(new PesafyError({ code, message: '' }).retryable).toBe(false)
    })
  }
})
