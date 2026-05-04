export type SystemMode = 'NORMAL' | 'DEGRADED' | 'PROTECT' | 'EMERGENCY';
export interface SystemState {
    failureRate: number;
    retryRate: number;
    queueDepth: number;
    activeWorkers: number;
    latencyP95Ms: number;
}
export declare function evaluateMode(state: SystemState): SystemMode;
export interface ErrorBudgetStatus {
    burnRate: number;
    budgetRemaining: number;
    isExhausted: boolean;
    blockDeployments: boolean;
    shedNonCriticalTraffic: boolean;
}
export declare function calculateErrorBudget(failureRate: number, windowMinutes?: number): ErrorBudgetStatus;
export declare class ControlPlane {
    private redis;
    private intervalHandle;
    private currentMode;
    private previousMode;
    private modeStableSince;
    private errorsAtModeEntry;
    private missionsAtModeEntry;
    private effectivenessScore;
    private errorsBeforeEscalation;
    private readonly STABILITY_WINDOW_MS;
    private readonly EVAL_INTERVAL_MS;
    static get MODE_KEY(): string;
    static get STATE_KEY(): string;
    static get BUDGET_KEY(): string;
    private loadSheddingTotal;
    private requestsRejectedTotal;
    private controlPlaneModeGauge;
    private controlPlaneEvaluationLatency;
    private controlPlaneModeChangesTotal;
    private controlPlaneFailuresTotal;
    static localState: {
        mode: SystemMode;
        version: number;
        updatedAt: number;
    };
    constructor(redisClient: any);
    getSystemState(): Promise<SystemState>;
    evaluate(): Promise<{
        mode: SystemMode;
        state: SystemState;
        budget: ErrorBudgetStatus;
    } | null>;
    private distributeMode;
    static getRegionModeSafe(redis: any, regionId: string): Promise<SystemMode>;
    static getModeSafe(redis: any, defaultEscalation?: SystemMode): Promise<SystemMode>;
    static escalate(mode: SystemMode, defaultFallback: SystemMode): SystemMode;
    static getErrorBudget(redis: any): Promise<ErrorBudgetStatus | null>;
    start(): void;
    stop(): void;
    getMode(): SystemMode;
}
export declare class ControlPlaneMetrics {
    static recordJobResult(redis: any, status: 'success' | 'failed'): Promise<void>;
    static recordRetry(redis: any): Promise<void>;
    static recordLatencyP95(redis: any, latencyMs: number): Promise<void>;
    static incrementRetryRate(redis: any, tenantId?: string, tier?: string): Promise<void>;
    static getRetryRate(redis: any, tenantId?: string, tier?: string): Promise<number>;
}
//# sourceMappingURL=control-plane.d.ts.map