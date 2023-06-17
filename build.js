import { build } from "esbuild";

build({
  entryPoints: ["src/index.ts"],
  outbase: "./src",
  outdir: "./dist",
  platform: "node",
  external: [],
});
