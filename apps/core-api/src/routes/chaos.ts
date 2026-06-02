import express from 'express';
import { chaosOrchestrator } from '../services/chaos-orchestrator.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        activeScenario: chaosOrchestrator.getActiveScenario(),
        targetNode: chaosOrchestrator.getTargetNode()
    });
});

router.post('/', (req, res) => {
    const { scenario, nodeId } = req.body;
    if (!scenario) {
        res.status(400).json({ error: 'Scenario is required' });
        return;
    }
    chaosOrchestrator.inject(scenario, nodeId || 'api-service');
    res.json({
        success: true,
        activeScenario: chaosOrchestrator.getActiveScenario(),
        targetNode: chaosOrchestrator.getTargetNode()
    });
});

router.delete('/', (req, res) => {
    chaosOrchestrator.clear();
    res.json({
        success: true,
        activeScenario: chaosOrchestrator.getActiveScenario(),
        targetNode: chaosOrchestrator.getTargetNode()
    });
});

import { QuarantineError } from '@packages/governance-core';

router.post('/trigger-quarantine', (req, res, next) => {
    // Explicitly throw a QuarantineError to test Phase 12 Tier E3 Archaeology Integration
    next(new QuarantineError('HARD QUARANTINE: Simulated infrastructure attestation failure during drill'));
});

export default router;
