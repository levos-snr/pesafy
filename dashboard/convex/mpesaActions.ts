"use node";

// ^^^ Required: pesafy uses Node.js crypto/https APIs that the default
// Convex runtime doesn't support. This runs actions in Node.js 20.
// IMPORTANT: This file can only export `action` functions — NOT queries or mutations.
// Internal mutations live in mpesaTransactions.ts.

import { v } from "convex/values";
import type { MpesaConfig } from "pesafy";
import { Mpesa } from "pesafy";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ActionCtx, action } from "./_generated/server";
import { authComponent } from "./auth";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireUser(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  try {
    return await authComponent.getAuthUser(ctx);
  } catch {
    return null;
  }
}

// ─── Mpesa client factory ─────────────────────────────────────────────────────

async function getMpesaClient(
  ctx: ActionCtx,
  businessId: Id<"businesses">
): Promise<Mpesa> {
  const business = await ctx.runQuery(internal.businesses.getBusinessInternal, {
    businessId,
  });
  if (!business) throw new Error("Business not found");

  const creds = await ctx.runQuery(
    internal.credentials.getCredentialsInternal,
    { businessId }
  );

  if (!creds) {
    throw new Error(
      "M-Pesa credentials not configured. Add them in Settings first."
    );
  }

  const config: MpesaConfig = {
    consumerKey: creds.consumerKey,
    consumerSecret: creds.consumerSecret,
    environment: business.mpesaEnvironment,
    lipaNaMpesaShortCode: business.lipaNaMpesaShortCode,
    lipaNaMpesaPassKey: creds.lipaNaMpesaPassKey,
    initiatorName: creds.initiatorName,
    initiatorPassword: creds.initiatorPassword,
    certificatePem: creds.certificatePem,
  };

  return new Mpesa(config);
}

// ─── Helper: record a failed transaction ─────────────────────────────────────

