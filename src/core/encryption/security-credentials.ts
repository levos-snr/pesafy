/**
 * Security credential encryption for Daraja APIs that require it:
 * B2C, B2B, Transaction Status Query, Reversals, Tax Remittance.
 *
 * Algorithm (from Safaricom "Getting Started" docs):
 *   1. Write the unencrypted initiator password into a byte array.
 *   2. Encrypt using the M-Pesa public key certificate:
 *        - RSA algorithm
 *        - PKCS #1 v1.5 padding (NOT OAEP)
 *   3. Base64-encode the encrypted byte array.
 *
 * Certificate source:
 *   Sandbox:    https://developer.safaricom.co.ke (SandboxCertificate.cer)
 *   Production: https://developer.safaricom.co.ke (ProductionCertificate.cer)
 *
 * NOTE: Use the correct certificate for each environment or credentials
 * will be rejected.
 */

import { constants, publicEncrypt } from "node:crypto";
import { PesafyError } from "../../utils/errors";

/**
 * Encrypts `initiatorPassword` with the given PEM certificate and returns
 * the base64-encoded security credential ready to send to Daraja.
 *
 * @param initiatorPassword - Plain-text password set on the M-PESA org portal
 * @param certificatePem    - Full PEM string (the .cer file contents)
 */
export function encryptSecurityCredential(
  initiatorPassword: string,
  certificatePem: string
): string {
  try {
    const passwordBuffer = Buffer.from(initiatorPassword, "utf-8");

    const encrypted = publicEncrypt(
      {
        key: certificatePem,
        // RSA_PKCS1_PADDING = 1  (NOT RSA_PKCS1_OAEP_PADDING = 4)
        padding: constants.RSA_PKCS1_PADDING,
      },
      passwordBuffer
    );

    return encrypted.toString("base64");
  } catch (error) {
    throw new PesafyError({
      code: "ENCRYPTION_FAILED",
      message:
        "Failed to encrypt security credential. " +
        "Ensure the certificate PEM is valid and matches the environment (sandbox/production).",
      cause: error,
    });
  }
}
