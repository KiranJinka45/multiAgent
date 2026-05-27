import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(import.meta.dirname, '../../../.env') });

import { logger } from '@packages/observability';
import { SecretProvider } from '@packages/config';
import { createServer } from './server.js';

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║             ZTAN INTENT INSPECTION GATEWAY               ║');
  console.log('║         - Layer 7 Semantic & Layer 5 Structural -        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Bootstrap secrets
  if (typeof SecretProvider.bootstrap === 'function') {
    await SecretProvider.bootstrap();
  }

  const PORT = process.env.INTENT_GATEWAY_PORT || 3090;
  const app = createServer();

  const server = app.listen(PORT, () => {
    logger.info(`🚀 [IntentGateway] Active and listening on port ${PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    logger.info('🛑 [IntentGateway] Initiating graceful shutdown...');
    server.close(() => {
      logger.info('👋 [IntentGateway] Process terminated cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup failure in Intent Gateway');
  process.exit(1);
});
