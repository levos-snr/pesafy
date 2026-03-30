// 📁 PATH: src/mpesa/account-balance/types.ts

/**
 * Account Balance Query types
 *
 * API: POST /mpesa/accountbalance/v1/query
 *
 * Queries the current balance of an M-PESA shortcode.
 * This is ASYNCHRONOUS — final results are POSTed to your ResultURL.
 *
 * Required org portal role: "Account Balance ORG API initiator"
 *
 * Ref: Account Balance — Daraja Developer Portal
 */

// ── Request ───────────────────────────────────────────────────────────────────

export interface AccountBalanceRequest {
  /**
   * Your business shortcode from which balance is queried.
   * Daraja field: PartyA
   */
  partyA: string

  /**
   * Type of the PartyA identifier.
   *   "1" = MSISDN
   *   "2" = Till Number
   *   "4" = Organisation ShortCode (most common — Paybill/B2C)
   * Daraja field: IdentifierType
   */
  identifierType: '1' | '2' | '4'

  /**
   * URL where Safaricom POSTs the balance result.
   * Must be publicly accessible. HTTPS required in production.
   * Daraja field: ResultURL
   */
  resultUrl: string

  /**
   * URL Safaricom calls when the request times out.
   * Daraja field: QueueTimeOutURL
   */
  queueTimeOutUrl: string

  /**
   * Short remarks (up to 100 characters).
   * Daraja field: Remarks
   */
  remarks?: string
}

// ── Synchronous acknowledgement ───────────────────────────────────────────────

export interface AccountBalanceResponse {
  OriginatorConversationID: string
  ConversationID: string
  /** "0" = request accepted */
  ResponseCode: string
  ResponseDescription: string
}

// ── Async result (POSTed to ResultURL) ───────────────────────────────────────

/**
 * Balance data for a single account type.
 *
 * M-PESA shortcodes can have multiple account types, each returned separately.
 * Format: "AccountName|Currency|Amount"
 * Example: "Working Account|KES|1450.00|KES|0.00|KES|0.00"
 */
export interface AccountBalanceData {
  /** Raw pipe-delimited string from Daraja */
  rawBalance: string
  /** Parsed accounts */
  accounts: ParsedAccount[]
}

export interface ParsedAccount {
  name: string
  currency: string
  /** Amount as a string (Daraja sends decimals) */
  amount: string
}

export interface AccountBalanceResult {
  Result: {
    ResultType: string
    /** 0 = success */
    ResultCode: number
    ResultDesc: string
    OriginatorConversationID: string
    ConversationID: string
    TransactionID: string
    ResultParameters?: {
      ResultParameter: Array<{ Key: string; Value: string | number }>
    }
    ReferenceData?: {
      ReferenceItem:
        | { Key: string; Value: string }
        | Array<{ Key: string; Value: string }>
    }
  }
}

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Parses the raw Daraja balance string into structured account objects.
 *
 * Daraja returns balance as: "Working Account|KES|500.00|Utility Account|KES|0.00"
 * (each account is 3 pipe-separated fields repeated).
 */
export function parseAccountBalance(raw: string): ParsedAccount[] {
  const parts = raw.split('|')
  const accounts: ParsedAccount[] = []

  for (let i = 0; i + 2 < parts.length; i += 3) {
    const name = parts[i]?.trim()
    const currency = parts[i + 1]?.trim()
    const amount = parts[i + 2]?.trim()
    if (name && currency && amount !== undefined) {
      accounts.push({ name, currency, amount })
    }
  }
  return accounts
}

/**
 * Extracts the account balance result parameter by key.
 */
export function getAccountBalanceParam(
  result: AccountBalanceResult,
  key: string,
): string | number | undefined {
  const params = result.Result.ResultParameters?.ResultParameter
  if (!params) return undefined
  const arr = Array.isArray(params) ? params : [params]
  return arr.find((p) => p.Key === key)?.Value
}

/**
 * Returns true if the Account Balance result is successful.
 */
export function isAccountBalanceSuccess(result: AccountBalanceResult): boolean {
  return result.Result.ResultCode === 0
}
