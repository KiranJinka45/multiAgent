export interface StateSummary {
    epoch: number;
    activeRulesCount: number;
    driftDetected: boolean;
    cognitiveLoadScore: number; // 0-100 score indicating cognitive load
    summaryMessage: string;
}

export interface GuidanceReport {
    incidentId: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    guidance: string[];
    remediationAction: string;
    timestamp: number;
}

export function summarizeGovernanceState(telemetry: any): StateSummary {
    const epoch = telemetry?.epoch ?? 1;
    const activeRulesCount = telemetry?.activeRulesCount ?? 5;
    const driftDetected = telemetry?.driftDetected ?? false;
    
    // Cognitive load logic based on alerts, latency, and drift
    const activeAlerts = telemetry?.activeAlertCount ?? 0;
    const latencyMs = telemetry?.latencyMs ?? 50;
    
    let score = 10; // baseline
    score += activeAlerts * 15;
    if (latencyMs > 200) score += 20;
    if (driftDetected) score += 30;
    
    // Cap score at 100
    const cognitiveLoadScore = Math.min(score, 100);
    
    let summaryMessage = 'System operating nominally. Operator cognitive load is low.';
    if (cognitiveLoadScore > 75) {
        summaryMessage = 'WARNING: High operator cognitive load detected. Immediate remediation recommended.';
    } else if (cognitiveLoadScore > 40) {
        summaryMessage = 'Moderate attention required. Non-critical state drift or latency observed.';
    }

    return {
        epoch,
        activeRulesCount,
        driftDetected,
        cognitiveLoadScore,
        summaryMessage
    };
}

export function generateRecoveryGuidance(incident: any): GuidanceReport {
    const incidentId = incident?.id ?? `INC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const type = incident?.type ?? 'UNKNOWN_ANOMALY';
    const severity = incident?.severity ?? 'MEDIUM';
    
    const guidance: string[] = [];
    let remediationAction = 'Standard cluster observation protocol.';

    switch (type) {
        case 'REGION_LOSS_SIM':
        case 'REGION_LOSS':
            guidance.push('1. Isolate the affected region immediately using the control plane.');
            guidance.push('2. Redirect global network traffic to remaining healthy regional replicas.');
            guidance.push('3. Check and confirm database replication lag on secondary databases.');
            remediationAction = 'EXECUTE FAILOVER: Re-route active transactions to EU-WEST-1 / US-EAST-1.';
            break;
        case 'RECOVERY_DRIFT':
        case 'STATE_DRIFT':
            guidance.push('1. Run structural drift check (ztanctl ops diagnose).');
            guidance.push('2. Re-apply desired state configuration (ztanctl infra reconcile).');
            guidance.push('3. Verify that database schema unique constraints are intact.');
            remediationAction = 'APPLY RECONCILIATION: Align local configurations with canonical Git state.';
            break;
        case 'DEPENDENCY_CORRUPTION':
            guidance.push('1. Quarantined mutated files and freeze deployment pipeline.');
            guidance.push('2. Fetch and restore the certified SHA-256 baseline signature.');
            guidance.push('3. Re-verify the NIST P-256 asymmetric cryptographic witness chain.');
            remediationAction = 'EXECUTE SAFE RESTORE: Restore verified packages from local package registry cache.';
            break;
        default:
            guidance.push('1. Monitor system metrics and audit logs for anomalous activity.');
            guidance.push('2. Keep track of transaction rollback rates and outbox buffer parity.');
            remediationAction = 'OBSERVE & RE-EVALUATE: Analyze system logs for unexpected behavior patterns.';
            break;
    }

    return {
        incidentId,
        severity,
        guidance,
        remediationAction,
        timestamp: Date.now()
    };
}
