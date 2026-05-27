import crypto from 'crypto';

export interface ReplayAuditResult {
    verdict: string;
    stateChecksum: string;
    timelineReplayed: string[];
}

/**
 * ─── ZTAN Recovery Consistency Scanner ────────────────────────────────────────
 * Audits incident snapshots and replays the evidence deterministically to
 * verify identical recovery results (zero drift) from identical incident traces.
 * ────────────────────────────────────────────────────────────────────────────
 */
export class RecoveryConsistencyScanner {
    
    /**
     * Programmatically replays forensic evidence to generate a deterministic output signature
     */
    public scanIncidentSnapshot(incidentJsonContent: string): ReplayAuditResult {
        let bundle: any;
        try {
            bundle = JSON.parse(incidentJsonContent);
        } catch (e: any) {
            throw new Error(`[Consistency Scanner] Malformed incident JSON: ${e.message}`);
        }

        const timeline = bundle.timeline || [];
        const environment = bundle.environment || {};
        const verdict = bundle.verdict?.verdict || 'UNKNOWN_VERDICT';

        // Deterministically compute state checksum from timeline events and environment
        const hash = crypto.createHash('sha256');
        
        // Hash the verdict
        hash.update(verdict);
        
        // Hash env vars keys to enforce env sanity
        const envKeys = Object.keys(environment.allKeysHashed || {}).sort();
        for (const key of envKeys) {
            hash.update(key);
            hash.update(environment.allKeysHashed[key]);
        }

        // Hash timeline event descriptions chronologically
        const eventLogs: string[] = [];
        for (const event of timeline) {
            const entry = `[${event.timestamp}] [${event.source}] ${event.description}`;
            hash.update(entry);
            eventLogs.push(entry);
        }

        const stateChecksum = hash.digest('hex');

        return {
            verdict,
            stateChecksum,
            timelineReplayed: eventLogs
        };
    }

    /**
     * Asserts that replaying the same incident content multiple times yields identical outcomes
     */
    public verifyReplayDeterminism(incidentJson1: string, incidentJson2: string): { consistent: boolean; diffs?: string[] } {
        const result1 = this.scanIncidentSnapshot(incidentJson1);
        const result2 = this.scanIncidentSnapshot(incidentJson2);
        
        const diffs: string[] = [];

        if (result1.verdict !== result2.verdict) {
            diffs.push(`VERDICT_MISMATCH: Run 1 resolved to '${result1.verdict}', Run 2 resolved to '${result2.verdict}'.`);
        }

        if (result1.stateChecksum !== result2.stateChecksum) {
            diffs.push(`CHECKSUM_MISMATCH: Run 1 state checksum '${result1.stateChecksum}', Run 2 state checksum '${result2.stateChecksum}'.`);
        }

        if (result1.timelineReplayed.length !== result2.timelineReplayed.length) {
            diffs.push(`TIMELINE_LENGTH_MISMATCH: Run 1 has ${result1.timelineReplayed.length} events, Run 2 has ${result2.timelineReplayed.length} events.`);
        }

        return {
            consistent: diffs.length === 0,
            diffs: diffs.length > 0 ? diffs : undefined
        };
    }
}
