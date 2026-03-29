// 📁 PATH: src/__tests__/mpesa/account-balance/types.test.ts
import { describe, expect, it } from "vite-plus/test";
import {
  getAccountBalanceParam,
  isAccountBalanceSuccess,
  parseAccountBalance,
} from "../../../mpesa/account-balance/types";
import type { AccountBalanceResult } from "../../../mpesa/account-balance/types";

const SUCCESS_RESULT: AccountBalanceResult = {
  Result: {
    ResultType: "0",
    ResultCode: 0,
    ResultDesc: "The service request is processed successfully.",
    OriginatorConversationID: "OC-001",
    ConversationID: "AG_20231001_001",
    TransactionID: "QKA81LK5CY",
    ResultParameters: {
      ResultParameter: [
        { Key: "AccountBalance", Value: "Working Account|KES|500.00|Utility Account|KES|0.00" },
      ],
    },
  },
};

const FAILURE_RESULT: AccountBalanceResult = {
  Result: {
    ResultType: "0",
    ResultCode: 2001,
    ResultDesc: "The initiator information is invalid.",
    OriginatorConversationID: "OC-002",
    ConversationID: "AG_20231001_002",
    TransactionID: "OAK0000000",
  },
};

describe("parseAccountBalance", () => {
  it("parses a single account balance string", () => {
    const parsed = parseAccountBalance("Working Account|KES|500.00");
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({ name: "Working Account", currency: "KES", amount: "500.00" });
  });

  it("parses multiple accounts from a single pipe-delimited string", () => {
    const parsed = parseAccountBalance("Working Account|KES|500.00|Utility Account|KES|0.00");
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.name).toBe("Working Account");
    expect(parsed[1]?.name).toBe("Utility Account");
  });

  it("returns empty array for empty string", () => {
    expect(parseAccountBalance("")).toHaveLength(0);
  });

  it("returns empty array when string does not have complete triplets", () => {
    // 2 parts instead of 3
    expect(parseAccountBalance("Working Account|KES")).toHaveLength(0);
  });

  it("handles extra whitespace in account names", () => {
    const parsed = parseAccountBalance(" Working Account |KES|500.00");
    expect(parsed[0]?.name).toBe("Working Account");
  });
});

describe("isAccountBalanceSuccess", () => {
  it("returns true for ResultCode 0", () => {
    expect(isAccountBalanceSuccess(SUCCESS_RESULT)).toBe(true);
  });

  it("returns false for non-zero ResultCode", () => {
    expect(isAccountBalanceSuccess(FAILURE_RESULT)).toBe(false);
  });
});

describe("getAccountBalanceParam", () => {
  it("returns the value for an existing key", () => {
    const val = getAccountBalanceParam(SUCCESS_RESULT, "AccountBalance");
    expect(val).toContain("Working Account");
  });

  it("returns undefined for a missing key", () => {
    expect(getAccountBalanceParam(SUCCESS_RESULT, "NonExistentKey")).toBeUndefined();
  });

  it("returns undefined when ResultParameters are absent", () => {
    expect(getAccountBalanceParam(FAILURE_RESULT, "AccountBalance")).toBeUndefined();
  });
});
