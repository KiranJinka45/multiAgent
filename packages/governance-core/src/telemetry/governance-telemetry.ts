/**
 * ────────────────────────────────────────────────────────────────────────────────
 * ZTAN Governance Gate Telemetry
 * ────────────────────────────────────────────────────────────────────────────────
 * Emits structured JSON log lines for each governance gate evaluation.
 * This enables individual per-layer audit evidence rather than aggregate claims.
 *
 * Expected output per gate:
 *   {"layer":"StaticCommandFilter","verdict":"PASS","proposalId":"abc","latencyMs":2,"timestamp":"..."}
 * ────────────────────────────────────────────────────────────────────────────────
 */

export type GateVerdict = 'PASS' | 'DENY' | 'ERROR';

export interface GateTelemetryEvent {
    /** Which governance layer produced this verdict */
    layer: string;
    /** PASS, DENY, or ERROR */
    verdict: GateVerdict;
    /** The proposal or objective identifier */
    proposalId?: string;
    /** Wall-clock latency of this gate's evaluation */
    latencyMs: number;
    /** Additional structured details (e.g., matchedPolicies, heuristicScore) */
    details?: Record<string, unknown>;
    /** ISO 8601 timestamp */
    timestamp: string;
}

/**
 * Emits a structured JSON telemetry event to stdout.
 * Each gate in the governance pipeline calls this once per evaluation.
 */
export function emitGateTelemetry(event: GateTelemetryEvent): void {
    console.log(JSON.stringify(event));
}

/**
 * Convenience wrapper that times an async gate function and emits telemetry.
 *
 * @example
 * const result = await timedGate('SemanticInspector', proposalId, async () => {
 *     return SemanticInspector.aggregate(payload);
 * });
 */
export async function timedGate<T>(
    layer: string,
    proposalId: string | undefined,
    gateFn: () => Promise<T>,
    verdictExtractor: (result: T) => GateVerdict,
    detailsExtractor?: (result: T) => Record<string, unknown>
): Promise<T> {
    const t0 = performance.now();
    let result: T;
    let verdict: GateVerdict;

    try {
        result = await gateFn();
        verdict = verdictExtractor(result);
    } catch (err: unknown) {
        const latencyMs = Math.round(performance.now() - t0);
        const errorMessage = err instanceof Error ? err.message : String(err);
        emitGateTelemetry({
            layer,
            verdict: 'ERROR',
            proposalId,
            latencyMs,
            details: { error: errorMessage },
            timestamp: new Date().toISOString()
        });
        throw err;
    }

    const latencyMs = Math.round(performance.now() - t0);
    emitGateTelemetry({
        layer,
        verdict,
        proposalId,
        latencyMs,
        details: detailsExtractor ? detailsExtractor(result) : undefined,
        timestamp: new Date().toISOString()
    });

    return result;
}

/**
 * Synchronous variant for gates that don't require async (e.g., StaticCommandFilter).
 */
export function timedGateSync<T>(
    layer: string,
    proposalId: string | undefined,
    gateFn: () => T,
    verdictExtractor: (result: T) => GateVerdict,
    detailsExtractor?: (result: T) => Record<string, unknown>
): T {
    const t0 = performance.now();
    let result: T;
    let verdict: GateVerdict;

    try {
        result = gateFn();
        verdict = verdictExtractor(result);
    } catch (err: unknown) {
        const latencyMs = Math.round(performance.now() - t0);
        const errorMessage = err instanceof Error ? err.message : String(err);
        emitGateTelemetry({
            layer,
            verdict: 'ERROR',
            proposalId,
            latencyMs,
            details: { error: errorMessage },
            timestamp: new Date().toISOString()
        });
        throw err;
    }

    const latencyMs = Math.round(performance.now() - t0);
    emitGateTelemetry({
        layer,
        verdict,
        proposalId,
        latencyMs,
        details: detailsExtractor ? detailsExtractor(result) : undefined,
        timestamp: new Date().toISOString()
    });

    return result;
}
