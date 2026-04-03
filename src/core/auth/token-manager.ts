// src/core/auth/token-manager.ts

import { PesafyError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import { AUTH_ERROR_CODES } from './types'
import type { TokenResponse } from './types'

/** Refresh the token this many seconds before it actually expires */
const TOKEN_BUFFER_SECONDS = 60

export class TokenManager {
  private readonly consumerKey: string
  private readonly consumerSecret: string
  private readonly baseUrl: string

  private cachedToken: string | null = null
  private tokenExpiresAt = 0 // Unix seconds

  constructor(consumerKey: string, consumerSecret: string, baseUrl: string) {
    this.consumerKey = consumerKey
    this.consumerSecret = consumerSecret
    this.baseUrl = baseUrl
  }

  private getBasicAuthHeader(): string {
    // Daraja spec: Base64(consumerKey:consumerSecret)
    const credentials = `${this.consumerKey}:${this.consumerSecret}`
    const encoded = Buffer.from(credentials, 'utf-8').toString('base64')
    return `Basic ${encoded}`
  }

  /**
   * Maps Daraja-specific auth error codes (400.008.01 / 400.008.02) to
   * descriptive PesafyError messages so callers get actionable feedback.
   *
   * Always throws — the `never` return type signals this to TypeScript.
   */
  private mapAuthError(error: unknown): never {
    if (error instanceof PesafyError) {
      // If we already enriched this error, re-throw it as-is.
      if (error.code === 'AUTH_FAILED') throw error

      const raw = error.response as Record<string, unknown> | null | undefined
      if (raw && typeof raw === 'object') {
        // Daraja sends the code in `errorCode`; guard against both spellings.
        const errorCode = (raw['errorCode'] ?? raw['error_code']) as string | undefined

        if (errorCode === AUTH_ERROR_CODES.INVALID_AUTH_TYPE) {
          throw new PesafyError({
            code: 'AUTH_FAILED',
            message:
              'Invalid authentication type (400.008.01). ' +
              'Use Basic authentication: Authorization: Basic <Base64(consumerKey:consumerSecret)>.',
            ...(error.statusCode !== undefined && { statusCode: error.statusCode }),
            response: error.response,
          })
        }

        if (errorCode === AUTH_ERROR_CODES.INVALID_GRANT_TYPE) {
          throw new PesafyError({
            code: 'AUTH_FAILED',
            message:
              'Invalid grant type (400.008.02). ' +
              'Set grant_type=client_credentials in the request query parameters.',
            ...(error.statusCode !== undefined && { statusCode: error.statusCode }),
            response: error.response,
          })
        }
      }

      throw error
    }

    // Non-PesafyError (e.g. raw network exception) — re-throw unchanged.
    throw error
  }

  /**
   * Returns a valid access token, fetching a new one when the cached token
   * is absent or within TOKEN_BUFFER_SECONDS of expiry.
   *
   * Daraja endpoint: GET /oauth/v1/generate?grant_type=client_credentials
   * Auth:            Basic Base64(consumerKey:consumerSecret)
   * Token lifetime:  3599 seconds (Daraja docs)
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now() / 1000

    if (this.cachedToken && this.tokenExpiresAt > now + TOKEN_BUFFER_SECONDS) {
      return this.cachedToken
    }

    // Daraja Authorization API — GET with Basic Auth + grant_type query param
    const url = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`

    try {
      const response = await httpRequest<TokenResponse>(url, {
        method: 'GET',
        headers: {
          Authorization: this.getBasicAuthHeader(),
        },
      })

      const { access_token, expires_in } = response.data

      if (!access_token) {
        throw new PesafyError({
          code: 'AUTH_FAILED',
          message:
            'Daraja did not return an access token. ' +
            'Verify your consumer key and consumer secret.',
          response: response.data,
        })
      }

      this.cachedToken = access_token
      // expires_in is 3599 per Daraja docs; fall back to 3600 if absent.
      this.tokenExpiresAt = now + (expires_in ?? 3600)

      return this.cachedToken
    } catch (error) {
      // mapAuthError always throws — satisfies TypeScript's control-flow analysis.
      return this.mapAuthError(error)
    }
  }

  /** Force token refresh on the next call (e.g. after a 401 response) */
  clearCache(): void {
    this.cachedToken = null
    this.tokenExpiresAt = 0
  }
}
