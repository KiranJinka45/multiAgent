import logger from '@config/logger';

export interface PerformanceMetrics {
    projectId: string;
    timestamp: number;
    latencyMs: number;
    errorRate: number;
    cpuLevel: number;
    memoryLevel: number;
}

export class PerformanceMonitor {
    private static metrics = new Map<string, PerformanceMetrics[]>();

    /**
     * Records telemetry from a running preview sandbox.
     */
    static recordMetric(metric: PerformanceMetrics) {
        const history = this.metrics.get(metric.projectId) || [];
        history.push(metric);
        
        // Keep only last 100 metrics
        if (history.length > 100) history.shift();
        
        this.metrics.set(metric.projectId, history);

        // Analyze for anomalies
        if (metric.latencyMs > 1000 || metric.errorRate > 0.05) {
            logger.warn({ projectId: metric.projectId, metric }, '[PerformanceMonitor] Performance degradation detected.');
        }
    }

    /**
     * Checks if a project requires an autonomous evolution mission.
     */
    static shouldExcite(projectId: string): boolean {
        const history = this.metrics.get(projectId);
        if (!history || history.length < 5) return false;

        // Simple threshold check: average latency > 800ms or any error
        const avgLatency = history.reduce((sum, m) => sum + m.latencyMs, 0) / history.length;
        return avgLatency > 800;
    }

    static getMetrics(projectId: string) {
        return this.metrics.get(projectId) || [];
    }
}
