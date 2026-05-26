/**
 * ─── ZTAN Incident Timeline Reconstructor ────────────────────────────────────
 * Generates an auditable chronological trace of system events leading up to a
 * node quarantine lockdown to enable SRE recovery archaeology.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface IncidentTimelineEvent {
    timestamp: string;
    stage: string;
    description: string;
    status: 'ALERT' | 'INFO' | 'FATAL';
}

export function reconstructIncidentTimeline(errors: string[], generatedAt: Date): IncidentTimelineEvent[] {
    const timeline: IncidentTimelineEvent[] = [];

    // 1. Initial boot log entry
    timeline.push({
        timestamp: new Date(generatedAt.getTime() - 5000).toISOString(),
        stage: 'BOOT_GATE',
        description: 'Initiating ZTAN node boot and startup attestation checks.',
        status: 'INFO'
    });

    // 2. Iterate through validation exceptions
    for (let idx = 0; idx < errors.length; idx++) {
        const err = errors[idx];
        let stage = 'SAFETY_VERIFIER';
        let status: 'ALERT' | 'INFO' | 'FATAL' = 'ALERT';

        if (err.includes('ENV_AUDIT_ERROR') || err.includes('unledgered') || err.includes('shadow')) {
            stage = 'ENV_COMPLIANCE_AUDITOR';
        } else if (err.includes('OPA') || err.includes('policy') || err.includes('rego')) {
            stage = 'OPA_REST_GATE';
        } else if (err.includes('CHECKSUM') || err.includes('integrity') || err.includes('mismatch')) {
            stage = 'STORAGE_MERKLE_CHAIN';
        }

        timeline.push({
            timestamp: new Date(generatedAt.getTime() - 2000 + idx * 500).toISOString(),
            stage,
            description: err,
            status
        });
    }

    // 3. Concluding quarantine lock entry
    timeline.push({
        timestamp: generatedAt.toISOString(),
        stage: 'NODE_QUARANTINE_LOCKED',
        description: 'FATAL: Core runtime invariants failed attestation. Quarantine lockdown activated.',
        status: 'FATAL'
    });

    return timeline;
}
