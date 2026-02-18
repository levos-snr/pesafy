/**
 * lint-staged.config.js
 *
 * Biome   → JS/TS: lint + format in one pass
 *           --diagnostic-level=error  → warnings don't fail the commit
 *
 * Prettier → CSS, MD, JSON, YAML
 *           --ignore-unknown          → skip files it can't parse
 *           --no-embedded-language-formatting → don't try to format
 *                                               code blocks inside markdown
 */
const config = {
  "*.{cjs,mjs,js,ts,jsx,tsx}": (stagedFiles) => [
    `biome check --write --diagnostic-level=error ${stagedFiles.join(" ")}`,
  ],
  "*.{css,md,mdx,json,yaml,yml}": (stagedFiles) => [
    `prettier --write --ignore-unknown --embedded-language-formatting=off ${stagedFiles.join(" ")}`,
  ],
};

export default config;
