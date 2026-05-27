import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(import.meta.dirname, '../../../.env') });

import { logger } from '@packages/observability';
import { SecretProvider } from '@packages/config';
import { createServer } from './server.js';

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║             ZTAN SANDBOX & SIMULATION SERVICE            ║');
  console.log('║         - Layer 2 Sandbox & Layer 3 Simulation Plane -   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Bootstrap secrets
  if (typeof SecretProvider.bootstrap === 'function') {
    await SecretProvider.bootstrap();
  }

  const PORT = process.env.SANDBOX_SERVICE_PORT || 3095;
  const app = createServer();

  const server = app.listen(PORT, () => {
    logger.info(`🚀 [SandboxService] Active and listening on port ${PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    logger.info('🛑 [SandboxService] Initiating graceful shutdown...');
    server.close(() => {
      logger.info('👋 [SandboxService] Process terminated cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup failure in Sandbox Service');
  process.exit(1);
});
