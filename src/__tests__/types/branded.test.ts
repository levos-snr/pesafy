// 📁 PATH: src/__tests__/types/branded.test.ts
import { describe, expect, it } from "vite-plus/test";
import {
  err,
  ok,
  toKesAmount,
  toMsisdn,
  toNonEmpty,
  toPaybill,
  toShortCode,
  toTill,
} from "../../types/branded";

// ── KesAmount ────────────────────────────────────────────────────────────────

describe("toKesAmount", () => {
  it("returns the value for a valid whole number", () => {
    expect(toKesAmount(100)).toBe(100);
  });

  it("rounds fractional amounts", () => {
    expect(toKesAmount(99.7)).toBe(100);
  });

  it("accepts 1 (minimum)", () => {
    expect(toKesAmount(1)).toBe(1);
  });

  it("throws TypeError for 0", () => {
    expect(() => toKesAmount(0)).toThrow(TypeError);
  });

  it("throws TypeError for negative values", () => {
    expect(() => toKesAmount(-1)).toThrow(TypeError);
  });

  it("throws TypeError for NaN", () => {
    expect(() => toKesAmount(NaN)).toThrow(TypeError);
  });

  it("throws TypeError for Infinity", () => {
    expect(() => toKesAmount(Infinity)).toThrow(TypeError);
  });

  it("throws TypeError when value rounds to 0", () => {
    expect(() => toKesAmount(0.4)).toThrow(TypeError);
  });
});

// ── MsisdnKE ─────────────────────────────────────────────────────────────────

describe("toMsisdn", () => {
  it("accepts 254XXXXXXXXX (12 digits)", () => {
    expect(toMsisdn("254712345678")).toBe("254712345678");
  });

  it("normalises 07XXXXXXXX to 254XXXXXXXXX", () => {
    expect(toMsisdn("0712345678")).toBe("254712345678");
  });

  it("normalises 9-digit to 254XXXXXXXXX", () => {
    expect(toMsisdn("712345678")).toBe("254712345678");
  });

  it("strips non-digit characters before normalising", () => {
    expect(toMsisdn("+254712345678")).toBe("254712345678");
  });

  it("throws TypeError for invalid short number", () => {
    expect(() => toMsisdn("12345")).toThrow(TypeError);
  });

  it("throws TypeError for empty string", () => {
    expect(() => toMsisdn("")).toThrow(TypeError);
  });
});

// ── Shortcode helpers ─────────────────────────────────────────────────────────

describe("toPaybill", () => {
  it("converts number to string", () => {
    expect(toPaybill(174379)).toBe("174379");
  });

  it("passes string through", () => {
    expect(toPaybill("174379")).toBe("174379");
  });
});

describe("toTill", () => {
  it("converts number to string", () => {
    expect(toTill(600000)).toBe("600000");
  });

  it("passes string through", () => {
    expect(toTill("600000")).toBe("600000");
  });
});

describe("toShortCode", () => {
  it("converts number to string", () => {
    expect(toShortCode(123456)).toBe("123456");
  });

  it("passes string through", () => {
    expect(toShortCode("123456")).toBe("123456");
  });
});

// ── NonEmptyString ────────────────────────────────────────────────────────────

describe("toNonEmpty", () => {
  it("returns the string if non-empty", () => {
    expect(toNonEmpty("hello")).toBe("hello");
  });

  it("throws TypeError for empty string", () => {
    expect(() => toNonEmpty("")).toThrow(TypeError);
  });

  it("throws TypeError for whitespace-only string", () => {
    expect(() => toNonEmpty("   ")).toThrow(TypeError);
  });
});

// ── Result type ───────────────────────────────────────────────────────────────

describe("ok", () => {
  it("creates an Ok result with ok=true", () => {
    const result = ok("value");
    expect(result.ok).toBe(true);
  });

  it("wraps the data correctly", () => {
    const result = ok({ id: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ id: 1 });
  });

  it("works with null data", () => {
    const result = ok(null);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });
});

describe("err", () => {
  it("creates an Err result with ok=false", () => {
    const result = err(new Error("boom"));
    expect(result.ok).toBe(false);
  });

  it("wraps the error correctly", () => {
    const error = new Error("something wrong");
    const result = err(error);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(error);
  });
});
