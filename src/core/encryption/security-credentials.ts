/**
 * Security credential encryption for B2C, B2B, Reversal APIs
 * Uses RSA with PKCS#1.5 padding per Daraja API spec
 * Download certificates from: https://developer.safaricom.co.ke/APIs
 */

import { publicEncrypt } from "node:crypto";
import { PesafyError } from "../../utils/errors";

/** Encrypt initiator password with M-Pesa public certificate (PEM format) */
export function encryptSecurityCredential(
  initiatorPassword: string,
  certificatePem: string
): string {
  try {
    const passwordBuffer = Buffer.from(initiatorPassword, "utf-8");
    const encrypted = publicEncrypt(
      {
        key: certificatePem,
        padding: 1, // RSA_PKCS1_PADDING
      },
      passwordBuffer
    );
    return encrypted.toString("base64");
  } catch (error) {
    throw new PesafyError({
      code: "ENCRYPTION_FAILED",
      message: "Failed to encrypt security credential",
      cause: error,
    });
  }
}
