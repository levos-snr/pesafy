// 📁 PATH: src/__tests__/utils/errors.test.ts
/**
 * Advanced patterns used here:
 *   • expect.extend   — custom `toBeApiError(code)` matcher
 *   • it.each         — parametrized test over every valid error code
 *   • toMatchSnapshot — stable JSON shape assertion
 */
import { beforeAll, describe, expect, it } from "vite-plus/test";
import {
  createError,
  ERROR_CODES,
  isPesafyError,
  PesafyError,
  type ErrorCode,
} from "../../utils/errors";

// ── Custom matcher ────────────────────────────────────────────────────────────
// `expect.extend` lets you write domain-specific assertions that read like
// English and produce clear failure messages.

interface CustomMatchers<R = unknown> {
  toBeApiError(code: ErrorCode): R;
  toBeRetryable(): R;
}

declare module "vite-plus/test" {
  interface Assertion<T> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

beforeAll(() => {
  expect.extend({
    toBeApiError(received: unknown, code: ErrorCode) {
      const pass = received instanceof PesafyError && received.code === code;
      return {
        pass,
        message: () =>
          pass
            ? `Expected error NOT to be a PesafyError with code "${code}"`
            : `Expected a PesafyError with code "${code}", got: ${
                received instanceof PesafyError ? `PesafyError(${received.code})` : String(received)
              }`,
      };
    },

    toBeRetryable(received: unknown) {
      const pass = received instanceof PesafyError && received.retryable === true;
      return {
        pass,
        message: () =>
          pass
            ? "Expected error NOT to be retryable"
            : `Expected error to be retryable. Got retryable=${
                received instanceof PesafyError ? received.retryable : "N/A"
              }`,
      };
    },
  });
});

// ── PesafyError construction ──────────────────────────────────────────────────
describe("PesafyError", () => {
  it("is an instance of Error", () => {
    const e = new PesafyError({ code: "API_ERROR", message: "bad" });
    expect(e).toBeInstanceOf(Error);
  });

  it("has name 'PesafyError'", () => {
    expect(new PesafyError({ code: "API_ERROR", message: "x" }).name).toBe("PesafyError");
  });

  it("stores code, message, statusCode, requestId", () => {
    const e = new PesafyError({
      code: "HTTP_ERROR",
      message: "not found",
      statusCode: 404,
      requestId: "req-abc",
    });
    expect(e.code).toBe("HTTP_ERROR");
    expect(e.message).toBe("not found");
    expect(e.statusCode).toBe(404);
    expect(e.requestId).toBe("req-abc");
  });

  it("stores cause", () => {
    const cause = new TypeError("inner");
    const e = new PesafyError({ code: "NETWORK_ERROR", message: "wrap", cause });
    expect(e.cause).toBe(cause);
  });

  it("stores raw response body", () => {
    const raw = { requestId: "x", errorMessage: "bad creds" };
    const e = new PesafyError({ code: "AUTH_FAILED", message: "auth", response: raw });
    expect(e.response).toEqual(raw);
  });

  // ── Custom matchers ───────────────────────────────────────────────────────
  it("passes the toBeApiError matcher", () => {
    const e = new PesafyError({ code: "VALIDATION_ERROR", message: "v" });
    expect(e).toBeApiError("VALIDATION_ERROR");
  });

  it("fails toBeApiError when code differs", () => {
    const e = new PesafyError({ code: "API_ERROR", message: "a" });
    expect(e).not.toBeApiError("AUTH_FAILED");
  });

  // ── Retryable flag ────────────────────────────────────────────────────────
  it.each([
    ["NETWORK_ERROR", true],
    ["TIMEOUT", true],
    ["RATE_LIMITED", true],
    ["REQUEST_FAILED", true],
    ["VALIDATION_ERROR", false],
    ["API_ERROR", false],
    ["AUTH_FAILED", false],
    ["INVALID_CREDENTIALS", false],
  ] as [ErrorCode, boolean][])("retryable is %s for code %s", (code, expected) => {
    const e = new PesafyError({ code, message: "t" });
    expect(e.retryable).toBe(expected);
  });

  it("respects explicit retryable override", () => {
    const e = new PesafyError({
      code: "API_ERROR",
      message: "x",
      retryable: true,
    });
    expect(e).toBeRetryable();
  });

  // ── Derived flags ─────────────────────────────────────────────────────────
  it("isValidation is true for VALIDATION_ERROR", () => {
    expect(new PesafyError({ code: "VALIDATION_ERROR", message: "v" }).isValidation).toBe(true);
  });

  it("isAuth is true for AUTH_FAILED", () => {
    expect(new PesafyError({ code: "AUTH_FAILED", message: "a" }).isAuth).toBe(true);
  });

  it("isAuth is true for INVALID_CREDENTIALS", () => {
    expect(new PesafyError({ code: "INVALID_CREDENTIALS", message: "a" }).isAuth).toBe(true);
  });

  // ── toJSON / snapshot ─────────────────────────────────────────────────────
  it("toJSON serialises to a stable shape", () => {
    const e = new PesafyError({
      code: "API_ERROR",
      message: "snapshot me",
      statusCode: 400,
      requestId: "req-snap",
    });
    expect(e.toJSON()).toMatchSnapshot();
  });

  it("toJSON omits undefined fields gracefully", () => {
    const json = new PesafyError({ code: "TIMEOUT", message: "slow" }).toJSON();
    expect(json.name).toBe("PesafyError");
    expect(json.code).toBe("TIMEOUT");
    expect(json.statusCode).toBeUndefined();
  });
});

// ── ERROR_CODES constant ──────────────────────────────────────────────────────
describe("ERROR_CODES", () => {
  it("is a non-empty readonly array", () => {
    expect(ERROR_CODES.length).toBeGreaterThan(0);
  });

  // Parametrized: every code must be a non-empty uppercase string
  it.each(ERROR_CODES as unknown as string[])(
    "code '%s' is a non-empty uppercase string",
    (code) => {
      expect(code).toBeTruthy();
      expect(code).toBe(code.toUpperCase());
    },
  );
});

// ── createError factory ───────────────────────────────────────────────────────
describe("createError", () => {
  it("returns a PesafyError instance", () => {
    expect(createError({ code: "API_ERROR", message: "x" })).toBeInstanceOf(PesafyError);
  });

  it("uses the custom toBeApiError matcher via factory", () => {
    expect(createError({ code: "RATE_LIMITED", message: "slow" })).toBeApiError("RATE_LIMITED");
  });
});

// ── isPesafyError type guard ──────────────────────────────────────────────────
describe("isPesafyError", () => {
  it("returns true for PesafyError", () => {
    expect(isPesafyError(new PesafyError({ code: "TIMEOUT", message: "t" }))).toBe(true);
  });

  it("returns false for a plain Error", () => {
    expect(isPesafyError(new Error("boom"))).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPesafyError(null)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isPesafyError("VALIDATION_ERROR")).toBe(false);
  });
});
