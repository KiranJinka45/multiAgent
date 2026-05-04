import { IntelligenceLoopService } from './IntelligenceLoopService';
import { eventBus } from '@packages/events';
import { logger } from '@packages/observability';
import { db } from '@packages/db';

/**
 * SLA ENFORCEMENT ENGINE (Intelligent Optimization Layer)
 * Transition from 'Reactive Control' to 'Self-Optimizing Intelligence'.
 */
export class SLAEngineService {
    private static interval: NodeJS.Timeout | null = null;
    private static readonly POLL_INTERVAL_MS = 5000;
    private static readonly CONTROL_VERSION = 'v1-control-engine';

    // Hard Guardrails (Step Limits)
    private static readonly SCALING_MAX_STEP = 3; 
    private static readonly COOLDOWN_DEFAULT = 60; 

    // Default Fallback Policies
    private static readonly DEFAULTS = {
        MAX_STREAM_LAG: 5000,
        LATENCY_SLA_MS: 1000,
    };

    static async start() {
        if (this.interval) return;
        logger.info('🧠 SLA Intelligence Engine starting...');
        this.interval = setInterval(() => this.tick(), this.POLL_INTERVAL_MS);
    }

    private static async tick() {
        try {
            const streamKey = 'platform:mission:events';
            const metrics = await eventBus.getStreamMetrics(streamKey);
            if (!metrics) return;

            const { length, pelSize, avgLatencyMs } = metrics as any;
            const redis = eventBus.getRedis();

            // 1. Learning Loop: Record current state for pattern detection
            await IntelligenceLoopService.recordMetric('stream_lag', length);
            await IntelligenceLoopService.recordMetric('latency_ms', avgLatencyMs);

            // 2. Adaptive Baselining: Shift thresholds based on historical hour-of-day patterns
            const historicalLagP90 = await IntelligenceLoopService.getAdaptiveBaseline('stream_lag');
            const adaptiveMaxLag = historicalLagP90 ? Math.max(this.DEFAULTS.MAX_STREAM_LAG, historicalLagP90 * 1.5) : this.DEFAULTS.MAX_STREAM_LAG;

            // 3. EMA & Acceleration (Control Layer)
            const currentLagEMAStr = await redis.get('system:telemetry:lag_ema');
            const currentLagEMA = currentLagEMAStr ? parseFloat(currentLagEMAStr) : length;
            const nextLagEMA = (length * 0.3) + (currentLagEMA * 0.7);
            await redis.set('system:telemetry:lag_ema', nextLagEMA.toString(), 'EX', 60);

            const lastVelocityStr = await redis.get('system:telemetry:last_velocity');
            const lastVelocity = lastVelocityStr ? parseFloat(lastVelocityStr) : 0;
            const prevLengthStr = await redis.get('system:telemetry:last_length');
            const prevLength = prevLengthStr ? parseInt(prevLengthStr, 10) : length;
            const currentVelocity = (length - prevLength) / (this.POLL_INTERVAL_MS / 1000);
            const acceleration = currentVelocity - lastVelocity;

            await redis.set('system:telemetry:last_length', length, 'EX', 60);
            await redis.set('system:telemetry:last_velocity', currentVelocity.toString(), 'EX', 60);

            // 4. Intelligent Scaling & ROI Verification (Feedback Loop)
            const lastScalingId = await redis.get('system:scaling:last_id');
            const lastLatencyStr = await redis.get('system:scaling:last_latency');
            const lastStrategy = await redis.get('system:scaling:last_strategy') || 'BALANCED';
            
            if (lastScalingId && lastLatencyStr) {
                // We just scaled recently. Measure the ROI and update the policy.
                await IntelligenceLoopService.recordScalingOutcome(
                    lastScalingId, 
                    parseFloat(lastLatencyStr), 
                    avgLatencyMs,
                    lastStrategy
                );

                // 🔥 PERSISTENT ROI AUDIT (Productization Phase)
                const improvement = Math.max(0, parseFloat(lastLatencyStr) - avgLatencyMs);
                const roi = improvement / parseFloat(lastLatencyStr);

                await db.scalingDecision.update({
                    where: { id: lastScalingId },
                    data: {
                        roi,
                        improvementPct: roi * 100
                    }
                });

                await redis.del('system:scaling:last_id');
                await redis.del('system:scaling:last_latency');
                await redis.del('system:scaling:last_strategy');
            }

            // 5. Policy Adaptation: Get current optimal strategy
            const strategy = await IntelligenceLoopService.getOptimalStrategy();
            const thresholdMultiplier = 1.0 / strategy.sensitivity;

            const cooldownKey = 'system:scaling:cooldown';
            // Trigger scaling if EMA exceeds adaptive threshold, adjusted by our current strategy sensitivity
            if (nextLagEMA > (adaptiveMaxLag * 0.5 * thresholdMultiplier) && currentVelocity > 0 && !(await redis.get(cooldownKey))) {
                const scalingId = `scale_${Date.now()}`;
                logger.info({ strategy: strategy.name, sensitivity: strategy.sensitivity, nextLagEMA }, '🚀 SLA Engine: Reinforced Scaling Trigger');
                
                await redis.set(cooldownKey, '1', 'EX', 60);
                await redis.set('system:scaling:last_id', scalingId);
                await redis.set('system:scaling:last_latency', avgLatencyMs.toString());
                await redis.set('system:scaling:last_strategy', strategy.name);
                
                // 🔥 PERSISTENT DECISION LOG (Productization Phase)
                const slaPredictionS = currentVelocity > 0 ? (adaptiveMaxLag - nextLagEMA) / currentVelocity : 999;
                const reason = `SLA Breach predicted in ${slaPredictionS.toFixed(1)}s. Lag EMA (${nextLagEMA.toFixed(0)}) velocity is +${currentVelocity.toFixed(1)}/sec. Mode: ${strategy.name}`;
                
                await db.scalingDecision.create({
                    data: {
                        id: scalingId,
                        type: 'UP',
                        strategy: strategy.name,
                        reason,
                        metrics: { 
                            ema: nextLagEMA, 
                            baseline: adaptiveMaxLag, 
                            velocity: currentVelocity,
                            acceleration,
                            predictedBreachS: slaPredictionS
                        }
                    }
                });

                await redis.publish('system:scaling:request', JSON.stringify({ 
                    id: scalingId,
                    type: 'WORKER_UP', 
                    strategy: strategy.name,
                    version: this.CONTROL_VERSION,
                    metrics: { ema: nextLagEMA, baseline: adaptiveMaxLag, velocity: currentVelocity } 
                }));
            }

            // 6. Autonomous Circuit Lifecycle
            const { CircuitBreaker } = require('@packages/utils');
            if (nextLagEMA > adaptiveMaxLag * 3 || acceleration > 100) {
                await CircuitBreaker.trip(`Catastrophic Breach vs Adaptive Baseline: ${acceleration.toFixed(2)} accel`, 45);
                await this.applyGuardrail('CIRCUIT_TRIP', `Adaptive safety violation detected. Mode: ${strategy.name}`);
            }

            logger.debug({ ema: nextLagEMA, baseline: adaptiveMaxLag, accel: acceleration }, '🧠 Intelligence Loop Complete');

        } catch (err) {
            logger.error({ err }, '❌ SLA Engine Intelligence Tick Failed');
        }
    }

    private static async applyGuardrail(type: string, reason: string) {
        logger.warn({ type, reason }, `🚨 SLA GUARDRAIL: ${type}`);
        await db.auditLog.create({
            data: {
                action: 'SLA_GUARDRAIL_TRIGGER',
                resource: 'system:governance',
                status: 'WARNING',
                metadata: { type, reason, timestamp: new Date().toISOString() }
            }
        });
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
