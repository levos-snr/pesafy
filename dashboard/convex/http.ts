import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// ─── Better Auth routes (CORS required for React SPA) ────────────────────────
authComponent.registerRoutes(http, createAuth, { cors: true });

// ─── M-Pesa Daraja IP whitelist ───────────────────────────────────────────────
// https://developer.safaricom.co.ke/docs#ip-whitelisting
const SAFARICOM_IPS = new Set([
  "196.201.214.200",
  "196.201.214.206",
  "196.201.213.114",
  "196.201.214.207",
  "196.201.214.208",
  "196.201.213.44",
  "196.201.212.127",
  "196.201.212.128",
  "196.201.212.129",
  "196.201.212.136",
  "196.201.212.138",
]);

function isSafaricomIP(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : null;
  if (!ip) return true; // Can't determine — allow but log
  return (
    SAFARICOM_IPS.has(ip) ||
    process.env.SITE_URL?.includes("localhost") === true
  );
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface StkCallbackItem {
  Name: string;
  Value: unknown;
}

interface ResultParameter {
  Key: string;
  Value: unknown;
}

interface MpesaResult {
  ConversationID: string;
  ResultCode: number;
  ResultDesc?: string;
  TransactionID?: string;
  ResultParameters?: {
    ResultParameter?: ResultParameter[];
  };
}

interface StkWebhookBody {
  Body?: {
    stkCallback?: {
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item?: StkCallbackItem[];
      };
    };
  };
}

interface ResultWebhookBody {
  Result?: MpesaResult;
}

interface C2BWebhookBody {
  TransID?: string;
  TransAmount?: string;
  MSISDN?: string;
  BillRefNumber?: string;
  BusinessShortCode?: string;
}

