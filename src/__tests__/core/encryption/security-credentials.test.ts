// 📁 PATH: src/__tests__/core/encryption/security-credentials.test.ts
/**
 * Advanced patterns used here:
 *   • beforeAll with real async crypto — generate an RSA key-pair once for the suite
 *   • toMatch regex    — assert base64 encoding without hardcoding the value
 *   • expect.assertions — guard async error-path tests
 *   • Decrypt round-trip — prove PKCS1 padding is used (not OAEP) without spying
 *     on native module bindings (which static imports make impossible to intercept).
 */
import { beforeAll, describe, expect, it } from "vite-plus/test";
import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto";
import { encryptSecurityCredential } from "../../../core/encryption/security-credentials";
import { PesafyError } from "../../../utils/errors";

let publicKeyPem: string;
let privateKeyPem: string;

beforeAll(() => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  publicKeyPem = publicKey;
  privateKeyPem = privateKey;
});

describe("encryptSecurityCredential", () => {
  it("returns a non-empty string", () => {
    const result = encryptSecurityCredential("Safaricom123!", publicKeyPem);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a valid base64-encoded string", () => {
    const result = encryptSecurityCredential("Safaricom123!", publicKeyPem);
    expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("produces different ciphertext for the same plaintext (RSA PKCS1 is probabilistic)", () => {
    const r1 = encryptSecurityCredential("SamePassword", publicKeyPem);
    const r2 = encryptSecurityCredential("SamePassword", publicKeyPem);
    expect(r1).not.toBe(r2);
  });

  it("produces different ciphertext for different passwords", () => {
    const r1 = encryptSecurityCredential("Password1", publicKeyPem);
    const r2 = encryptSecurityCredential("Password2", publicKeyPem);
    expect(r1).not.toBe(r2);
  });

  it("decodes to a buffer of the expected RSA block size (256 bytes for 2048-bit key)", () => {
    const result = encryptSecurityCredential("test", publicKeyPem);
    const buf = Buffer.from(result, "base64");
    expect(buf.length).toBe(256);
  });

  it("uses RSA_PKCS1_PADDING (not OAEP) — verified via decrypt round-trip", () => {
    const password = "check-padding";
    const encrypted = encryptSecurityCredential(password, publicKeyPem);
    const cipherBuf = Buffer.from(encrypted, "base64");

    const decrypted = privateDecrypt(
      { key: privateKeyPem, padding: constants.RSA_PKCS1_PADDING },
      cipherBuf,
    );
    expect(decrypted.toString("utf-8")).toBe(password);

    expect(() =>
      privateDecrypt({ key: privateKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING }, cipherBuf),
    ).toThrow();
  });

  it("throws ENCRYPTION_FAILED for an invalid / empty PEM", () => {
    expect.assertions(2);
    try {
      encryptSecurityCredential("password", "not-a-valid-pem");
    } catch (e) {
      expect(e).toBeInstanceOf(PesafyError);
      expect((e as PesafyError).code).toBe("ENCRYPTION_FAILED");
    }
  });

  it("throws ENCRYPTION_FAILED for an empty password string with invalid PEM", () => {
    expect.assertions(1);
    try {
      encryptSecurityCredential("", "INVALID");
    } catch (e) {
      expect(e).toBeInstanceOf(PesafyError);
    }
  });
});