async function recordFailed(
  ctx: ActionCtx,
  businessId: Id<"businesses">,
  type: string,
  amount: number,
  error: Error,
  extra: {
    phoneNumber?: string;
    accountReference?: string;
    transactionDesc?: string;
  } = {}
) {
  await ctx.runMutation(internal.mpesaTransactions.createTransaction, {
    businessId,
    transactionId: `failed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: type as
      | "stk_push"
      | "stk_query"
      | "b2c"
      | "b2b"
      | "c2b"
      | "qr_code"
      | "transaction_status"
      | "reversal",
    amount,
    status: "failed",
    metadata: { error: error.message },
    ...extra,
  });
}

// ─── STK Push ─────────────────────────────────────────────────────────────────

export const stkPush = action({
  args: {
    businessId: v.id("businesses"),
    amount: v.number(),
    phoneNumber: v.string(),
    callbackUrl: v.string(),
    accountReference: v.string(),
    transactionDesc: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const business = await ctx.runQuery(
      internal.businesses.getBusinessInternal,
      {
        businessId: args.businessId,
      }
    );
    if (!business) throw new Error("Business not found or access denied");

    const mpesa = await getMpesaClient(ctx, args.businessId);

    try {
      const result = await mpesa.stkPush({
        amount: args.amount,
        phoneNumber: args.phoneNumber,
        callbackUrl: args.callbackUrl,
        accountReference: args.accountReference,
        transactionDesc: args.transactionDesc,
      });

      await ctx.runMutation(internal.mpesaTransactions.createTransaction, {
        businessId: args.businessId,
        transactionId: result.CheckoutRequestID,
        type: "stk_push",
        amount: args.amount,
        status: "pending",
        phoneNumber: args.phoneNumber,
        accountReference: args.accountReference,
        transactionDesc: args.transactionDesc,
        metadata: result as unknown as Record<string, unknown>,
      });

      return result;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      await recordFailed(ctx, args.businessId, "stk_push", args.amount, err, {
        phoneNumber: args.phoneNumber,
        accountReference: args.accountReference,
        transactionDesc: args.transactionDesc,
      });
      throw new Error(`STK Push failed: ${err.message}`);
    }
  },
});

// ─── STK Query ───────────────────────────────────────────────────────────────

export const stkQuery = action({
  args: {
    businessId: v.id("businesses"),
    checkoutRequestId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const business = await ctx.runQuery(
      internal.businesses.getBusinessInternal,
      {
        businessId: args.businessId,
      }
    );
    if (!business) throw new Error("Business not found or access denied");

    const mpesa = await getMpesaClient(ctx, args.businessId);
    return await mpesa.stkQuery({ checkoutRequestId: args.checkoutRequestId });
  },
});

// ─── B2C Payment ──────────────────────────────────────────────────────────────

export const b2c = action({
  args: {
    businessId: v.id("businesses"),
    amount: v.number(),
    phoneNumber: v.string(),
    shortCode: v.string(),
    resultUrl: v.string(),
    timeoutUrl: v.string(),
    remarks: v.optional(v.string()),
    occasion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const business = await ctx.runQuery(
      internal.businesses.getBusinessInternal,
      {
        businessId: args.businessId,
      }
    );
    if (!business) throw new Error("Business not found or access denied");

    const mpesa = await getMpesaClient(ctx, args.businessId);

    try {
      const result = await mpesa.b2c({
        amount: args.amount,
        phoneNumber: args.phoneNumber,
        shortCode: args.shortCode,
        resultUrl: args.resultUrl,
        timeoutUrl: args.timeoutUrl,
        remarks: args.remarks,
        occasion: args.occasion,
      });

      await ctx.runMutation(internal.mpesaTransactions.createTransaction, {
        businessId: args.businessId,
        transactionId: result.ConversationID,
        type: "b2c",
        amount: args.amount,
        status: "pending",
        phoneNumber: args.phoneNumber,
        transactionDesc: args.remarks ?? "B2C Payment",
        metadata: result as unknown as Record<string, unknown>,
      });

      return result;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      await recordFailed(ctx, args.businessId, "b2c", args.amount, err, {
        phoneNumber: args.phoneNumber,
        transactionDesc: args.remarks ?? "B2C Payment",
      });
      throw new Error(`B2C failed: ${err.message}`);
    }
  },
});

// ─── B2B Payment ──────────────────────────────────────────────────────────────

export const b2b = action({
  args: {
    businessId: v.id("businesses"),
    amount: v.number(),
    shortCode: v.string(),
    receiverShortCode: v.string(),
    resultUrl: v.string(),
    timeoutUrl: v.string(),
    remarks: v.optional(v.string()),
    accountReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const business = await ctx.runQuery(
      internal.businesses.getBusinessInternal,
      {
        businessId: args.businessId,
      }
    );
    if (!business) throw new Error("Business not found or access denied");

    const mpesa = await getMpesaClient(ctx, args.businessId);

    try {
      const result = await mpesa.b2b({
        amount: args.amount,
        shortCode: args.shortCode,
        receiverShortCode: args.receiverShortCode,
        resultUrl: args.resultUrl,
        timeoutUrl: args.timeoutUrl,
        remarks: args.remarks,
        accountReference: args.accountReference,
      });

      await ctx.runMutation(internal.mpesaTransactions.createTransaction, {
        businessId: args.businessId,
        transactionId: result.ConversationID,
        type: "b2b",
        amount: args.amount,
        status: "pending",
        transactionDesc: args.remarks ?? "B2B Payment",
        accountReference: args.accountReference,
        metadata: result as unknown as Record<string, unknown>,
      });

      return result;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      await recordFailed(ctx, args.businessId, "b2b", args.amount, err, {
        transactionDesc: args.remarks ?? "B2B Payment",
        accountReference: args.accountReference,
      });
      throw new Error(`B2B failed: ${err.message}`);
    }
  },
});

// ─── Reversal ─────────────────────────────────────────────────────────────────

export const reversal = action({
  args: {
    businessId: v.id("businesses"),
    transactionId: v.string(),
    amount: v.number(),
    shortCode: v.string(),
    resultUrl: v.string(),
    timeoutUrl: v.string(),
    remarks: v.optional(v.string()),
    occasion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const business = await ctx.runQuery(
      internal.businesses.getBusinessInternal,
      {
        businessId: args.businessId,
      }
    );
    if (!business) throw new Error("Business not found or access denied");

    const mpesa = await getMpesaClient(ctx, args.businessId);

    const result = await mpesa.reversal({
      transactionId: args.transactionId,
      amount: args.amount,
      shortCode: args.shortCode,
      resultUrl: args.resultUrl,
      timeoutUrl: args.timeoutUrl,
      remarks: args.remarks,
      occasion: args.occasion,
    });

    await ctx.runMutation(internal.mpesaTransactions.createTransaction, {
      businessId: args.businessId,
      transactionId: result.ConversationID,
      type: "reversal",
      amount: args.amount,
      status: "pending",
      transactionDesc: args.remarks ?? "Reversal",
      metadata: result as unknown as Record<string, unknown>,
    });

    return result;
  },
});

// ─── Transaction Status Query ─────────────────────────────────────────────────

export const transactionStatus = action({
  args: {
    businessId: v.id("businesses"),
    transactionId: v.string(),
    shortCode: v.string(),
    resultUrl: v.string(),
    timeoutUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const business = await ctx.runQuery(
      internal.businesses.getBusinessInternal,
      {
        businessId: args.businessId,
      }
    );
    if (!business) throw new Error("Business not found or access denied");

    const mpesa = await getMpesaClient(ctx, args.businessId);

    return await mpesa.transactionStatus({
      transactionId: args.transactionId,
      shortCode: args.shortCode,
      resultUrl: args.resultUrl,
      timeoutUrl: args.timeoutUrl,
    });
  },
});