// ─── STK Push callback (/webhook/mpesa/stk) ──────────────────────────────────
http.route({
  path: "/webhook/mpesa/stk",
  method: "POST",
  handler: async (ctx, request) => {
    if (!isSafaricomIP(request)) {
      console.warn("[webhook/stk] Blocked non-Safaricom IP");
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    let body: StkWebhookBody;
    try {
      body = (await request.json()) as StkWebhookBody;
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    try {
      const callback = body?.Body?.stkCallback;
      if (!callback) {
        console.error("[webhook/stk] Missing stkCallback body", body);
        return jsonResponse({ ResultCode: 1, ResultDesc: "Invalid payload" });
      }

      const checkoutRequestId: string = callback.CheckoutRequestID;
      const resultCode: number = callback.ResultCode;
      const resultDesc: string = callback.ResultDesc;

      const metadata: Record<string, unknown> = { resultCode, resultDesc };
      if (resultCode === 0 && callback.CallbackMetadata?.Item) {
        for (const item of callback.CallbackMetadata.Item) {
          metadata[item.Name] = item.Value;
        }
      }

      const status = resultCode === 0 ? "success" : "failed";

      const transactions = await ctx.runQuery(
        internal.transactions.getByTransactionId,
        { transactionId: checkoutRequestId }
      );

      if (transactions.length > 0) {
        await ctx.runMutation(internal.mpesaTransactions.updateTransaction, {
          transactionId: transactions[0]._id,
          status,
          metadata,
        });
        console.log(
          `[webhook/stk] ${status} — CheckoutRequestID: ${checkoutRequestId}`
        );
      } else {
        console.warn(
          `[webhook/stk] No transaction found for CheckoutRequestID: ${checkoutRequestId}`
        );
      }

      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error: unknown) {
      const err = error instanceof Error ? error.message : String(error);
      console.error("[webhook/stk] Error processing callback:", err);
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  },
});

// ─── B2B result callback (/webhook/mpesa/b2b/result) ─────────────────────────
http.route({
  path: "/webhook/mpesa/b2b/result",
  method: "POST",
  handler: async (ctx, request) => {
    if (!isSafaricomIP(request)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    let body: ResultWebhookBody;
    try {
      body = (await request.json()) as ResultWebhookBody;
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    try {
      const result = body?.Result;
      if (!result)
        return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });

      const conversationId: string = result.ConversationID;
      const status = result.ResultCode === 0 ? "success" : "failed";

      const transactions = await ctx.runQuery(
        internal.transactions.getByTransactionId,
        { transactionId: conversationId }
      );

      if (transactions.length > 0) {
        await ctx.runMutation(internal.mpesaTransactions.updateTransaction, {
          transactionId: transactions[0]._id,
          status,
          metadata: { ...result } as Record<string, unknown>,
        });
      }

      console.log(
        `[webhook/b2b] ${status} — ConversationID: ${conversationId}`
      );
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error: unknown) {
      const err = error instanceof Error ? error.message : String(error);
      console.error("[webhook/b2b] Error:", err);
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  },
});

// ─── B2C result callback (/webhook/mpesa/b2c/result) ─────────────────────────
http.route({
  path: "/webhook/mpesa/b2c/result",
  method: "POST",
  handler: async (ctx, request) => {
    if (!isSafaricomIP(request)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    let body: ResultWebhookBody;
    try {
      body = (await request.json()) as ResultWebhookBody;
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    try {
      const result = body?.Result;
      if (!result) {
        console.error("[webhook/b2c] Missing Result body");
        return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      const conversationId: string = result.ConversationID;
      const resultCode: number = result.ResultCode;
      const status = resultCode === 0 ? "success" : "failed";

      const metadata: Record<string, unknown> = {
        resultCode,
        resultDesc: result.ResultDesc,
        transactionID: result.TransactionID,
      };

      if (result.ResultParameters?.ResultParameter) {
        for (const param of result.ResultParameters.ResultParameter) {
          metadata[param.Key] = param.Value;
        }
      }

      const transactions = await ctx.runQuery(
        internal.transactions.getByTransactionId,
        { transactionId: conversationId }
      );

      if (transactions.length > 0) {
        await ctx.runMutation(internal.mpesaTransactions.updateTransaction, {
          transactionId: transactions[0]._id,
          status,
          metadata,
        });
      }

      console.log(
        `[webhook/b2c] ${status} — ConversationID: ${conversationId}`
      );
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error: unknown) {
      const err = error instanceof Error ? error.message : String(error);
      console.error("[webhook/b2c] Error:", err);
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  },
});

// ─── B2C timeout callback (/webhook/mpesa/b2c/timeout) ───────────────────────
http.route({
  path: "/webhook/mpesa/b2c/timeout",
  method: "POST",
  handler: async (ctx, request) => {
    let body: ResultWebhookBody | undefined;
    try {
      body = (await request.json()) as ResultWebhookBody;
    } catch {
      /* ignore */
    }
    const conversationId: string | undefined = body?.Result?.ConversationID;
    if (conversationId) {
      const transactions = await ctx.runQuery(
        internal.transactions.getByTransactionId,
        { transactionId: conversationId }
      );
      if (transactions.length > 0) {
        await ctx.runMutation(internal.mpesaTransactions.updateTransaction, {
          transactionId: transactions[0]._id,
          status: "failed",
          metadata: { error: "B2C request timed out" },
        });
      }
    }
    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  },
});

// ─── C2B confirmation (/webhook/mpesa/c2b/confirmation) ──────────────────────
http.route({
  path: "/webhook/mpesa/c2b/confirmation",
  method: "POST",
  handler: async (ctx, request) => {
    if (!isSafaricomIP(request)) {
      return jsonResponse({ ResultCode: 1, ResultDesc: "Forbidden" }, 403);
    }

    let body: C2BWebhookBody;
    try {
      body = (await request.json()) as C2BWebhookBody;
    } catch {
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    try {
      const transID: string = body.TransID ?? "";
      const amount = parseFloat(body.TransAmount ?? "0");
      const phone: string = body.MSISDN ?? "";
      const shortCode: string = body.BusinessShortCode ?? "";

      const transactions = await ctx.runQuery(
        internal.transactions.getByTransactionId,
        { transactionId: transID }
      );

      if (transactions.length > 0) {
        await ctx.runMutation(internal.mpesaTransactions.updateTransaction, {
          transactionId: transactions[0]._id,
          status: "success",
          metadata: body as Record<string, unknown>,
        });
      } else {
        console.log(
          `[webhook/c2b] New C2B payment — TransID: ${transID}, ShortCode: ${shortCode}, Amount: ${amount}`
        );
      }

      console.log(
        `[webhook/c2b] Confirmed — TransID: ${transID}, Amount: ${amount}, Phone: ${phone}`
      );
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error: unknown) {
      const err = error instanceof Error ? error.message : String(error);
      console.error("[webhook/c2b] Error:", err);
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  },
});

// ─── C2B validation (/webhook/mpesa/c2b/validation) ──────────────────────────
http.route({
  path: "/webhook/mpesa/c2b/validation",
  method: "POST",
  handler: async (_ctx, request) => {
    let body: C2BWebhookBody | undefined;
    try {
      body = (await request.json()) as C2BWebhookBody;
    } catch {
      /* ignore */
    }
    console.log("[webhook/c2b/validation] Validating:", body?.BillRefNumber);
    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  },
});

// ─── Reversal result (/webhook/mpesa/reversal/result) ────────────────────────
http.route({
  path: "/webhook/mpesa/reversal/result",
  method: "POST",
  handler: async (ctx, request) => {
    if (!isSafaricomIP(request)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    let body: ResultWebhookBody | undefined;
    try {
      body = (await request.json()) as ResultWebhookBody;
    } catch {
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const result = body?.Result;
    if (result?.ConversationID) {
      const transactions = await ctx.runQuery(
        internal.transactions.getByTransactionId,
        { transactionId: result.ConversationID }
      );
      if (transactions.length > 0) {
        await ctx.runMutation(internal.mpesaTransactions.updateTransaction, {
          transactionId: transactions[0]._id,
          status: result.ResultCode === 0 ? "success" : "failed",
          metadata: result as unknown as Record<string, unknown>,
        });
      }
    }

    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  },
});

// ─── B2B timeout (/webhook/mpesa/b2b/timeout) ────────────────────────────────
http.route({
  path: "/webhook/mpesa/b2b/timeout",
  method: "POST",
  handler: async (ctx, request) => {
    let body: ResultWebhookBody | undefined;
    try {
      body = (await request.json()) as ResultWebhookBody;
    } catch {
      /* ignore */
    }
    const conversationId: string | undefined = body?.Result?.ConversationID;
    if (conversationId) {
      const transactions = await ctx.runQuery(
        internal.transactions.getByTransactionId,
        { transactionId: conversationId }
      );
      if (transactions.length > 0) {
        await ctx.runMutation(internal.mpesaTransactions.updateTransaction, {
          transactionId: transactions[0]._id,
          status: "failed",
          metadata: { error: "B2B request timed out" },
        });
      }
    }
    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  },
});

export default http;
