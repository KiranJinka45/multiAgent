import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  tsconfig: "tsconfig.json",
  clean: true,
  external: ["kafkajs"],
});
