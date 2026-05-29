import { createServer } from './server.js';
import { logger } from '@packages/observability';

const port = process.env.CAPABILITY_RUNTIME_PORT || 3120;

async function bootstrap() {
  const app = createServer();
  app.listen(port, () => {
    logger.info(`🛡️ [CapabilityRuntime] Listening on port ${port}`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, '[CapabilityRuntime] Fatal bootstrap failure');
  process.exit(1);
});
