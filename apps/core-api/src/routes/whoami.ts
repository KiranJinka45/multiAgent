import express from 'express';
import { logger } from '@packages/observability';

const router = express.Router();

/**
 * Identify the current region and cluster serving the request.
 * Useful for data-plane failover validation.
 */
router.get('/whoami', (req, res) => {
  const region = process.env.REGION || 'us-east-1';
  const clusterId = process.env.CLUSTER_ID || 'cluster-a';
  const sessionId = req.headers['x-session-id'] || 'anonymous';

  res.json({
    region,
    clusterId,
    sessionId,
    timestamp: new Date().toISOString(),
    status: 'NOMINAL'
  });
});

export default router;
