/**
 * __tests__/encryption.test.ts
 *
 * Test suite for src/core/encryption/security-credentials.ts
 *
 * Covers:
 *   - encryptSecurityCredential() — success path (output shape, non-empty, base64)
 *   - encryptSecurityCredential() — correct padding verified via decrypt roundtrip
 *   - encryptSecurityCredential() — RSA_PKCS1_PADDING (not OAEP) confirmed behaviourally
 *   - encryptSecurityCredential() — different inputs produce different ciphertext
 *   - encryptSecurityCredential() — throws PesafyError(ENCRYPTION_FAILED) on invalid PEM
 *   - encryptSecurityCredential() — error wraps the original cause
 *   - encryptSecurityCredential() — handles special/unicode/empty passwords
 *
 * NOTE: vi.spyOn cannot intercept native ESM exports from `node:crypto` in
 * Vitest's thread pool. All padding/buffer assertions use the decrypt roundtrip
 * instead of spying on publicEncrypt directly.
 *
 * Run: pnpm test
 */

import { describe, expect, it } from 'vitest'
import { constants, privateDecrypt, generateKeyPairSync } from 'node:crypto'
import { encryptSecurityCredential } from '../src/core/encryption/security-credentials'
import { PesafyError } from '../src/utils/errors'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generates a 1024-bit RSA key pair for use in tests (fast, not production-safe). */
function generateTestKeyPair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 1024,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  })
}

