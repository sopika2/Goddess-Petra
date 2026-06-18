import { build } from "esbuild";

// Bundle the library to a single ESM file with React kept external — the
// design-sync converter re-bundles this into window.<global> and provides React
// from its own _vendor at runtime.
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  external: ["react", "react-dom", "react/jsx-runtime"],
  logLevel: "info",
});

console.log("✓ dist/index.js");
