// 📁 PATH: src/__tests__/mpesa/reversal/types.test.ts
import { describe, expect, it } from "vite-plus/test";
import {
  getReversalConversationId,
  getReversalTransactionId,
  isReversalSuccess,
} from "../../../mpesa/reversal/types";
import type { ReversalResult } from "../../../mpesa/reversal/types";

const SUCCESS_RESULT: ReversalResult = {
  Result: {
    ResultType: "0",
    ResultCode: 0,
    ResultDesc: "The service request is processed successfully.",
    OriginatorConversationID: "OC-001",
    ConversationID: "AG_20231001_001",
    TransactionID: "QKA81LK5CY",
  },
};

const FAILURE_RESULT: ReversalResult = {
  Result: {
    ResultType: "0",
    ResultCode: 2001,
    ResultDesc: "The initiator information is invalid.",
    OriginatorConversationID: "OC-002",
    ConversationID: "AG_20231001_002",
    TransactionID: "OAK0000000",
  },
};

describe("isReversalSuccess", () => {
  it("returns true for ResultCode 0", () => {
    expect(isReversalSuccess(SUCCESS_RESULT)).toBe(true);
  });

  it("returns false for non-zero ResultCode", () => {
    expect(isReversalSuccess(FAILURE_RESULT)).toBe(false);
  });
});

describe("getReversalTransactionId", () => {
  it("returns TransactionID for success", () => {
    expect(getReversalTransactionId(SUCCESS_RESULT)).toBe("QKA81LK5CY");
  });

  it("returns null when TransactionID is undefined", () => {
    const result: ReversalResult = {
      ...SUCCESS_RESULT,
      Result: { ...SUCCESS_RESULT.Result, TransactionID: undefined as unknown as string },
    };
    expect(getReversalTransactionId(result)).toBeNull();
  });
});

describe("getReversalConversationId", () => {
  it("returns ConversationID", () => {
    expect(getReversalConversationId(SUCCESS_RESULT)).toBe("AG_20231001_001");
  });
});
