// src/core/encryption/security-credentials.ts

import { constants, publicEncrypt } from 'node:crypto'
import { PesafyError } from '../../utils/errors'

export function encryptSecurityCredential(
  initiatorPassword: string,
  certificatePem: string,
): string {
  try {
    const passwordBuffer = Buffer.from(initiatorPassword, 'utf-8')

    const encrypted = publicEncrypt(
      {
        key: certificatePem,
        // RSA_PKCS1_PADDING = 1  (NOT RSA_PKCS1_OAEP_PADDING = 4)
        padding: constants.RSA_PKCS1_PADDING,
      },
      passwordBuffer,
    )

    return encrypted.toString('base64')
  } catch (error) {
    throw new PesafyError({
      code: 'ENCRYPTION_FAILED',
      message:
        'Failed to encrypt security credential. ' +
        'Ensure the certificate PEM is valid and matches the environment (sandbox/production).',
      cause: error,
    })
  }
}
