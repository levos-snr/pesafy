import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  outDir: "dist",
  target: "es2020",
  banner: {
    js: "// Pesafy - Payment Gateway Library\n// https://github.com/levos-snr/pesafy",
  },
});
