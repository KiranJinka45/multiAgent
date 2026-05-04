import { Router } from 'express';
import { getWorkerStatus } from '../controllers/workerController';

const router: Router = Router();

/**
 * GET /api/workers
 * Returns the real-time status of all active autonomous workers in the fleet.
 */
router.get('/', getWorkerStatus);

export default router;
