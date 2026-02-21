import { defineConfig } from "tsup";

export default defineConfig([
  {
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
  },
  {
    entry: [
      "src/components/react/index.tsx",
      "src/components/react/styles.css",
    ],
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    outDir: "dist/components/react",
    target: "es2020",
    external: ["react", "react-dom"],
    esbuildOptions(options) {
      options.jsx = "automatic";
    },
  },
  // Vue components are distributed as source files
  // Users need to configure their bundler to handle .vue files
]);
