// 📁 PATH: src/types/branded.ts

/**
 * Branded primitive types for compile-time safety.
 *
 * Prevents common bugs like passing a phone number where an amount is expected,
 * or mixing sandbox and production shortcodes.
 *
 * @example
 * // ✅ Correct
 * const amount: KesAmount = toKesAmount(100);
 * const phone: MsisdnKE = toMsisdn("0712345678");
 *
 * // ❌ Compile error — plain number is not KesAmount
 * const bad: KesAmount = 100;
 */

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ── Money ─────────────────────────────────────────────────────────────────────

/**
 * A whole-number KES amount (Kenyan Shillings).
 * M-PESA only supports whole numbers — fractional shillings are rejected.
 */
export type KesAmount = Brand<number, "KesAmount">;

/**
 * Creates a validated KesAmount.
 * @throws {TypeError} if amount is not a whole number ≥ 1
 */
export function toKesAmount(value: number): KesAmount {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || rounded < 1) {
    throw new TypeError(`KesAmount must be a whole number ≥ 1, got ${value}`);
  }
  return rounded as KesAmount;
}

// ── Phone numbers ─────────────────────────────────────────────────────────────

/**
 * A validated Kenyan MSISDN in Daraja format: 254XXXXXXXXX (12 digits).
 */
export type MsisdnKE = Brand<string, "MsisdnKE">;

/**
 * Creates a validated MsisdnKE from any common Kenyan phone format.
 */
export function toMsisdn(phone: string): MsisdnKE {
  const digits = phone.replace(/\D/g, "");
  let normalised: string;

  if (digits.startsWith("254") && digits.length === 12) {
    normalised = digits;
  } else if (digits.startsWith("0") && digits.length === 10) {
    normalised = `254${digits.slice(1)}`;
  } else if (digits.length === 9) {
    normalised = `254${digits}`;
  } else {
    throw new TypeError(
      `Cannot normalise "${phone}" to 254XXXXXXXXX. Use 07XX…, 2547XX…, or +2547XX….`,
    );
  }

  if (normalised.length !== 12) {
    throw new TypeError(`Phone "${phone}" normalised to "${normalised}" — expected 12 digits.`);
  }
  return normalised as MsisdnKE;
}

// ── Shortcodes ────────────────────────────────────────────────────────────────

/** M-PESA Paybill shortcode */
export type PaybillCode = Brand<string, "PaybillCode">;

/** M-PESA Till/Buy-Goods shortcode */
export type TillCode = Brand<string, "TillCode">;

/** Any M-PESA shortcode (paybill, till, or B2C) */
export type ShortCode = PaybillCode | TillCode | Brand<string, "ShortCode">;

export function toPaybill(code: string | number): PaybillCode {
  return String(code) as PaybillCode;
}
export function toTill(code: string | number): TillCode {
  return String(code) as TillCode;
}
export function toShortCode(code: string | number): ShortCode {
  return String(code) as ShortCode;
}

// ── Transaction IDs ───────────────────────────────────────────────────────────

/** M-PESA receipt number, e.g. "OEI2AK4XXXX" */
export type MpesaReceiptNumber = Brand<string, "MpesaReceiptNumber">;

/** Daraja ConversationID */
export type ConversationID = Brand<string, "ConversationID">;

/** Daraja OriginatorConversationID */
export type OriginatorConversationID = Brand<string, "OriginatorConversationID">;

/** Daraja CheckoutRequestID (STK Push) */
export type CheckoutRequestID = Brand<string, "CheckoutRequestID">;

// ── Result type ───────────────────────────────────────────────────────────────

/**
 * A discriminated union result — either Ok<T> or Err<E>.
 * Prefer this over throwing in application-level code.
 *
 * @example
 * const result = await mpesa.stkPushSafe({ ... });
 * if (result.ok) {
 *   console.log(result.data.CheckoutRequestID);
 * } else {
 *   console.error(result.error.code, result.error.message);
 * }
 */
export type Result<T, E = import("../utils/errors").PesafyError> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ── Utility types ─────────────────────────────────────────────────────────────

/** Makes all properties deeply readonly */
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

/** Strict pick — only allows known keys */
export type StrictPick<T, K extends keyof T> = Pick<T, K>;

/** Non-empty string */
export type NonEmptyString = Brand<string, "NonEmptyString">;
export function toNonEmpty(s: string): NonEmptyString {
  if (!s.trim()) throw new TypeError("String must not be empty");
  return s as NonEmptyString;
}
