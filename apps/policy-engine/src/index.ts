import { createServer } from './server.js';
import { logger } from '@packages/observability';

const port = process.env.POLICY_ENGINE_PORT || 3100;
const app = createServer();

app.listen(port, () => {
  logger.info(`🛡️ [PolicyEngine] Deterministic Policy Service listening on port ${port}`);
});
