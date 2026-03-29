// 📁 PATH: src/__tests__/mpesa/b2b-express-checkout/b2b-initiate.test.ts
/**
 * Advanced patterns used here:
 *   • it.each (table)   — all 6 validation paths in one block
 *   • toMatch /regex/   — assert UUID-style requestRefId is auto-generated
 */
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("../../../utils/http", () => ({ httpRequest: vi.fn() }));
import { httpRequest } from "../../../utils/http";
import { initiateB2BExpressCheckout } from "../../../mpesa/b2b-express-checkout/initiate";
import type { B2BExpressCheckoutRequest } from "../../../mpesa/b2b-express-checkout/types";

const mockHttp = vi.mocked(httpRequest);
const BASE_URL = "https://sandbox.safaricom.co.ke";

const VALID: B2BExpressCheckoutRequest = {
  primaryShortCode: "000001",
  receiverShortCode: "000002",
  amount: 100,
  paymentRef: "INV-001",
  callbackUrl: "https://example.com/b2b/callback",
  partnerName: "Acme Ltd",
};

const OK_RESP = { code: "0", status: "USSD Initiated Successfully" };

describe("initiateB2BExpressCheckout — validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["empty primaryShortCode", { ...VALID, primaryShortCode: "" }],
    ["empty receiverShortCode", { ...VALID, receiverShortCode: "" }],
    ["amount < 1", { ...VALID, amount: 0 }],
    ["empty paymentRef", { ...VALID, paymentRef: "" }],
    ["empty callbackUrl", { ...VALID, callbackUrl: "" }],
    ["empty partnerName", { ...VALID, partnerName: "" }],
  ])("throws VALIDATION_ERROR when %s", async (_label: string, req: B2BExpressCheckoutRequest) => {
    await expect(initiateB2BExpressCheckout(BASE_URL, "tok", req)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mockHttp).not.toHaveBeenCalled();
  });
});

describe("initiateB2BExpressCheckout — success", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the correct Daraja USSD endpoint", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await initiateB2BExpressCheckout(BASE_URL, "tok", VALID);
    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/v1/ussdpush/get-msisdn`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends amount as a string to Daraja", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await initiateB2BExpressCheckout(BASE_URL, "tok", VALID);
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>;
    expect(typeof body["amount"]).toBe("string");
    expect(body["amount"]).toBe("100");
  });

  it("auto-generates a RequestRefID when not supplied", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await initiateB2BExpressCheckout(BASE_URL, "tok", VALID);
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>;
    expect(body["RequestRefID"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[0-9a-f]+-[0-9a-f]+-[0-9a-f]+$/i,
    );
  });

  it("uses the caller-provided requestRefId when given", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await initiateB2BExpressCheckout(BASE_URL, "tok", {
      ...VALID,
      requestRefId: "my-ref-id-123",
    });
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>;
    expect(body["RequestRefID"]).toBe("my-ref-id-123");
  });

  it("rounds fractional amounts", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await initiateB2BExpressCheckout(BASE_URL, "tok", { ...VALID, amount: 99.6 });
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>;
    expect(body["amount"]).toBe("100");
  });
});
