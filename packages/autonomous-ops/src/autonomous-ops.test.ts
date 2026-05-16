import { describe, it, expect } from 'vitest';
import { AutonomousSRE } from '../src/autonomous-sre.js';
import { RecoveryOrchestrator } from '../src/recovery-orchestrator.js';
import { PredictiveRiskEngine } from '../src/predictive-risk.js';
import { DecisionAudit } from '../src/decision-audit.js';

describe('AutonomousSRE', () => {
    it('should triage anomalies and recommend remediation', async () => {
        const plan = await AutonomousSRE.triageAnomaly('cpu_load', 95, 80);
        expect(plan).toBeDefined();
        expect(plan?.action).toBe('CONTAIN');
        expect(plan?.confidence).toBeGreaterThan(0.5);
    });

    it('should recommend rollback for critical anomalies', async () => {
        const plan = await AutonomousSRE.triageAnomaly('latency', 500, 200);
        expect(plan?.action).toBe('ROLLBACK');
    });
});

describe('DecisionAudit', () => {
    it('should generate Merkle-linked evidence trails', async () => {
        const evidenceId = await DecisionAudit.recordDecision('REM-123', 'Testing audit', 'SUCCESS');
        expect(evidenceId).toContain('EVID-');
        const history = DecisionAudit.getHistory();
        expect(history.find(h => h.evidenceId === evidenceId)).toBeDefined();
        expect(history[0].merkleRoot).toBeDefined();
    });
});

describe('PredictiveRiskEngine', () => {
    it('should forecast institutional risk', async () => {
        const forecast = await PredictiveRiskEngine.forecastRisk();
        expect(forecast.instabilityProbability).toBeGreaterThan(0);
        expect(forecast.affectedRegions.length).toBeGreaterThan(0);
    });
});
