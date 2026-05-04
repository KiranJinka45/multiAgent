import { Router } from 'express';
import { getBuildTimeline } from '../controllers/buildTimelineController';

const router: Router = Router();

/**
 * GET /api/build-timeline/:executionId
 * Fetches the chronological timeline of events for an execution.
 */
router.get('/:executionId', getBuildTimeline);

export default router;

