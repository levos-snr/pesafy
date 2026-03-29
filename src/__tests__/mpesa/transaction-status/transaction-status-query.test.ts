// 📁 PATH: src/__tests__/mpesa/transaction-status/transaction-status-query.test.ts
/**
 * Advanced patterns used here:
 *   • it.each (table) — covers all 5 required-field validations parametrically
 *   • it.each for identifierType accepted values
 */
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("../../../utils/http", () => ({ httpRequest: vi.fn() }));
import { httpRequest } from "../../../utils/http";
import { queryTransactionStatus } from "../../../mpesa/transaction-status/query";
import type { TransactionStatusRequest } from "../../../mpesa/transaction-status/types";

const mockHttp = vi.mocked(httpRequest);
const BASE_URL = "https://sandbox.safaricom.co.ke";

const VALID: TransactionStatusRequest = {
  transactionId: "OEI2AK4XXXX",
  partyA: "174379",
  identifierType: "4",
  resultUrl: "https://example.com/result",
  queueTimeOutUrl: "https://example.com/timeout",
};

const OK_RESP = {
  ResponseCode: "0",
  ResponseDescription: "Accept the service request successfully.",
};

describe("queryTransactionStatus — validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["missing transactionId", { ...VALID, transactionId: "" }],
    ["missing partyA", { ...VALID, partyA: "" }],
    ["missing identifierType", { ...VALID, identifierType: "" as "4" }],
    ["missing resultUrl", { ...VALID, resultUrl: "" }],
    ["missing queueTimeOutUrl", { ...VALID, queueTimeOutUrl: "" }],
  ])("throws VALIDATION_ERROR when %s", async (_label: string, req: TransactionStatusRequest) => {
    await expect(
      queryTransactionStatus(BASE_URL, "tok", "cred", "testapi", req),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mockHttp).not.toHaveBeenCalled();
  });
});

describe("queryTransactionStatus — success", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the correct Daraja endpoint", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await queryTransactionStatus(BASE_URL, "tok", "cred", "testapi", VALID);
    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/mpesa/transactionstatus/v1/query`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("defaults CommandID to 'TransactionStatusQuery'", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await queryTransactionStatus(BASE_URL, "tok", "cred", "testapi", VALID);
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>;
    expect(body["CommandID"]).toBe("TransactionStatusQuery");
  });

  it("uses caller-supplied commandId when provided", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
    await queryTransactionStatus(BASE_URL, "tok", "cred", "testapi", {
      ...VALID,
      commandId: "CustomCommand",
    });
    const body = mockHttp.mock.calls[0]![1].body as Record<string, unknown>;
    expect(body["CommandID"]).toBe("CustomCommand");
  });

  it.each(["1", "2", "4"] as const)(
    "accepts identifierType '%s'",
    async (type: "1" | "2" | "4") => {
      mockHttp.mockResolvedValueOnce({ data: OK_RESP, status: 200, headers: {} });
      await expect(
        queryTransactionStatus(BASE_URL, "tok", "cred", "testapi", {
          ...VALID,
          identifierType: type,
        }),
      ).resolves.toBeDefined();
    },
  );
});
