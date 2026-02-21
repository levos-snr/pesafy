import { v } from "convex/values";
import { MutationCtx, mutation, QueryCtx, query } from "./_generated/server";
import { authComponent } from "./auth";

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  try {
    return await authComponent.getAuthUser(ctx);
  } catch {
    return null;
  }
}

// Get webhooks for a business
export const getWebhooks = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) return [];

    const business = await ctx.db.get(args.businessId);
    if (!business || (business.userId as string) !== (user._id as string))
      return [];

    return await ctx.db
      .query("webhooks")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
  },
});

// Create webhook
export const createWebhook = mutation({
  args: {
    businessId: v.id("businesses"),
    url: v.string(),
    secret: v.string(),
    events: v.array(
      v.union(
        v.literal("stk_push"),
        v.literal("b2c"),
        v.literal("b2b"),
        v.literal("c2b"),
        v.literal("reversal"),
        v.literal("transaction_status")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const business = await ctx.db.get(args.businessId);
    if (!business || (business.userId as string) !== (user._id as string)) {
      throw new Error("Business not found or access denied");
    }

    const now = Date.now();
    return await ctx.db.insert("webhooks", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update webhook
export const updateWebhook = mutation({
  args: {
    webhookId: v.id("webhooks"),
    url: v.optional(v.string()),
    secret: v.optional(v.string()),
    events: v.optional(
      v.array(
        v.union(
          v.literal("stk_push"),
          v.literal("b2c"),
          v.literal("b2b"),
          v.literal("c2b"),
          v.literal("reversal"),
          v.literal("transaction_status")
        )
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) throw new Error("Webhook not found");

    const business = await ctx.db.get(webhook.businessId);
    if (!business || (business.userId as string) !== (user._id as string)) {
      throw new Error("Unauthorized");
    }

    const { webhookId, ...updates } = args;
    await ctx.db.patch(webhookId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete webhook
export const deleteWebhook = mutation({
  args: { webhookId: v.id("webhooks") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) throw new Error("Webhook not found");

    const business = await ctx.db.get(webhook.businessId);
    if (!business || (business.userId as string) !== (user._id as string)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.webhookId);
  },
});
