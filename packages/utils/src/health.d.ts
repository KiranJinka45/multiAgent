import { Router } from 'express';
/**
 * Standardized Health Check Router
 * Provides both minimal (/health) and detailed (/health/details) endpoints.
 */
export declare function createHealthRouter(options: {
    serviceName: string;
    checkDependencies?: () => Promise<Record<string, {
        status: string;
        message?: string;
    }>>;
}): Router;
//# sourceMappingURL=health.d.ts.map