// 📁 PATH: src/__tests__/core/auth/token-manager.test.ts
/**
 * Advanced patterns used here:
 *   • vi.useFakeTimers  — control Date.now() to simulate token expiry
 *   • vi.spyOn          — spy on a module-level function (httpRequest)
 *   • beforeEach reset  — fresh manager + real timers each test
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

// Mock httpRequest so TokenManager never hits the network
vi.mock("../../../utils/http", () => ({ httpRequest: vi.fn() }));

import { httpRequest } from "../../../utils/http";
import { TokenManager } from "../../../core/auth/token-manager";

const mockHttp = vi.mocked(httpRequest);

const BASE_URL = "https://sandbox.safaricom.co.ke";
const KEY = "test-key";
const SECRET = "test-secret";

function makeTokenResponse(token = "access-tok-001", expiresIn = 3600) {
  return {
    data: { access_token: token, expires_in: expiresIn },
    status: 200,
    headers: {},
  };
}

describe("TokenManager.getAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches a token on the first call", async () => {
    mockHttp.mockResolvedValueOnce(makeTokenResponse("tok-first"));
    const tm = new TokenManager(KEY, SECRET, BASE_URL);
    const token = await tm.getAccessToken();

    expect(token).toBe("tok-first");
    expect(mockHttp).toHaveBeenCalledOnce();
  });

  it("calls the correct Daraja authorization URL", async () => {
    mockHttp.mockResolvedValueOnce(makeTokenResponse());
    const tm = new TokenManager(KEY, SECRET, BASE_URL);
    await tm.getAccessToken();

    expect(mockHttp).toHaveBeenCalledWith(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("sends a Basic Authorization header with base64(key:secret)", async () => {
    mockHttp.mockResolvedValueOnce(makeTokenResponse());
    const tm = new TokenManager(KEY, SECRET, BASE_URL);
    await tm.getAccessToken();

    const expectedHeader = `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString("base64")}`;
    const [, options] = mockHttp.mock.calls[0]!;
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(expectedHeader);
  });

  it("returns the cached token on a second call without re-fetching", async () => {
    vi.useFakeTimers();
    mockHttp.mockResolvedValue(makeTokenResponse("cached-tok"));

    const tm = new TokenManager(KEY, SECRET, BASE_URL);
    const t1 = await tm.getAccessToken();
    const t2 = await tm.getAccessToken();

    expect(t1).toBe("cached-tok");
    expect(t2).toBe("cached-tok");
    expect(mockHttp).toHaveBeenCalledOnce();
  });

  it("re-fetches when the token is within the 60-second buffer window", async () => {
    vi.useFakeTimers();
    mockHttp
      .mockResolvedValueOnce(makeTokenResponse("tok-old", 3600))
      .mockResolvedValueOnce(makeTokenResponse("tok-new", 3600));

    const tm = new TokenManager(KEY, SECRET, BASE_URL);
    await tm.getAccessToken();

    vi.advanceTimersByTime((3600 - 59) * 1000);

    const refreshed = await tm.getAccessToken();
    expect(refreshed).toBe("tok-new");
    expect(mockHttp).toHaveBeenCalledTimes(2);
  });

  it("does NOT re-fetch when still safely outside the buffer window", async () => {
    vi.useFakeTimers();
    mockHttp.mockResolvedValue(makeTokenResponse("valid-tok", 3600));

    const tm = new TokenManager(KEY, SECRET, BASE_URL);
    await tm.getAccessToken();

    vi.advanceTimersByTime(1000 * 3000);

    await tm.getAccessToken();
    expect(mockHttp).toHaveBeenCalledOnce();
  });

  it("throws AUTH_FAILED when Daraja returns no access_token", async () => {
    mockHttp.mockResolvedValueOnce({
      data: { access_token: "", expires_in: 3600 },
      status: 200,
      headers: {},
    });

    const tm = new TokenManager(KEY, SECRET, BASE_URL);
    await expect(tm.getAccessToken()).rejects.toMatchObject({ code: "AUTH_FAILED" });
  });
});

describe("TokenManager.clearCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("forces a fresh fetch on the next getAccessToken call", async () => {
    mockHttp
      .mockResolvedValueOnce(makeTokenResponse("tok-before"))
      .mockResolvedValueOnce(makeTokenResponse("tok-after"));

    const tm = new TokenManager(KEY, SECRET, BASE_URL);
    await tm.getAccessToken();
    tm.clearCache();
    const second = await tm.getAccessToken();

    expect(second).toBe("tok-after");
    expect(mockHttp).toHaveBeenCalledTimes(2);
  });

  it("is idempotent — calling it multiple times does not throw", () => {
    const tm = new TokenManager(KEY, SECRET, BASE_URL);
    expect(() => {
      tm.clearCache();
      tm.clearCache();
    }).not.toThrow();
  });
});
