// 📁 PATH: src/__tests__/mpesa/c2b/webhooks.test.ts
import { describe, expect, it } from "vite-plus/test";
import {
  acceptC2BValidation,
  acknowledgeC2BConfirmation,
  getC2BAccountRef,
  getC2BAmount,
  getC2BCustomerName,
  getC2BTransactionId,
  isBuyGoodsPayment,
  isC2BPayload,
  isPaybillPayment,
  rejectC2BValidation,
} from "../../../mpesa/c2b/webhooks";
import type { C2BConfirmationPayload, C2BValidationPayload } from "../../../mpesa/c2b/types";

const MOCK_PAYLOAD: C2BValidationPayload = {
  TransactionType: "Pay Bill",
  TransID: "RKTQDM7W6S",
  TransTime: "20191122063845",
  TransAmount: "10",
  BusinessShortCode: "600638",
  BillRefNumber: "account",
  InvoiceNumber: "",
  OrgAccountBalance: "",
  ThirdPartyTransID: "",
  MSISDN: "25470****149",
  FirstName: "John",
  MiddleName: "Doe",
  LastName: "Smith",
};

const BUY_GOODS_PAYLOAD: C2BConfirmationPayload = {
  ...MOCK_PAYLOAD,
  TransactionType: "Buy Goods",
  OrgAccountBalance: "450.00",
};

describe("isC2BPayload", () => {
  it("returns true for a valid C2B payload", () => {
    expect(isC2BPayload(MOCK_PAYLOAD)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isC2BPayload(null)).toBe(false);
  });

  it("returns false for missing TransID", () => {
    const { TransID: _, ...rest } = MOCK_PAYLOAD;
    expect(isC2BPayload(rest)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isC2BPayload("string")).toBe(false);
  });
});

describe("acceptC2BValidation", () => {
  it("returns ResultCode 0", () => {
    expect(acceptC2BValidation().ResultCode).toBe("0");
  });

  it("returns ResultDesc Accepted", () => {
    expect(acceptC2BValidation().ResultDesc).toBe("Accepted");
  });

  it("includes ThirdPartyTransID when provided", () => {
    const resp = acceptC2BValidation("TX123");
    expect(resp.ThirdPartyTransID).toBe("TX123");
  });

  it("omits ThirdPartyTransID when not provided", () => {
    const resp = acceptC2BValidation();
    expect(resp.ThirdPartyTransID).toBeUndefined();
  });
});

describe("rejectC2BValidation", () => {
  it("returns ResultDesc Rejected", () => {
    expect(rejectC2BValidation().ResultDesc).toBe("Rejected");
  });

  it("defaults to C2B00016 when no code provided", () => {
    expect(rejectC2BValidation().ResultCode).toBe("C2B00016");
  });

  it("accepts a specific error code", () => {
    expect(rejectC2BValidation("C2B00012").ResultCode).toBe("C2B00012");
  });
});

describe("acknowledgeC2BConfirmation", () => {
  it("returns ResultCode 0", () => {
    expect(acknowledgeC2BConfirmation().ResultCode).toBe(0);
  });

  it("returns ResultDesc Success", () => {
    expect(acknowledgeC2BConfirmation().ResultDesc).toBe("Success");
  });
});

describe("getC2BAmount", () => {
  it("returns the TransAmount as a number", () => {
    expect(getC2BAmount(MOCK_PAYLOAD)).toBe(10);
  });
});

describe("getC2BTransactionId", () => {
  it("returns the TransID", () => {
    expect(getC2BTransactionId(MOCK_PAYLOAD)).toBe("RKTQDM7W6S");
  });
});

describe("getC2BAccountRef", () => {
  it("returns the BillRefNumber", () => {
    expect(getC2BAccountRef(MOCK_PAYLOAD)).toBe("account");
  });
});

describe("getC2BCustomerName", () => {
  it("joins first, middle and last name", () => {
    expect(getC2BCustomerName(MOCK_PAYLOAD)).toBe("John Doe Smith");
  });

  it("handles missing middle name gracefully", () => {
    const payload = { ...MOCK_PAYLOAD, MiddleName: "" };
    expect(getC2BCustomerName(payload)).toBe("John Smith");
  });
});

describe("isPaybillPayment", () => {
  it("returns true for Pay Bill TransactionType", () => {
    expect(isPaybillPayment(MOCK_PAYLOAD)).toBe(true);
  });

  it("returns true for CustomerPayBillOnline TransactionType", () => {
    expect(isPaybillPayment({ ...MOCK_PAYLOAD, TransactionType: "CustomerPayBillOnline" })).toBe(
      true,
    );
  });

  it("returns false for Buy Goods", () => {
    expect(isPaybillPayment(BUY_GOODS_PAYLOAD)).toBe(false);
  });
});

describe("isBuyGoodsPayment", () => {
  it("returns true for Buy Goods TransactionType", () => {
    expect(isBuyGoodsPayment(BUY_GOODS_PAYLOAD)).toBe(true);
  });

  it("returns true for CustomerBuyGoodsOnline TransactionType", () => {
    expect(
      isBuyGoodsPayment({ ...BUY_GOODS_PAYLOAD, TransactionType: "CustomerBuyGoodsOnline" }),
    ).toBe(true);
  });

  it("returns false for Pay Bill", () => {
    expect(isBuyGoodsPayment(MOCK_PAYLOAD)).toBe(false);
  });
});
