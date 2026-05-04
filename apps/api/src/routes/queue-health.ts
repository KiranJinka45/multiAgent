import { Router } from 'express';
import { getQueueHealth } from '../controllers/queueHealthController';

const router: Router = Router();

/**
 * GET /api/queue-health
 * Provides Temporal task queue observability.
 */
router.get('/', getQueueHealth);

export default router;

