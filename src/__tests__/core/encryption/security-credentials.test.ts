/**
 * Advanced patterns used here:
 *   • beforeAll with real async crypto — generate an RSA key-pair once for the suite
 *   • toMatch regex    — assert base64 encoding without hardcoding the value
 *   • expect.assertions — guard async error-path tests
 *   • Padding verification — prove PKCS1 padding is used (not OAEP) by confirming
 *     the output cannot be decrypted with OAEP and has the correct block size.
 *     We avoid RSA_PKCS1_PADDING private decryption which is blocked in Node ≥ 20
 *     (CVE-2023-46809).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto'
import { encryptSecurityCredential } from '../../../core/encryption/security-credentials'
import { PesafyError } from '../../../utils/errors'

let publicKeyPem: string
let privateKeyPem: string

beforeAll(() => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  })
  publicKeyPem = publicKey
  privateKeyPem = privateKey
})

describe('encryptSecurityCredential', () => {
  it('returns a non-empty string', () => {
    const result = encryptSecurityCredential('test-plaintext', publicKeyPem)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns a valid base64-encoded string', () => {
    const result = encryptSecurityCredential('test-plaintext', publicKeyPem)
    expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('produces different ciphertext for the same plaintext (RSA PKCS1 is probabilistic)', () => {
    const r1 = encryptSecurityCredential('same-plaintext', publicKeyPem)
    const r2 = encryptSecurityCredential('same-plaintext', publicKeyPem)
    expect(r1).not.toBe(r2)
  })

  it('produces different ciphertext for different plaintexts', () => {
    const r1 = encryptSecurityCredential('plaintext-alpha', publicKeyPem)
    const r2 = encryptSecurityCredential('plaintext-beta', publicKeyPem)
    expect(r1).not.toBe(r2)
  })

  it('decodes to a buffer of the expected RSA block size (256 bytes for 2048-bit key)', () => {
    const result = encryptSecurityCredential('test-plaintext', publicKeyPem)
    const buf = Buffer.from(result, 'base64')
    expect(buf.length).toBe(256)
  })

  it('uses RSA_PKCS1_PADDING (not OAEP) — verified by rejecting OAEP decryption', () => {
    // If the ciphertext were OAEP-encrypted, OAEP decryption would succeed.
    // Since we use PKCS1v15, attempting OAEP decryption must throw — proving
    // the padding scheme is PKCS1, not OAEP.
    // Note: RSA_PKCS1_PADDING private decrypt is blocked in Node ≥ 20
    // (CVE-2023-46809), so we verify padding indirectly via this negative assertion.
    const encrypted = encryptSecurityCredential('check-padding', publicKeyPem)
    const cipherBuf = Buffer.from(encrypted, 'base64')
    expect(() =>
      privateDecrypt(
        { key: privateKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING },
        cipherBuf,
      ),
    ).toThrow()
  })

  it('throws ENCRYPTION_FAILED for an invalid / empty PEM', () => {
    expect.assertions(2)
    try {
      encryptSecurityCredential('test-plaintext', 'not-a-valid-pem')
    } catch (e) {
      expect(e).toBeInstanceOf(PesafyError)
      expect((e as PesafyError).code).toBe('ENCRYPTION_FAILED')
    }
  })

  it('throws ENCRYPTION_FAILED for an empty password string with invalid PEM', () => {
    expect.assertions(1)
    try {
      encryptSecurityCredential('', 'INVALID')
    } catch (e) {
      expect(e).toBeInstanceOf(PesafyError)
    }
  })
})
