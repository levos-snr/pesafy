import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

// Parse comma-separated URLs into an array (e.g. "https://pesafy.vercel.app,http://localhost:5173")
const siteUrls = process.env.SITE_URL!.split(",").map((url) => url.trim());

// Auto-detect environment: CONVEX_CLOUD_URL is only defined in Convex cloud
// deployments (production/preview). It is undefined during local `npx convex dev`.
const isProduction = Boolean(process.env.CONVEX_CLOUD_URL);

const devUrl = siteUrls.find(
  (u) => u.includes("localhost") || u.includes("127.0.0.1")
);
const prodUrl = siteUrls.find(
  (u) => !u.includes("localhost") && !u.includes("127.0.0.1")
);

// Pick the URL that matches the current runtime — no env var juggling needed.
const primarySiteUrl = isProduction
  ? (prodUrl ?? siteUrls[0])
  : (devUrl ?? siteUrls[0]);

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    trustedOrigins: siteUrls, // ✅ all URLs are trusted
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      crossDomain({ siteUrl: primarySiteUrl }), // uses primary URL for cookies
      convex({ authConfig }),
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) return null;
    try {
      return await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
  },
});
