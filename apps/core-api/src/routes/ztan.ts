import express from 'express';
import { TssSessionService } from '../services/tss-session.service.js';
import { RecoveryHistoryEngine, MigrationRehearsal } from '@packages/utils';

const router = express.Router();

/**
 * GET /api/v1/ztan/session/active
 * Returns the current active session state if it exists.
 */
router.get('/session/active', async (_req, res) => {
    try {
        const active = await TssSessionService.getActive();
        res.json({ active });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/v1/ztan/session/init
 * Starts a new signing session.
 */
router.post('/session/init', async (req, res) => {
    try {
        const { threshold, participants, messageHash } = req.body;
        const state = await TssSessionService.init(threshold, participants, messageHash);
        res.status(201).json(state);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/v1/ztan/session/commitments
 * MPC Round 1: Submit commitments (Authenticated).
 */
router.post('/session/commitments', async (req, res) => {
    try {
        const state = await TssSessionService.submitCommitments(req.body);
        res.json(state);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/v1/ztan/session/shares
 * MPC Round 2: Submit shares (Authenticated).
 */
router.post('/session/shares', async (req, res) => {
    try {
        const state = await TssSessionService.submitShares(req.body);
        res.json(state);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/v1/ztan/session/sign
 * Submits a partial signature (Authenticated).
 */
router.post('/session/sign', async (req, res) => {
    try {
        let state;
        if (req.body.simulate) {
            state = await TssSessionService.simulateNodeSign(req.body.nodeId);
        } else {
            state = await TssSessionService.submitSignature(req.body);
        }
        res.json(state);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/v1/ztan/verify
 * Public endpoint to verify an audit bundle or signature.
 */
router.post('/verify', async (req, res) => {
    try {
        const { ThresholdCrypto } = await import('@packages/ztan-crypto');
        const result = await ThresholdCrypto.verifyAudit(JSON.stringify(req.body));
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * GET /api/v1/ztan/session/:id
 * Retrieve a specific session state.
 */
router.get('/session/:id', async (req, res) => {
    try {
        const state = await TssSessionService.getActive();
        if (state && state.sessionId === req.params.id) {
            res.json(state);
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/v1/ztan/identities
 * Returns the current node registry (Public keys and status).
 */
router.get('/identities', async (_req, res) => {
    try {
        const { db } = await import('@packages/db');
        const identities = await db.ztanIdentity.findMany();
        res.json(identities);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/v1/ztan/metrics
  * Returns ZTAN performance and reliability metrics.
 */
router.get('/metrics', async (_req, res) => {
    try {
        const { db } = await import('@packages/db');
        const totalSessions = await db.ztanProof.count();
        const activeNodes = await db.ztanIdentity.count({ where: { status: 'ACTIVE' } });
        const revokedNodes = await db.ztanIdentity.count({ where: { status: 'REVOKED' } });
        
        // Simple success rate simulation based on verified proofs
        const successRate = totalSessions > 0 ? 1.0 : 0.0; 

        res.json({
            totalSessions,
            activeNodes,
            revokedNodes,
            successRate,
            protocolVersion: '1.5.1',
            status: 'OPERATIONAL'
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- RECOVERY & STEWARDSHIP NORMALIZED ROUTES ---

/**
 * GET /api/v1/ztan/recovery/summary
 */
router.get('/recovery/summary', async (_req, res) => {
    try {
        const summary = RecoveryHistoryEngine.loadIndex();
        res.json(summary);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/v1/ztan/recovery/query
 */
router.get('/recovery/query', async (req, res) => {
    try {
        const results = RecoveryHistoryEngine.query({
            failureType: req.query.type as string,
            service: req.query.service as string,
            nodeVersion: req.query.node as string,
            tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
        });
        res.json(results);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/v1/ztan/recovery/search
 */
router.get('/recovery/search', async (req, res) => {
    const query = req.query.q as string;
    const results = RecoveryHistoryEngine.search(query || '');
    res.json(results);
});

router.get('/recovery/compare', async (req, res) => {
    const { idA, idB } = req.query;
    const result = RecoveryHistoryEngine.compareReplays(idA as string, idB as string);
    res.json(result);
});

router.post('/recovery/forecast/validate', async (req, res) => {
    const { failureType, actualInstability } = req.body;
    RecoveryHistoryEngine.validateForecast(failureType, actualInstability);
    res.json({ success: true });
});

router.get('/recovery/forecast/metrics', async (_req, res) => {
    const metrics = RecoveryHistoryEngine.getPredictionMetrics();
    res.json(metrics);
});

router.get('/recovery/warnings', async (_req, res) => {
    const warnings = RecoveryHistoryEngine.getInstabilityWarnings();
    res.json(warnings);
});

router.post('/recovery/risk', async (req, res) => {
    const { changes } = req.body;
    const score = RecoveryHistoryEngine.getMutationRiskScore(changes || []);
    res.json({ score });
});

router.get('/recovery/chain/:id', async (req, res) => {
    const results = RecoveryHistoryEngine.getReplayChain(req.params.id);
    res.json(results);
});

router.get('/recovery/stewardship/audit', async (_req, res) => {
    const report = RecoveryHistoryEngine.getApprovalAuditReport();
    res.json(report);
});

router.post('/recovery/stewardship/causality', async (req, res) => {
    const { ids } = req.body;
    const summary = RecoveryHistoryEngine.summarizeCausality(ids || []);
    res.json(summary);
});

router.post('/recovery/rollback', async (req, res) => {
    const { id, reason } = req.body;
    RecoveryHistoryEngine.recordRollback(id, reason);
    res.json({ success: true });
});

router.get('/recovery/certifications/expired', async (_req, res) => {
    const expired = RecoveryHistoryEngine.getExpiredCertifications();
    res.json(expired);
});

router.get('/recovery/stewardship/behavior', async (_req, res) => {
    res.json(RecoveryHistoryEngine.auditOperatorBehavior());
});

router.get('/recovery/stewardship/prediction', async (_req, res) => {
    res.json(RecoveryHistoryEngine.calibratePredictionAccuracy());
});

router.get('/recovery/stewardship/lineage', async (_req, res) => {
    res.json(RecoveryHistoryEngine.compressOperationalLineage());
});

router.get('/recovery/archive/verify', async (_req, res) => {
    res.json(RecoveryHistoryEngine.verifyArchiveIntegrity());
});

router.post('/recovery/archive/compact', async (_req, res) => {
    res.json(RecoveryHistoryEngine.compactReplays());
});

router.get('/recovery/stewardship/narrative', async (_req, res) => {
    res.json(RecoveryHistoryEngine.generateOperationalNarrative());
});

router.get('/recovery/stewardship/velocity', async (_req, res) => {
    res.json(RecoveryHistoryEngine.auditReviewVelocity());
});

router.get('/recovery/stewardship/handoff', async (_req, res) => {
    res.json(RecoveryHistoryEngine.verifyOperationalTransfer());
});

router.get('/recovery/archive/recoverability', async (_req, res) => {
    res.json(RecoveryHistoryEngine.verifyArchiveRecoverability());
});

router.get('/recovery/prediction/history', async (_req, res) => {
    res.json(RecoveryHistoryEngine.getPredictionAccuracyHistory());
});

router.get('/recovery/stewardship/noise', async (_req, res) => {
    res.json(RecoveryHistoryEngine.auditTelemetryNoise());
});

router.get('/recovery/stewardship/growth', async (_req, res) => {
    res.json(RecoveryHistoryEngine.forecastStorageGrowth());
});

router.get('/recovery/stewardship/drill', async (_req, res) => {
    res.json(RecoveryHistoryEngine.performLongHorizonDrill());
});

router.get('/recovery/stewardship/decay', async (_req, res) => {
    res.json(RecoveryHistoryEngine.analyzeOperationalDecay());
});

router.get('/recovery/stewardship/rigor', async (_req, res) => {
    res.json(RecoveryHistoryEngine.auditApprovalQuality());
});

router.get('/recovery/stewardship/freshness', async (_req, res) => {
    res.json(RecoveryHistoryEngine.validateRunbookFreshness());
});

router.get('/recovery/stewardship/stability', async (_req, res) => {
    res.json(RecoveryHistoryEngine.calculateStabilityIndex());
});

router.get('/recovery/stewardship/simplicity', async (_req, res) => {
    res.json(RecoveryHistoryEngine.auditOperationalStability());
});

router.get('/recovery/stewardship/observation', async (_req, res) => {
    res.json(RecoveryHistoryEngine.monitorOperatorFriction());
});

router.get('/recovery/stats', async (_req, res) => {
    try {
        const stats = RecoveryHistoryEngine.getEnvironmentStats();
        res.json({ stats });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/recovery/stewardship/economics', async (_req, res) => {
    res.json(RecoveryHistoryEngine.auditStewardshipEconomics());
});

router.get('/recovery/stewardship/founder-absence', async (_req, res) => {
    res.json(RecoveryHistoryEngine.simulateFounderAbsence());
});

router.post('/recovery/stewardship/fold', async (_req, res) => {
    res.json(RecoveryHistoryEngine.foldSimilarReplays());
});

router.get('/recovery/forecast/:type', async (req, res) => {
    try {
        const forecast = RecoveryHistoryEngine.forecastStability(req.params.type);
        res.json(forecast);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/recovery/rehearse', async (req, res) => {
    try {
        const { target, testSuite } = req.body;
        const result = await MigrationRehearsal.rehearse(target, testSuite);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
