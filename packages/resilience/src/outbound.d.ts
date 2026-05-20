import type { AxiosInstance } from 'axios';
interface OutboundClientOptions {
    serviceName: string;
    baseURL: string;
    timeout?: number;
    retries?: number;
    circuitBreaker?: {
        errorThresholdPercentage?: number;
        resetTimeout?: number;
    };
}
/**
 * Standardized Outbound HTTP Client
 *
 * Features:
 * 1. Exponential Retries (axios-retry)
 * 2. Circuit Breaker (opossum)
 * 3. Standard Timeouts
 * 4. Header Propagation (X-Request-ID via AsyncLocalStorage)
 */
export declare function createOutboundClient(options: OutboundClientOptions): AxiosInstance;
export {};
//# sourceMappingURL=outbound.d.ts.map