/**
 * 🛡️ ZTAN Minimum Operational Core (MOC) Runtime Contracts
 * These interfaces define the absolute boundaries of the survivable runtime.
 * Any component entering the MOC MUST adhere to these contracts.
 */

export enum FailureClass {
    RECOVERABLE = 'RECOVERABLE',
    NON_RECOVERABLE = 'NON_RECOVERABLE',
    REPLAY_DIVERGENCE = 'REPLAY_DIVERGENCE',
    TRACE_CORRUPTION = 'TRACE_CORRUPTION',
    POLICY_VIOLATION = 'POLICY_VIOLATION',
    DEPLOYMENT_FAILURE = 'DEPLOYMENT_FAILURE',
    PERSISTENCE_FAILURE = 'PERSISTENCE_FAILURE'
}

export interface ITraceReceipt {
    version: string;
    missionId: string;
    timestamp: string;
    eventCount: number;
    environmentHash: string;
    modelVersion: string;
    platform: string;
    chainRoot: string;
    tailHash: string;      // Commits to the entire preceding chain
    signatureAlgorithm: string;
    signerKeyId: string;
    canonicalVersion: string;
    governanceReceipt: string; // Detached signature of the chainRoot
}

export interface ITraceBundle {
    receipt: ITraceReceipt;
    trace: IMissionEvent[];
}

export interface IMissionEvent {
    id: string;
    missionId: string;
    type: string;
    timestamp: string;
    payload: any;
    previousHash: string; // SHA-256 of the previous event
    eventHash: string;    // SHA-256 of (previousHash + payload)
    metadata: {
        stepIndex: number;
        agentId: string;
        reproducible: boolean;
        failureClass?: FailureClass;
    };
}

export interface ITraceRecorder {
    recordEvent(event: IMissionEvent): Promise<void>;
    getTrace(missionId: string): Promise<IMissionEvent[]>;
    flush(): Promise<void>;
}

export interface IPersistenceLayer {
    save(key: string, data: any): Promise<void>;
    load<T>(key: string): Promise<T | null>;
    exists(key: string): Promise<boolean>;
}

export interface IPolicyEnforcer {
    validateAction(missionId: string, action: any): Promise<{ allowed: boolean; reason?: string }>;
    recordDecision(missionId: string, decision: any): Promise<void>;
}

/**
 * 📊 Complexity Budgets
 * Enforced limits for architectural sustainability.
 */
export const COMPLEXITY_BUDGETS = {
    BUILD_TIME_MS: 30000,
    MODULE_FAN_OUT_MAX: 5,
    STARTUP_TIME_MS: 10000,
    CIRCULAR_DEPENDENCIES: 0,
    TRACE_REPLAY_LATENCY_MS: 5000,
};
