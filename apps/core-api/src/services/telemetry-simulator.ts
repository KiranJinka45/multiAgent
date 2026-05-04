import { telemetryIngestion } from './telemetry-ingestion.service';
import { logger } from '@packages/observability';
import { v4 as uuid } from 'uuid';
import { chaosOrchestrator } from './chaos-orchestrator';

export class TelemetrySimulator {
    private activeInterval: NodeJS.Timeout | null = null;
    private isHealing = false;
    private healingUntil = 0;

    public setHealing(durationMs: number) {
        this.isHealing = true;
        this.healingUntil = Date.now() + durationMs;
        chaosOrchestrator.clear(); // Clear any active chaos scenarios
        logger.info({ durationMs, until: new Date(this.healingUntil).toISOString() }, '[TelemetrySimulator] Recovery state initiated');
    }

    public start() {
        if (this.activeInterval) return;

        logger.info('[TelemetrySimulator] Started synthetic telemetry generation.');

        this.activeInterval = setInterval(() => {
            if (this.isHealing && Date.now() > this.healingUntil) {
                this.isHealing = false;
                logger.info('[TelemetrySimulator] Recovery state ended');
            }

            const isDegraded = this.isHealing ? false : Math.random() > 0.8;
            
            let errorRate = this.isHealing ? 0.005 : (isDegraded ? 0.5 : 0.01);

            // Apply chaos if not healing
            if (!this.isHealing) {
                const activeScenario = chaosOrchestrator.getActiveScenario();
                const scenarios = ['DATA_LOSS', 'LATENCY_SPIKE', 'FLAPPING', 'DEPENDENCY_FAILURE', 'RETRY_STORM'];
                if (scenarios.includes(activeScenario || '')) {
                    errorRate = activeScenario === 'RETRY_STORM' ? 0.15 : 1.0;
                }
            }


            const latency = this.isHealing ? 45 + Math.random() * 5 : (isDegraded ? 2000 : 150);

            const nodeId = `sim-node-${Math.floor(Math.random() * 5)}`;
            const providers = ['OpenAI-Sim', 'Anthropic-Sim', 'Google-Sim', 'Azure-Sim', 'Meta-Sim'];
            const provider = providers[Math.floor(Math.random() * providers.length)];

            telemetryIngestion.ingestApiMetrics({
                id: nodeId,
                provider: provider,
                latencyMs: latency + Math.random() * 50,
                status: errorRate > 0.1 ? 500 : 200
            });

            telemetryIngestion.ingestPrediction({
                confidence: errorRate > 0.1 ? 0.8 : 0.95,
                outcome: errorRate > 0.1 ? 0 : 1
            });
            
        }, 1000);
    }

    public stop() {
        if (this.activeInterval) {
            clearInterval(this.activeInterval);
            this.activeInterval = null;
        }
    }

    public reset() {
        this.isHealing = false;
        this.healingUntil = 0;
        chaosOrchestrator.clear();
        logger.info('[TelemetrySimulator] State reset');
    }
}

export const telemetrySimulator = new TelemetrySimulator();
