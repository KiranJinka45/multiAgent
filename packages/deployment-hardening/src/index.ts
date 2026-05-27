export interface ValidationResult {
    ready: boolean;
    risksDetected: string[];
    criticalBlockers: string[];
    score: number; // 0 - 100 deployment readiness score
}

export interface HardenedConfig {
    originalConfig: any;
    hardenedAt: number;
    securityLevel: 'MAXIMUM' | 'HIGH' | 'DEFAULT';
    enforcedSettings: Record<string, any>;
}

export function validateDeploymentReady(config: any): ValidationResult {
    const risksDetected: string[] = [];
    const criticalBlockers: string[] = [];
    
    // Check baseline configurations
    const debugMode = config?.debug ?? false;
    const sslForced = config?.forceSsl ?? false;
    const replicationCount = config?.maxReplicas ?? 1;
    const walEnabled = config?.walEnabled ?? false;
    const rateLimitEnabled = config?.rateLimitEnabled ?? false;

    if (debugMode) {
        risksDetected.push('RISK: Debug mode is active. This can expose sensitive internal logs in production.');
    }
    if (!sslForced) {
        criticalBlockers.push('BLOCKER: Secure transport (SSL/TLS) is not forced on communication channels.');
    }
    if (replicationCount > 10) {
        risksDetected.push(`RISK: Replication footprint (${replicationCount}) exceeds nominal economic budget bounds.`);
    }
    if (!walEnabled) {
        criticalBlockers.push('BLOCKER: Write-Ahead Log (WAL) is disabled. Replay durability cannot be guaranteed.');
    }
    if (!rateLimitEnabled) {
        risksDetected.push('RISK: Rate limiting is disabled. Susceptible to API flooding or denial of service.');
    }

    // Score calculation
    let score = 100;
    score -= criticalBlockers.length * 40;
    score -= risksDetected.length * 15;
    score = Math.max(0, score);

    const ready = criticalBlockers.length === 0 && score >= 70;

    return {
        ready,
        risksDetected,
        criticalBlockers,
        score
    };
}

export function applySafetyDefaults(config: any): HardenedConfig {
    const enforcedSettings: Record<string, any> = { ...config };
    
    // Force standard fail-closed properties
    enforcedSettings.debug = false;
    enforcedSettings.forceSsl = true;
    enforcedSettings.walEnabled = true;
    
    if (enforcedSettings.rateLimitEnabled === undefined) {
        enforcedSettings.rateLimitEnabled = true;
    }
    if (enforcedSettings.maxReplicas === undefined || enforcedSettings.maxReplicas > 5) {
        enforcedSettings.maxReplicas = 5; // Enforce maximum budget cap
    }

    return {
        originalConfig: config,
        hardenedAt: Date.now(),
        securityLevel: 'MAXIMUM',
        enforcedSettings
    };
}
