// 📁 PATH: src/__tests__/mpesa/account-balance/account-balance-query.test.ts
/**
 * Advanced patterns used here:
 *   • it.each (table form) — covers every validation branch in one parametrized block
 *   • expect.objectContaining — partial response matching
 *   • vi.mocked              — typed mock helpers
 */
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("../../../utils/http", () => ({ httpRequest: vi.fn() }));

import { httpRequest } from "../../../utils/http";
import { queryAccountBalance } from "../../../mpesa/account-balance/query";
import type { AccountBalanceRequest } from "../../../mpesa/account-balance/types";

const mockHttp = vi.mocked(httpRequest);
const BASE_URL = "https://sandbox.safaricom.co.ke";
const TOKEN = "test-bearer-token";
const CRED = "base64-security-credential";
const INITIATOR = "testapi";

const VALID_REQUEST: AccountBalanceRequest = {
  partyA: "174379",
  identifierType: "4",
  resultUrl: "https://example.com/result",
  queueTimeOutUrl: "https://example.com/timeout",
  remarks: "Balance check",
};

const OK_RESPONSE = {
  OriginatorConversationID: "OC-001",
  ConversationID: "AG_20231001_001",
  ResponseCode: "0",
  ResponseDescription: "Accept the service request successfully.",
};

describe("queryAccountBalance — validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["missing partyA", { ...VALID_REQUEST, partyA: "" }, "partyA is required"],
    ["invalid identifierType", { ...VALID_REQUEST, identifierType: "9" as "4" }, "identifierType"],
    ["missing resultUrl", { ...VALID_REQUEST, resultUrl: "" }, "resultUrl is required"],
    [
      "missing queueTimeOutUrl",
      { ...VALID_REQUEST, queueTimeOutUrl: "" },
      "queueTimeOutUrl is required",
    ],
  ])(
    "throws VALIDATION_ERROR when %s",
    async (_label: string, request: AccountBalanceRequest, _expectedMsg: string) => {
      await expect(
        queryAccountBalance(BASE_URL, TOKEN, CRED, INITIATOR, request),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      expect(mockHttp).not.toHaveBeenCalled();
    },
  );
});

describe("queryAccountBalance — success path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the correct Daraja endpoint", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESPONSE, status: 200, headers: {} });
    await queryAccountBalance(BASE_URL, TOKEN, CRED, INITIATOR, VALID_REQUEST);

    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/mpesa/accountbalance/v1/query`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends Bearer token in Authorization header", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESPONSE, status: 200, headers: {} });
    await queryAccountBalance(BASE_URL, TOKEN, CRED, INITIATOR, VALID_REQUEST);

    const [, options] = mockHttp.mock.calls[0]!;
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${TOKEN}`);
  });

  it("builds payload with all required Daraja fields", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESPONSE, status: 200, headers: {} });
    await queryAccountBalance(BASE_URL, TOKEN, CRED, INITIATOR, VALID_REQUEST);

    const [, options] = mockHttp.mock.calls[0]!;
    expect(options.body).toMatchObject({
      Initiator: INITIATOR,
      SecurityCredential: CRED,
      CommandID: "AccountBalance",
      PartyA: "174379",
      IdentifierType: "4",
      ResultURL: VALID_REQUEST.resultUrl,
      QueueTimeOutURL: VALID_REQUEST.queueTimeOutUrl,
    });
  });

  it("defaults Remarks to 'Account Balance Query' when not provided", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESPONSE, status: 200, headers: {} });
    const { remarks: _, ...withoutRemarks } = VALID_REQUEST;
    await queryAccountBalance(BASE_URL, TOKEN, CRED, INITIATOR, withoutRemarks);

    const [, options] = mockHttp.mock.calls[0]!;
    expect((options.body as Record<string, unknown>)["Remarks"]).toBe("Account Balance Query");
  });

  it("returns the Daraja response unchanged", async () => {
    mockHttp.mockResolvedValueOnce({ data: OK_RESPONSE, status: 200, headers: {} });
    const result = await queryAccountBalance(BASE_URL, TOKEN, CRED, INITIATOR, VALID_REQUEST);
    expect(result).toEqual(OK_RESPONSE);
  });

  it.each(["1", "2", "4"] as const)(
    "accepts valid identifierType '%s'",
    async (type: "1" | "2" | "4") => {
      mockHttp.mockResolvedValueOnce({ data: OK_RESPONSE, status: 200, headers: {} });
      await expect(
        queryAccountBalance(BASE_URL, TOKEN, CRED, INITIATOR, {
          ...VALID_REQUEST,
          identifierType: type,
        }),
      ).resolves.toBeDefined();
    },
  );
});
