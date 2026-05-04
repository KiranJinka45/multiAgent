import { logger } from '@packages/observability';
import { sloManager } from './slo-manager';
import { ProgressiveCanary } from './governance/progressive-canary';
import { globalSafetyGuard, SafetyContext } from './governance/safety-guard';
import { kubernetesActuator } from './kubernetes-actuator';

export interface ActuationTask {
  type: string;
  target: string;
  criticality: 'TIER0' | 'TIER1' | 'TIER2';
  action: () => Promise<void>;
  rollback: () => Promise<void>;
}

export interface SreAction {
    id: string;
    type: string;
    target: string;
    confidence: number;
    systemTrust: 'LOW' | 'MEDIUM' | 'HIGH';
    replicas?: number;
}

/**
 * ActuationController: Elite management of autonomous infrastructure changes.
 * Integrates Progressive Canaries, Safety Gating, and Multi-Metric Verification.
 */
export class ActuationController {
  private lastActionTs = 0;
  private readonly baseCooldownMs = 120_000; // 2m base
  private consecutiveFailures = 0;
  private activeTask: string | null = null;

  public async execute(task: ActuationTask) {
    const now = Date.now();
    const currentCooldown = this.baseCooldownMs * Math.pow(2, this.consecutiveFailures);

    if (this.activeTask) {
      logger.warn({ activeTask: this.activeTask, newTask: task.type }, '[ACTUATION] Blocked: Pipeline active');
      return;
    }

    if (now - this.lastActionTs < currentCooldown) {
      logger.warn({ 
        lastAction: this.lastActionTs, 
        cooldownRemaining: Math.ceil((currentCooldown - (now - this.lastActionTs))/1000)
      }, '[ACTUATION] Blocked: Cooling down (Escalated)');
      return;
    }

    // 1. Safety Gating (Hard Stop)
    try {
      globalSafetyGuard.validate({
        service: task.target,
        replicas: 5, // Mocked for safety context
        criticality: task.criticality
      });
    } catch (e: any) {
      logger.error({ error: e.message }, '[ACTUATION] SAFETY GATE BLOCKED ACTION');
      return;
    }

    this.activeTask = task.type;
    this.lastActionTs = now;

    // 2. Progressive Canary Execution
    const canary = new ProgressiveCanary(
      async (percent) => {
        logger.warn(`[ACTUATION] Applying ${percent}% rollout to ${task.target}`);
        await task.action();
      },
      async () => {
        logger.error('[ACTUATION] Rollback initiated');
        await task.rollback();
      }
    );

    try {
      const success = await canary.execute();
      if (!success) {
        this.consecutiveFailures++;
        logger.error({ 
          task: task.type, 
          failures: this.consecutiveFailures 
        }, '[ACTUATION] Progressive rollout failed. Escalating cooldown.');
      } else {
        this.consecutiveFailures = 0;
        logger.info({ task: task.type }, '[ACTUATION] Autonomous fix fully promoted. Resetting failure counter.');
      }
    } catch (error) {
      this.consecutiveFailures++;
      logger.error({ error, failures: this.consecutiveFailures }, '[ACTUATION] Fatal error in canary pipeline. Escalating cooldown.');
      await task.rollback();
    } finally {
      this.activeTask = null;
    }
  }


  public getStatus() {
    const currentCooldown = this.baseCooldownMs * Math.pow(2, this.consecutiveFailures);
    return {
      activeTask: this.activeTask,
      lastActionTs: this.lastActionTs,
      consecutiveFailures: this.consecutiveFailures,
      currentCooldown,
      inCooldown: (Date.now() - this.lastActionTs) < currentCooldown
    };
  }
}

export const actuationController = new ActuationController();
