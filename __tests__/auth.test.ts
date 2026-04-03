/**
 * __tests__/auth.test.ts
 *
 * Complete test suite for the Daraja Authorization API module:
 *
 *   Constants
 *   - AUTH_ERROR_CODES        — documented Daraja auth error codes
 *
 *   TokenManager
 *   - constructor             — instantiation
 *   - getAccessToken()        — success, endpoint shape, Basic Auth encoding
 *   - getAccessToken()        — token caching (hit / miss)
 *   - getAccessToken()        — token expiry & 60-second buffer
 *   - clearCache()            — forces re-fetch on next call
 *   - error handling          — AUTH_FAILED, 400.008.01, 400.008.02, propagation
 *
 * Strictly covers only what is documented in the Safaricom Daraja
 * Authorization API documentation.
 *
 * Run: pnpm test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks (must come before imports that use them) ────────────────────────────

vi.mock('../src/utils/http', () => ({
  httpRequest: vi.fn(),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { httpRequest } from '../src/utils/http'
import { TokenManager } from '../src/core/auth/token-manager'
import { AUTH_ERROR_CODES } from '../src/core/auth/types'
import { PesafyError } from '../src/utils/errors'

// ── Typed mock ────────────────────────────────────────────────────────────────

const mockHttpRequest = vi.mocked(httpRequest)

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PROD_URL = 'https://api.safaricom.co.ke'
const CONSUMER_KEY = 'test-consumer-key'
const CONSUMER_SECRET = 'test-consumer-secret'

/**
 * Daraja documented token response
 * @see https://developer.safaricom.co.ke/APIs/Authorization
 */
const TOKEN_RESPONSE = {
  access_token: 'c9SQxWWhmdVRlyh0zh8gZDTkubVF',
  expires_in: 3599,
}

