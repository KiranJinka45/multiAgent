import { logger } from '@packages/observability';

export const SLO_THRESHOLDS = {
    LATENCY_P95_SECONDS: 300, // 5 minutes for heavy AI jobs
};

export class SLOService {
    static checkLatency(queueName: string, durationSeconds: number) {
        if (durationSeconds > SLO_THRESHOLDS.LATENCY_P95_SECONDS) {
            logger.warn({ 
                queueName, 
                durationSeconds, 
                threshold: SLO_THRESHOLDS.LATENCY_P95_SECONDS 
            }, '🚨 [SLO ALERT] Latency threshold breached');
        }
    }
}
