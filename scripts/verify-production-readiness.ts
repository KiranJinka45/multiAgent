import { OperatorConsole, SystemHealth } from '../packages/ztan-witness/src/console';
import { InstitutionalTrustState } from '../packages/ztan-witness/src/trust';
import { EquilibriumMetrics } from '../packages/ztan-witness/src/equilibrium';
import * as fs from 'fs';

/**
 * 🛡️ Production Readiness & Institutional Audit
 * Verifies that the system is operator-friendly, audit-ready, and production-hardened.
 */
async function main() {
    console.log("--- 🛡️ PRODUCTION READINESS AUDIT START ---");

    const consoleUi = new OperatorConsole();

    // 1. AUDIT: Governance Dashboard Clarity
    console.log("[AUDIT] Generating Governance Dashboard snapshot...");
    const health: SystemHealth = {
        status: 'HEALTHY',
        version: '1.0.0-PROD',
        activeWitnesses: 5,
        lastFinalizedEpoch: 'EPOCH-42'
    };

    const metrics: EquilibriumMetrics = {
        quorumEntropy: 0.92,
        coalitionConcentration: 0.05,
        institutionalDependencyIndex: 0.01
    };

    const trustMap = new Map<string, InstitutionalTrustState>();
    trustMap.set("INST-1", InstitutionalTrustState.TRUSTED);
    trustMap.set("INST-2", InstitutionalTrustState.TRUSTED);
    trustMap.set("INST-3", InstitutionalTrustState.LIMITED_TRUST);
    trustMap.set("INST-4", InstitutionalTrustState.REVOKED);

    const dashboard = consoleUi.getDashboardSnapshot(health, metrics, trustMap);
    console.log(dashboard);

    if (dashboard.includes('STRONG') && dashboard.includes('TRUSTED      : 2')) {
        console.log("✅ PASS: Dashboard correctly visualized institutional health and pluralism.");
    } else {
        console.error("❌ FAIL: Dashboard visualization failed!");
        process.exit(1);
    }

    // 2. AUDIT: Forensic Evidence Export
    console.log("[AUDIT] Exporting audit-ready forensic evidence...");
    const trace = {
        decision: 'TRUST_UPDATE',
        participants: ['INST-1', 'INST-2'],
        weights: { 'INST-1': 100, 'INST-2': 100 },
        entropy: 1.0
    };

    const evidence = consoleUi.exportForensicEvidence("DEC-001", trace);
    console.log("[INFO] Forensic Export Sample:\n", evidence);

    if (evidence.includes('AUDIT_READY') && evidence.includes('DEC-001')) {
        console.log("✅ PASS: Forensic evidence correctly exported for independent audit.");
    } else {
        console.error("❌ FAIL: Forensic export failed!");
        process.exit(1);
    }

    // 3. AUDIT: Operator Alerting (Degraded State)
    console.log("[AUDIT] Testing operator alerting for degraded health...");
    const degradedHealth: SystemHealth = { ...health, status: 'DEGRADED' };
    const alertDashboard = consoleUi.getDashboardSnapshot(degradedHealth, metrics, trustMap);
    
    if (alertDashboard.includes('IMMEDIATE ACTION')) {
        console.log("✅ PASS: Operator console correctly flagged degraded system health.");
    } else {
        console.error("❌ FAIL: Alerting failed!");
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Production Readiness Verified (Operator-Ready).");
    fs.writeFileSync('readiness_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