const SECOND_TOKEN_RESPONSE = {
  access_token: 'newTokenAfterExpiry_xyz789',
  expires_in: 3599,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeManager(baseUrl = SANDBOX_URL) {
  return new TokenManager(CONSUMER_KEY, CONSUMER_SECRET, baseUrl)
}

function getCallArgs() {
  const call = mockHttpRequest.mock.calls[0]
  if (!call) throw new Error('httpRequest was not called')
  const [url, options] = call as [string, { method: string; headers: Record<string, string> }]
  return { url, options, headers: options.headers ?? {} }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AUTH_ERROR_CODES CONSTANTS (documented by Daraja)
// ═══════════════════════════════════════════════════════════════════════════════

describe('AUTH_ERROR_CODES (documented by Daraja)', () => {
  it('INVALID_AUTH_TYPE is "400.008.01"', () => {
    expect(AUTH_ERROR_CODES.INVALID_AUTH_TYPE).toBe('400.008.01')
  })

  it('INVALID_GRANT_TYPE is "400.008.02"', () => {
    expect(AUTH_ERROR_CODES.INVALID_GRANT_TYPE).toBe('400.008.02')
  })

  it('contains exactly 2 documented error codes', () => {
    expect(Object.keys(AUTH_ERROR_CODES)).toHaveLength(2)
  })

  it('all values are strings in "NNN.NNN.NN" format', () => {
    for (const code of Object.values(AUTH_ERROR_CODES)) {
      expect(typeof code).toBe('string')
      expect(/^\d{3}\.\d{3}\.\d{2}$/.test(code)).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TokenManager — INSTANTIATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('TokenManager — instantiation', () => {
  it('can be instantiated with sandbox URL', () => {
    expect(() => makeManager(SANDBOX_URL)).not.toThrow()
  })

  it('can be instantiated with production URL', () => {
    expect(() => makeManager(PROD_URL)).not.toThrow()
  })

  it('does NOT fetch a token on construction', () => {
    makeManager()
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. getAccessToken() — SUCCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccessToken() — success', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
  })

  it('returns the access token from the Daraja response', async () => {
    const manager = makeManager()
    const token = await manager.getAccessToken()
    expect(token).toBe(TOKEN_RESPONSE.access_token)
  })

  it('returns a non-empty string', async () => {
    const manager = makeManager()
    const token = await manager.getAccessToken()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. getAccessToken() — DARAJA ENDPOINT SHAPE
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccessToken() — endpoint shape (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
  })

  it('calls the correct Daraja OAuth endpoint', async () => {
    const manager = makeManager(SANDBOX_URL)
    await manager.getAccessToken()
    const { url } = getCallArgs()
    expect(url).toBe(`${SANDBOX_URL}/oauth/v1/generate?grant_type=client_credentials`)
  })

  it('uses the production endpoint when configured', async () => {
    const manager = makeManager(PROD_URL)
    await manager.getAccessToken()
    const { url } = getCallArgs()
    expect(url).toBe(`${PROD_URL}/oauth/v1/generate?grant_type=client_credentials`)
  })

  it('uses GET method (Daraja Authorization API requirement)', async () => {
    const manager = makeManager()
    await manager.getAccessToken()
    const { options } = getCallArgs()
    expect(options.method).toBe('GET')
  })

  it('URL always includes grant_type=client_credentials', async () => {
    const manager = makeManager()
    await manager.getAccessToken()
    const { url } = getCallArgs()
    expect(url).toContain('grant_type=client_credentials')
  })

  it('sends no request body (GET requests have no body per Daraja spec)', async () => {
    const manager = makeManager()
    await manager.getAccessToken()
    const { options } = getCallArgs()
    expect((options as Record<string, unknown>)['body']).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. getAccessToken() — BASIC AUTH ENCODING (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccessToken() — Basic Auth encoding (Daraja spec)', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
  })

  it('sends an Authorization header', async () => {
    const manager = makeManager()
    await manager.getAccessToken()
    const { headers } = getCallArgs()
    expect(headers['Authorization']).toBeDefined()
  })

  it('Authorization header starts with "Basic "', async () => {
    const manager = makeManager()
    await manager.getAccessToken()
    const { headers } = getCallArgs()
    expect(headers['Authorization']).toMatch(/^Basic /)
  })

  it('Authorization header base64 portion is valid base64', async () => {
    const manager = makeManager()
    await manager.getAccessToken()
    const { headers } = getCallArgs()
    const base64Part = headers['Authorization']!.replace('Basic ', '')
    expect(/^[A-Za-z0-9+/=]+$/.test(base64Part)).toBe(true)
  })

  it('decoded base64 is "consumerKey:consumerSecret"', async () => {
    const manager = makeManager()
    await manager.getAccessToken()
    const { headers } = getCallArgs()
    const base64Part = headers['Authorization']!.replace('Basic ', '')
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8')
    expect(decoded).toBe(`${CONSUMER_KEY}:${CONSUMER_SECRET}`)
  })

  it('encodes colon-separated credentials exactly (Daraja: Base64(key:secret))', async () => {
    const manager = makeManager()
    await manager.getAccessToken()
    const { headers } = getCallArgs()
    const expectedEncoded = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')
    expect(headers['Authorization']).toBe(`Basic ${expectedEncoded}`)
  })

  it('different credentials produce a different Authorization header', async () => {
    const manager1 = new TokenManager('key-A', 'secret-A', SANDBOX_URL)
    const manager2 = new TokenManager('key-B', 'secret-B', SANDBOX_URL)

    await manager1.getAccessToken()
    const { headers: h1 } = getCallArgs()
    mockHttpRequest.mockClear()

    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    await manager2.getAccessToken()
    const { headers: h2 } = getCallArgs()

    expect(h1['Authorization']).not.toBe(h2['Authorization'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. getAccessToken() — TOKEN CACHING
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccessToken() — token caching', () => {
  it('returns the same token on a second call without re-fetching', async () => {
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()

    const first = await manager.getAccessToken()
    const second = await manager.getAccessToken()

    expect(first).toBe(second)
    expect(mockHttpRequest).toHaveBeenCalledTimes(1)
  })

  it('calls httpRequest exactly once for multiple consecutive valid-token calls', async () => {
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()

    await manager.getAccessToken()
    await manager.getAccessToken()
    await manager.getAccessToken()

    expect(mockHttpRequest).toHaveBeenCalledTimes(1)
  })

  it('does NOT re-fetch when the token has plenty of time remaining', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(0)
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()

    await manager.getAccessToken()
    mockHttpRequest.mockClear()

    // Advance by 1000 seconds — well within the 3599-second lifetime
    nowSpy.mockReturnValue(1_000_000)

    const token = await manager.getAccessToken()

    expect(mockHttpRequest).not.toHaveBeenCalled()
    expect(token).toBe(TOKEN_RESPONSE.access_token)

    nowSpy.mockRestore()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. getAccessToken() — TOKEN EXPIRY & 60-SECOND BUFFER
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccessToken() — token expiry and 60-second buffer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('re-fetches when the token has fully expired', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(0)
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()

    // Populate cache at t=0; tokenExpiresAt = 0 + 3599 = 3599
    await manager.getAccessToken()
    mockHttpRequest.mockClear()

    // Advance past expiry: now = 3700 > tokenExpiresAt (3599)
    nowSpy.mockReturnValue(3_700_000)
    mockHttpRequest.mockResolvedValue({ data: SECOND_TOKEN_RESPONSE } as never)

    const token = await manager.getAccessToken()

    expect(mockHttpRequest).toHaveBeenCalledTimes(1)
    expect(token).toBe(SECOND_TOKEN_RESPONSE.access_token)
  })

  it('re-fetches when within the 60-second buffer period (before expiry)', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(0)
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()

    // Populate cache at t=0; tokenExpiresAt = 3599
    await manager.getAccessToken()
    mockHttpRequest.mockClear()

    // Buffer check: tokenExpiresAt > now + 60
    // At now=3539: 3599 > 3539 + 60 = 3599 → false → triggers refresh
    nowSpy.mockReturnValue(3_539_000)
    mockHttpRequest.mockResolvedValue({ data: SECOND_TOKEN_RESPONSE } as never)

    const token = await manager.getAccessToken()

    expect(mockHttpRequest).toHaveBeenCalledTimes(1)
    expect(token).toBe(SECOND_TOKEN_RESPONSE.access_token)
  })

  it('does NOT re-fetch when outside the 60-second buffer (still safe)', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(0)
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()

    // Populate cache at t=0; tokenExpiresAt = 3599
    await manager.getAccessToken()
    mockHttpRequest.mockClear()

    // Buffer check at now=3400: 3599 > 3400 + 60 = 3460 → true → use cache
    nowSpy.mockReturnValue(3_400_000)

    const token = await manager.getAccessToken()

    expect(mockHttpRequest).not.toHaveBeenCalled()
    expect(token).toBe(TOKEN_RESPONSE.access_token)
  })

  it('uses expires_in from the Daraja response to set the expiry time', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(0)

    // Token with a very short lifetime (120 seconds)
    const shortLivedResponse = { access_token: 'short-lived-token', expires_in: 120 }
    mockHttpRequest.mockResolvedValue({ data: shortLivedResponse } as never)
    const manager = makeManager()

    await manager.getAccessToken()
    mockHttpRequest.mockClear()

    // Advance 62 seconds — within 60s buffer of a 120s token
    // tokenExpiresAt = 0 + 120 = 120; now + 60 = 62 + 60 = 122 > 120 → refresh
    nowSpy.mockReturnValue(62_000)
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)

    await manager.getAccessToken()

    expect(mockHttpRequest).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. clearCache() — FORCED REFRESH
// ═══════════════════════════════════════════════════════════════════════════════

describe('clearCache()', () => {
  it('forces re-fetch on the next getAccessToken() call', async () => {
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()

    await manager.getAccessToken()
    mockHttpRequest.mockClear()

    manager.clearCache()

    mockHttpRequest.mockResolvedValue({ data: SECOND_TOKEN_RESPONSE } as never)
    await manager.getAccessToken()

    expect(mockHttpRequest).toHaveBeenCalledTimes(1)
  })

  it('returns the freshly fetched token after clearCache()', async () => {
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()

    await manager.getAccessToken()
    manager.clearCache()

    mockHttpRequest.mockResolvedValue({ data: SECOND_TOKEN_RESPONSE } as never)
    const token = await manager.getAccessToken()

    expect(token).toBe(SECOND_TOKEN_RESPONSE.access_token)
  })

  it('calling clearCache() multiple times is idempotent', () => {
    const manager = makeManager()
    expect(() => {
      manager.clearCache()
      manager.clearCache()
      manager.clearCache()
    }).not.toThrow()
  })

  it('clearCache() on a manager that never fetched a token does not throw', () => {
    const manager = makeManager()
    expect(() => manager.clearCache()).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. getAccessToken() — AUTH_FAILED WHEN access_token IS ABSENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccessToken() — AUTH_FAILED on missing access_token', () => {
  it('throws AUTH_FAILED when Daraja returns no access_token', async () => {
    mockHttpRequest.mockResolvedValue({ data: { expires_in: 3599 } } as never)
    const manager = makeManager()

    await expect(manager.getAccessToken()).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    })
  })

  it('throws AUTH_FAILED when access_token is an empty string', async () => {
    mockHttpRequest.mockResolvedValue({
      data: { access_token: '', expires_in: 3599 },
    } as never)
    const manager = makeManager()

    await expect(manager.getAccessToken()).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    })
  })

  it('error message mentions verifying consumer key and secret', async () => {
    mockHttpRequest.mockResolvedValue({ data: { expires_in: 3599 } } as never)
    const manager = makeManager()

    const err = await manager.getAccessToken().catch((e: PesafyError) => e)

    expect(err.message.toLowerCase()).toContain('consumer')
  })

  it('thrown error is an instance of PesafyError', async () => {
    mockHttpRequest.mockResolvedValue({ data: { expires_in: 3599 } } as never)
    const manager = makeManager()

    await expect(manager.getAccessToken()).rejects.toBeInstanceOf(PesafyError)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. getAccessToken() — DARAJA AUTH ERROR CODE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccessToken() — Daraja auth error code mapping', () => {
  it('maps 400.008.01 (INVALID_AUTH_TYPE) to AUTH_FAILED', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Invalid authentication type passed.',
        statusCode: 400,
        response: {
          errorCode: AUTH_ERROR_CODES.INVALID_AUTH_TYPE,
          errorMessage: 'Invalid authentication type passed.',
        },
      }),
    )
    const manager = makeManager()

    await expect(manager.getAccessToken()).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    })
  })

  it('error message for 400.008.01 mentions Basic authentication', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Invalid authentication type.',
        statusCode: 400,
        response: {
          errorCode: AUTH_ERROR_CODES.INVALID_AUTH_TYPE,
          errorMessage: 'Invalid authentication type passed.',
        },
      }),
    )
    const manager = makeManager()

    const err = await manager.getAccessToken().catch((e: PesafyError) => e)

    expect(err.message.toLowerCase()).toContain('basic')
  })

  it('maps 400.008.02 (INVALID_GRANT_TYPE) to AUTH_FAILED', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Invalid grant type passed.',
        statusCode: 400,
        response: {
          errorCode: AUTH_ERROR_CODES.INVALID_GRANT_TYPE,
          errorMessage: 'Invalid grant type passed.',
        },
      }),
    )
    const manager = makeManager()

    await expect(manager.getAccessToken()).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    })
  })

  it('error message for 400.008.02 mentions client_credentials', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Invalid grant type.',
        statusCode: 400,
        response: {
          errorCode: AUTH_ERROR_CODES.INVALID_GRANT_TYPE,
          errorMessage: 'Invalid grant type passed.',
        },
      }),
    )
    const manager = makeManager()

    const err = await manager.getAccessToken().catch((e: PesafyError) => e)

    expect(err.message).toContain('client_credentials')
  })

  it('preserves the original statusCode when mapping 400.008.01', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Bad request.',
        statusCode: 400,
        response: { errorCode: AUTH_ERROR_CODES.INVALID_AUTH_TYPE, errorMessage: 'Bad auth type' },
      }),
    )
    const manager = makeManager()

    const err = await manager.getAccessToken().catch((e: PesafyError) => e)

    expect(err.statusCode).toBe(400)
  })

  it('preserves the original statusCode when mapping 400.008.02', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({
        code: 'API_ERROR',
        message: 'Bad request.',
        statusCode: 400,
        response: {
          errorCode: AUTH_ERROR_CODES.INVALID_GRANT_TYPE,
          errorMessage: 'Bad grant type',
        },
      }),
    )
    const manager = makeManager()

    const err = await manager.getAccessToken().catch((e: PesafyError) => e)

    expect(err.statusCode).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. getAccessToken() — ERROR PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccessToken() — error propagation', () => {
  it('re-throws an unrecognised PesafyError from httpRequest unchanged', async () => {
    const original = new PesafyError({
      code: 'API_ERROR',
      message: 'Unexpected server error.',
      statusCode: 500,
      response: { errorCode: '999.999.99', errorMessage: 'Unknown' },
    })
    mockHttpRequest.mockRejectedValue(original)
    const manager = makeManager()

    await expect(manager.getAccessToken()).rejects.toThrow('Unexpected server error.')
  })

  it('re-throws a NETWORK_ERROR from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({ code: 'NETWORK_ERROR', message: 'Connection refused' }),
    )
    const manager = makeManager()

    await expect(manager.getAccessToken()).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    })
  })

  it('re-throws a TIMEOUT from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(
      new PesafyError({ code: 'TIMEOUT', message: 'Request timed out after 30000 ms' }),
    )
    const manager = makeManager()

    await expect(manager.getAccessToken()).rejects.toMatchObject({
      code: 'TIMEOUT',
    })
  })

  it('propagates a generic Error from httpRequest', async () => {
    mockHttpRequest.mockRejectedValue(new Error('ECONNRESET'))
    const manager = makeManager()

    await expect(manager.getAccessToken()).rejects.toThrow('ECONNRESET')
  })

  it('propagates a generic Error from httpRequest as-is (not wrapped)', async () => {
    const original = new Error('ETIMEDOUT')
    mockHttpRequest.mockRejectedValue(original)
    const manager = makeManager()

    const caught = await manager.getAccessToken().catch((e: unknown) => e)

    expect(caught).toBe(original)
  })

  it('does NOT cache a token when httpRequest throws', async () => {
    mockHttpRequest.mockRejectedValueOnce(new Error('ENETDOWN'))
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()

    // First call fails
    await manager.getAccessToken().catch(() => {})

    // Second call should retry httpRequest (nothing was cached on failure)
    await manager.getAccessToken()

    expect(mockHttpRequest).toHaveBeenCalledTimes(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. getAccessToken() — SANDBOX vs PRODUCTION URLS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAccessToken() — sandbox vs production environment', () => {
  beforeEach(() => {
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
  })

  it('uses the sandbox base URL when configured with sandbox', async () => {
    const manager = makeManager(SANDBOX_URL)
    await manager.getAccessToken()
    const { url } = getCallArgs()
    expect(url.startsWith(SANDBOX_URL)).toBe(true)
  })

  it('uses the production base URL when configured with production', async () => {
    const manager = makeManager(PROD_URL)
    await manager.getAccessToken()
    const { url } = getCallArgs()
    expect(url.startsWith(PROD_URL)).toBe(true)
  })

  it('sandbox and production tokens are fetched from different URLs', async () => {
    const sandboxManager = makeManager(SANDBOX_URL)
    await sandboxManager.getAccessToken()
    const { url: sandboxUrl } = getCallArgs()
    mockHttpRequest.mockClear()

    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const prodManager = makeManager(PROD_URL)
    await prodManager.getAccessToken()
    const { url: prodUrl } = getCallArgs()

    expect(sandboxUrl).not.toBe(prodUrl)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. TOKEN RESPONSE STRUCTURE (Daraja spec)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Daraja token response structure', () => {
  it('access_token is a non-empty string', async () => {
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()
    const token = await manager.getAccessToken()

    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('access_token matches what Daraja returned in the response', async () => {
    mockHttpRequest.mockResolvedValue({ data: TOKEN_RESPONSE } as never)
    const manager = makeManager()
    const token = await manager.getAccessToken()

    expect(token).toBe(TOKEN_RESPONSE.access_token)
  })

  it('Daraja documented expires_in value is 3599 seconds', () => {
    // Per Daraja docs: "Token Expiry: 3600 seconds" — actual response value is 3599
    expect(TOKEN_RESPONSE.expires_in).toBe(3599)
  })
})
