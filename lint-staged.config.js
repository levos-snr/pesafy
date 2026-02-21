// lint-staged.config.js
const config = {
  "*.{cjs,mjs,js,ts,jsx,tsx,json}": (files) => [
    // removed css
    `biome check --write --unsafe --no-errors-on-unmatched --files-ignore-unknown=true --diagnostic-level=error ${files.join(" ")}`,
  ],
};
export default config;
