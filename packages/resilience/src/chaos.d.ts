/**
 * CONTINUOUS CHAOS RUNNER
 * Injects safe, non-destructive failure patterns to verify system resilience.
 */
export declare function runChaosCycle(): Promise<{
    timestamp: number;
    chaosInjected: boolean;
    layers: string[];
    success?: undefined;
    error?: undefined;
} | {
    success: boolean;
    error: unknown;
    timestamp?: undefined;
    chaosInjected?: undefined;
    layers?: undefined;
}>;
//# sourceMappingURL=chaos.d.ts.map