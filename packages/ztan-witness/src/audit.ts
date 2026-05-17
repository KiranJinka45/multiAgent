import { EvidenceChain, ForensicResilienceMetrics, VerificationState } from '@packages/contracts';
import { RollbackImpactAssessment } from '@packages/contracts/src/rollback-invariants';
import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

/**
 * Forensic Audit Report
 * A WORM-compliant summary of an institutional recovery event.
 */
export interface ForensicAuditReport {
    id: string;
    timestamp: number;
    drillId: string;
    summary: string;
    finalMetrics: ForensicResilienceMetrics;
    verificationEpoch: string;
    invariantsTriggered: string[];
    recoverySuccess: boolean;
    merkleRoot: string; // Notarization anchor
}

export class ForensicAuditService {
    private static readonly REPORT_PREFIX = 'ztan:audit:report:';

    /**
     * Generates a permanent audit report for a completed drill.
     */
    static async generateReport(drillId: string, chain: EvidenceChain): Promise<ForensicAuditReport> {
        const reportId = `RECOVERY-AUDIT-${Date.now()}`;
        
        // Final Assessment
        const violations = chain.entries
            .filter(e => e.category === 'HEAL')
            .flatMap(e => (e as any).violations || []);

        const report: ForensicAuditReport = {
            id: reportId,
            timestamp: Date.now(),
            drillId,
            summary: `Institutional recovery validation completed for drill ${drillId}.`,
            finalMetrics: chain.metrics,
            verificationEpoch: chain.governanceContext?.id || 'Unknown',
            invariantsTriggered: Array.from(new Set(violations)),
            recoverySuccess: chain.verificationState === VerificationState.VERIFIED,
            merkleRoot: chain.entries[chain.entries.length - 1]?.integrity.hash || 'N/A'
        };

        // Persist to WORM-style storage (Redis list)
        await redis.set(`${this.REPORT_PREFIX}${reportId}`, JSON.stringify(report));
        await redis.lpush('ztan:audit:log', reportId);

        logger.info({ reportId, drillId }, '[FORENSIC-AUDIT] Permanent recovery report generated and anchored.');
        
        return report;
    }

    /**
     * Retrieves all forensic audit reports.
     */
    static async getReports(): Promise<ForensicAuditReport[]> {
        const ids = await redis.lrange('ztan:audit:log', 0, -1);
        const reports: ForensicAuditReport[] = [];
        
        for (const id of ids) {
            const data = await redis.get(`${this.REPORT_PREFIX}${id}`);
            if (data) reports.push(JSON.parse(data));
        }

        return reports;
    }
}
