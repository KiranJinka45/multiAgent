import { Router } from 'express';
import { replayDlqEvents, verifyMissionIntegrity, getIntelligenceState } from '../controllers/opsController';
import { requirePermission } from '@packages/auth-internal';
import { auditAction } from '../middleware/audit';

const router: Router = Router();

/**
 * POST /api/ops/events/dlq/replay
 * Triggers recovery of events from the Dead Letter Queue.
 * Restricted to super-admin or ops-manager.
 */
router.post('/events/dlq/replay', requirePermission('system:manage'), auditAction('DLQ_REPLAY'), replayDlqEvents);

/**
 * GET /api/ops/missions/:executionId/verify
 * System-level verification of mission log integrity.
 */
router.get('/missions/:executionId/verify', requirePermission('system:manage'), auditAction('LOG_VERIFY'), verifyMissionIntegrity);

/**
 * GET /api/ops/intelligence
 * Dashboard endpoint for control-engine policy distribution and ROI stats.
 */
router.get('/intelligence', requirePermission('system:manage'), auditAction('INTEL_VIEW'), getIntelligenceState);

export default router;
