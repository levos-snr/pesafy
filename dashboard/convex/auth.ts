import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [crossDomain({ siteUrl }), convex({ authConfig })],
  });
};

/**
 * Returns the current authenticated user or null.
 * Uses ctx.auth.getUserIdentity() first to avoid throwing when unauthenticated,
 * then fetches the full user object from the auth component.
 *
 * IMPORTANT: Do NOT call authComponent.getAuthUser(ctx) directly in queries
 * that can be called when the user is not authenticated — it throws ConvexError.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // getUserIdentity() returns null (never throws) when unauthenticated
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) return null;

    // Only fetch the full user object once we know the user is authenticated
    try {
      return await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
  },
});
