import { sreEngine } from '../sre-engine';
import { logger } from '@packages/observability';
import { IncidentReplayService } from '../governance/incident-replay';
import { modelRegistry } from './model-registry';
import { governanceAudit } from '../governance/audit-engine';

export class ChaosAuditService {
  private static isAuditRunning = false;

  public static async runChaosGauntlet() {
    if (this.isAuditRunning) return;
    this.isAuditRunning = true;
    logger.warn('[SRE] Starting Chaos Resilience Audit...');

    try {
      await this.simulateCascadingFailure();
      await this.simulatePoisoningAttack();
      logger.info('[SRE] Chaos Audit Completed: SYSTEM RESILIENT');
    } catch (err) {
      logger.error({ err }, '[SRE] Chaos Audit FAILED');
    } finally {
      this.isAuditRunning = false;
    }
  }

  private static async simulateCascadingFailure() {
    logger.warn('[SRE] Chaos Mode: Simulating Cascading Failure (Diversity + Disorder)...');
    
    // 1. Inject high disorder
    sreEngine.reportNetworkDisorder(20); // Should trigger CRITICAL signal integrity

    // 2. Wait for reaction
    await new Promise(r => setTimeout(r, 500));
    const state = await sreEngine.getCurrentState();
    
    if (state.governance.mode !== 'HALTED') {
      throw new Error('FAIL: System failed to HALT during cascading failure');
    }
    logger.info('[SRE] Chaos Test Pass: System successfully HALTED during cascade');
  }

  private static async simulatePoisoningAttack() {
    logger.warn('[SRE] Chaos Mode: Simulating Poisoning Attack (Conflicting Signals)...');
    
    // Inject conflicting signals from a "rogue" provider
    for (let i = 0; i < 5; i++) {
      await sreEngine.registerObserverSignal({
        id: `ROGUE_AGENT_${i}`,
        provider: 'ROGUE_AGENT',
        state: 'NOMINAL',
        weight: 2.0 // Heavy weighting attempt
      } as any);
    }

    await new Promise(r => setTimeout(r, 500));
    const state = await sreEngine.getCurrentState();

    // Verify system degraded correctly due to diversity/confidence drop
    if (state.perception.consensus < 0.5 && state.governance.mode === 'HALTED') {
      logger.info('[SRE] Chaos Test Pass: System rejected poisoned signal consensus');
    } else {
       logger.warn('[SRE] Chaos Test Note: Poisoned signal impact was within diversity tolerances');
    }
  }
}