/** Decrypts with RSA_PKCS1_PADDING — returns plaintext or throws. */
function decryptPKCS1(encrypted: string, privateKey: string): string {
  return privateDecrypt(
    { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(encrypted, 'base64'),
  ).toString('utf-8')
}

/** Decrypts with RSA_PKCS1_OAEP_PADDING — always throws for PKCS1-encrypted data. */
function decryptOAEP(encrypted: string, privateKey: string): string {
  return privateDecrypt(
    { key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(encrypted, 'base64'),
  ).toString('utf-8')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SUCCESS PATH
// ═══════════════════════════════════════════════════════════════════════════════

describe('encryptSecurityCredential() — success', () => {
  const { publicKey, privateKey } = generateTestKeyPair()

  it('returns a non-empty string', () => {
    const result = encryptSecurityCredential('myPassword', publicKey)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns a valid base64-encoded string', () => {
    const result = encryptSecurityCredential('myPassword', publicKey)
    expect(() => Buffer.from(result, 'base64')).not.toThrow()
    expect(Buffer.from(result, 'base64').length).toBeGreaterThan(0)
  })

  it('encrypted output can be decrypted back to the original password', () => {
    const password = 'TestInitiatorPassword123!'
    const encrypted = encryptSecurityCredential(password, publicKey)
    expect(decryptPKCS1(encrypted, privateKey)).toBe(password)
  })

  it('encrypts an empty string password without throwing', () => {
    const result = encryptSecurityCredential('', publicKey)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(decryptPKCS1(result, privateKey)).toBe('')
  })

  it('encrypts a password containing special characters', () => {
    const special = 'P@$$w0rd!#%&*()[]{}|;:<>?'
    const encrypted = encryptSecurityCredential(special, publicKey)
    expect(decryptPKCS1(encrypted, privateKey)).toBe(special)
  })

  it('encrypts a password containing unicode characters', () => {
    const unicode = 'pässwörd-αβγ'
    const encrypted = encryptSecurityCredential(unicode, publicKey)
    expect(decryptPKCS1(encrypted, privateKey)).toBe(unicode)
  })

  it('produces output whose decoded length matches the RSA key size (1024-bit → 128 bytes)', () => {
    const result = encryptSecurityCredential('test', publicKey)
    expect(Buffer.from(result, 'base64').length).toBe(128)
  })

  it('different passwords produce different ciphertext', () => {
    const enc1 = encryptSecurityCredential('password1', publicKey)
    const enc2 = encryptSecurityCredential('password2', publicKey)
    expect(Buffer.from(enc1, 'base64').equals(Buffer.from(enc2, 'base64'))).toBe(false)
  })

  it('calling twice on the same input produces two valid ciphertexts (PKCS1 non-deterministic)', () => {
    const password = 'SamePassword'
    const first = encryptSecurityCredential(password, publicKey)
    const second = encryptSecurityCredential(password, publicKey)
    expect(decryptPKCS1(first, privateKey)).toBe(password)
    expect(decryptPKCS1(second, privateKey)).toBe(password)
  })

  it('base64 output is self-consistent (encode→decode→encode is stable)', () => {
    const result = encryptSecurityCredential('roundtrip', publicKey)
    const reencoded = Buffer.from(result, 'base64').toString('base64')
    expect(reencoded).toBe(result)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. RSA_PKCS1_PADDING ENFORCEMENT (behavioural — no spy needed)
// ═══════════════════════════════════════════════════════════════════════════════

describe('encryptSecurityCredential() — RSA_PKCS1_PADDING behavioural verification', () => {
  const { publicKey, privateKey } = generateTestKeyPair()

  it('encrypted data decrypts successfully with RSA_PKCS1_PADDING', () => {
    const password = 'padding-check'
    const encrypted = encryptSecurityCredential(password, publicKey)
    expect(() => decryptPKCS1(encrypted, privateKey)).not.toThrow()
    expect(decryptPKCS1(encrypted, privateKey)).toBe(password)
  })

  it('encrypted data CANNOT be decrypted with RSA_PKCS1_OAEP_PADDING (proves PKCS1 was used, not OAEP)', () => {
    // PKCS1-padded data will always cause OAEP decryption to throw.
    // This behaviourally proves the function used constants.RSA_PKCS1_PADDING (1), not OAEP (4).
    const password = 'oaep-mismatch'
    const encrypted = encryptSecurityCredential(password, publicKey)
    expect(() => decryptOAEP(encrypted, privateKey)).toThrow()
  })

  it('decrypted bytes equal the UTF-8 encoding of the original password', () => {
    const password = 'utf8-buffer-check'
    const encrypted = encryptSecurityCredential(password, publicKey)
    const decrypted = privateDecrypt(
      { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(encrypted, 'base64'),
    )
    expect(decrypted).toStrictEqual(Buffer.from(password, 'utf-8'))
  })

  it('a multi-byte unicode password round-trips as UTF-8 bytes correctly', () => {
    const password = '日本語テスト'
    const encrypted = encryptSecurityCredential(password, publicKey)
    const decrypted = privateDecrypt(
      { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(encrypted, 'base64'),
    )
    expect(decrypted.toString('utf-8')).toBe(password)
    expect(decrypted).toStrictEqual(Buffer.from(password, 'utf-8'))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. FAILURE PATH — ENCRYPTION_FAILED
// ═══════════════════════════════════════════════════════════════════════════════

describe('encryptSecurityCredential() — ENCRYPTION_FAILED error', () => {
  it('throws PesafyError when given a completely invalid PEM string', () => {
    expect(() => encryptSecurityCredential('password', 'NOT_A_VALID_PEM')).toThrow(PesafyError)
  })

  it('error code is ENCRYPTION_FAILED for invalid PEM', () => {
    let caught: PesafyError | undefined
    try {
      encryptSecurityCredential('password', 'INVALID_PEM')
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught).toBeDefined()
    expect(caught?.code).toBe('ENCRYPTION_FAILED')
  })

  it('error message mentions "certificate PEM"', () => {
    let caught: PesafyError | undefined
    try {
      encryptSecurityCredential('password', 'INVALID_PEM')
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught?.message.toLowerCase()).toContain('certificate')
  })

  it('error message mentions "environment" (sandbox/production)', () => {
    let caught: PesafyError | undefined
    try {
      encryptSecurityCredential('password', 'INVALID_PEM')
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught?.message.toLowerCase()).toContain('environment')
  })

  it('wraps the underlying crypto error as cause', () => {
    let caught: PesafyError | undefined
    try {
      encryptSecurityCredential('password', 'INVALID_PEM')
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught?.cause).toBeDefined()
  })

  it('is an instance of both PesafyError and Error', () => {
    let caught: unknown
    try {
      encryptSecurityCredential('password', 'bad_pem')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(Error)
    expect(caught).toBeInstanceOf(PesafyError)
  })

  it('throws for an empty PEM string', () => {
    expect(() => encryptSecurityCredential('password', '')).toThrow(PesafyError)
    let caught: PesafyError | undefined
    try {
      encryptSecurityCredential('password', '')
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught?.code).toBe('ENCRYPTION_FAILED')
  })

  it('throws for a PEM that is just whitespace', () => {
    expect(() => encryptSecurityCredential('password', '   ')).toThrow(PesafyError)
    let caught: PesafyError | undefined
    try {
      encryptSecurityCredential('password', '   ')
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught?.code).toBe('ENCRYPTION_FAILED')
  })

  it('error code remains ENCRYPTION_FAILED for a truncated/malformed PEM', () => {
    const truncatedPem = '-----BEGIN PUBLIC KEY-----\nABCDEF\n'
    let caught: PesafyError | undefined
    try {
      encryptSecurityCredential('password', truncatedPem)
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught?.code).toBe('ENCRYPTION_FAILED')
  })

  it('error code remains ENCRYPTION_FAILED for a wrong key type (EC key instead of RSA)', () => {
    // Attempting RSA publicEncrypt with an EC key causes the underlying crypto to throw,
    // which should be caught and re-thrown as PesafyError(ENCRYPTION_FAILED).
    const { publicKey: ecKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })
    let caught: PesafyError | undefined
    try {
      encryptSecurityCredential('password', ecKey)
    } catch (e) {
      caught = e as PesafyError
    }
    expect(caught).toBeInstanceOf(PesafyError)
    expect(caught?.code).toBe('ENCRYPTION_FAILED')
  })

  it('does not throw when given a valid RSA key with a password up to 100 chars', () => {
    const { publicKey } = generateTestKeyPair()
    // 1024-bit key supports up to ~117 bytes plaintext with PKCS1 overhead
    const longPassword = 'a'.repeat(100)
    expect(() => encryptSecurityCredential(longPassword, publicKey)).not.toThrow()
  })
})
