// No "use node" — mutations must run in Convex runtime, not Node.js

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Internal mutations for creating and updating M-Pesa transactions.
 * These are called from mpesaActions.ts (Node.js runtime) via ctx.runMutation.
 * They MUST be in a separate file because "use node" files cannot export mutations.
 */

export const createTransaction = internalMutation({
  args: {
    businessId: v.id("businesses"),
    transactionId: v.string(),
    type: v.union(
      v.literal("stk_push"),
      v.literal("stk_query"),
      v.literal("b2c"),
      v.literal("b2b"),
      v.literal("c2b"),
      v.literal("qr_code"),
      v.literal("transaction_status"),
      v.literal("reversal")
    ),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    phoneNumber: v.optional(v.string()),
    accountReference: v.optional(v.string()),
    transactionDesc: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("transactions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTransaction = internalMutation({
  args: {
    transactionId: v.id("transactions"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("success"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { transactionId, ...updates } = args;
    await ctx.db.patch(transactionId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});
