// src/tracing.ts
import { logger } from "@libs/utils";
async function startTracing() {
  try {
    logger.info("[OTel] Tracing is disabled (Stub mode)");
  } catch (error) {
    logger.error({ error }, "[OTel] Failed to start tracing");
  }
}
process.on("SIGTERM", () => {
  process.exit(0);
});
export {
  startTracing
};
//# sourceMappingURL=index.mjs.map