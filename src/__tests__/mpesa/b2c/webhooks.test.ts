// 📁 PATH: src/__tests__/mpesa/b2c/webhooks.test.ts
import { describe, expect, it } from "vite-plus/test";
import {
  getB2CAmount,
  getB2CConversationId,
  getB2CCurrency,
  getB2COriginatorConversationId,
  getB2CReceiverPublicName,
  getB2CResultDesc,
  getB2CResultParam,
  getB2CTransactionId,
  isB2CFailure,
  isB2CResult,
  isB2CSuccess,
} from "../../../mpesa/b2c/webhooks";
import type { B2CResult } from "../../../mpesa/b2c/types";

const SUCCESS_RESULT: B2CResult = {
  Result: {
    ResultType: "0",
    ResultCode: 0,
    ResultDesc: "The service request is processed successfully.",
    OriginatorConversationID: "OC-001",
    ConversationID: "AG_20231001_001",
    TransactionID: "QKA81LK5CY",
    ResultParameters: {
      ResultParameter: [
        { Key: "Amount", Value: 1000 },
        { Key: "ReceiverPartyPublicName", Value: "John Doe" },
        { Key: "Currency", Value: "KES" },
        { Key: "TransCompletedTime", Value: "20231001120000" },
        { Key: "DebitPartyCharges", Value: "" },
      ],
    },
  },
};

const FAILURE_RESULT: B2CResult = {
  Result: {
    ResultType: "0",
    ResultCode: 2001,
    ResultDesc: "The initiator information is invalid.",
    OriginatorConversationID: "OC-002",
    ConversationID: "AG_20231001_002",
    TransactionID: "OAK0000000",
  },
};

describe("isB2CResult", () => {
  it("returns true for a valid B2CResult", () => {
    expect(isB2CResult(SUCCESS_RESULT)).toBe(true);
  });

  it("returns true for a failure result", () => {
    expect(isB2CResult(FAILURE_RESULT)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isB2CResult(null)).toBe(false);
  });

  it("returns false for object missing Result", () => {
    expect(isB2CResult({ foo: "bar" })).toBe(false);
  });

  it("returns false for object with non-numeric ResultCode", () => {
    expect(isB2CResult({ Result: { ResultCode: "0", ConversationID: "x" } })).toBe(false);
  });
});

describe("isB2CSuccess", () => {
  it("returns true when ResultCode is 0", () => {
    expect(isB2CSuccess(SUCCESS_RESULT)).toBe(true);
  });

  it("returns false when ResultCode is non-zero", () => {
    expect(isB2CSuccess(FAILURE_RESULT)).toBe(false);
  });
});

describe("isB2CFailure", () => {
  it("returns true when ResultCode is non-zero", () => {
    expect(isB2CFailure(FAILURE_RESULT)).toBe(true);
  });

  it("returns false when ResultCode is 0", () => {
    expect(isB2CFailure(SUCCESS_RESULT)).toBe(false);
  });
});

describe("getB2CTransactionId", () => {
  it("returns TransactionID", () => {
    expect(getB2CTransactionId(SUCCESS_RESULT)).toBe("QKA81LK5CY");
  });

  it("returns the generic OAK transaction ID for failures", () => {
    expect(getB2CTransactionId(FAILURE_RESULT)).toBe("OAK0000000");
  });
});

describe("getB2CConversationId", () => {
  it("returns ConversationID", () => {
    expect(getB2CConversationId(SUCCESS_RESULT)).toBe("AG_20231001_001");
  });
});

describe("getB2COriginatorConversationId", () => {
  it("returns OriginatorConversationID", () => {
    expect(getB2COriginatorConversationId(SUCCESS_RESULT)).toBe("OC-001");
  });
});

describe("getB2CResultDesc", () => {
  it("returns ResultDesc", () => {
    expect(getB2CResultDesc(SUCCESS_RESULT)).toBe("The service request is processed successfully.");
  });
});

describe("getB2CAmount", () => {
  it("returns the Amount as a number", () => {
    expect(getB2CAmount(SUCCESS_RESULT)).toBe(1000);
  });

  it("returns null for failure result with no amount", () => {
    expect(getB2CAmount(FAILURE_RESULT)).toBeNull();
  });
});

describe("getB2CCurrency", () => {
  it("returns KES from result parameters", () => {
    expect(getB2CCurrency(SUCCESS_RESULT)).toBe("KES");
  });

  it("defaults to KES when not in parameters", () => {
    expect(getB2CCurrency(FAILURE_RESULT)).toBe("KES");
  });
});

describe("getB2CReceiverPublicName", () => {
  it("returns ReceiverPartyPublicName", () => {
    expect(getB2CReceiverPublicName(SUCCESS_RESULT)).toBe("John Doe");
  });

  it("returns null for failure result", () => {
    expect(getB2CReceiverPublicName(FAILURE_RESULT)).toBeNull();
  });
});

describe("getB2CResultParam", () => {
  it("returns value by key", () => {
    expect(getB2CResultParam(SUCCESS_RESULT, "Amount")).toBe(1000);
  });

  it("returns undefined for missing key", () => {
    expect(getB2CResultParam(SUCCESS_RESULT, "NonExistentKey")).toBeUndefined();
  });

  it("returns undefined when no ResultParameters", () => {
    expect(getB2CResultParam(FAILURE_RESULT, "Amount")).toBeUndefined();
  });
});
