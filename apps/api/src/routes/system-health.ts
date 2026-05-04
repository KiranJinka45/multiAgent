import { Router } from 'express';
import { getSystemHealth } from '../controllers/systemHealthController';

const router: Router = Router();

/**
 * GET /api/system-health
 * Returns aggregated health status of all infrastructure layers.
 */
router.get('/', getSystemHealth);

export default router;

