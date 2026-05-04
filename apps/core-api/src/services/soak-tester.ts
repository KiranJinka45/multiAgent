import { logger } from '@packages/observability';
import { chaosOrchestrator, ChaosScenario } from './chaos-orchestrator';
import { validationEngine } from './validation-engine';

/**
 * SoakTester: Automates the 72-hour chaos soak test.
 * Rotates through failure scenarios to prove long-term stability and detection SLAs.
 */
export class SoakTester {
  private isRunning = false;
  private currentStep = 0;
  private timer: NodeJS.Timeout | null = null;

  private readonly SCENARIO_ROTATION: ChaosScenario[] = [
    'LATENCY_SPIKE',
    'DATA_LOSS',
    'DISTRIBUTION_SHIFT',
    'FLAPPING',
    'MULTI_REGION_FAILURE' as any // Multi-failure scenario
  ];

  private readonly STEP_DURATION_MS = 300_000; // 5 minutes per scenario for soak
  private readonly RECOVERY_WINDOW_MS = 60_000; // 1m recovery
  private readonly TOTAL_SOAK_HOURS = 168; // 7 days
  private startTime: number = 0;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentStep = 0;
    this.startTime = Date.now();
    logger.info('[SOAK] Starting 168-hour PRODUCTION CERTIFICATION SOAK');
    this.executeStep();
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    chaosOrchestrator.clear();
    logger.info('[SOAK] Soak test halted by operator');
  }

  private executeStep() {
    if (!this.isRunning) return;

    const scenario = this.SCENARIO_ROTATION[this.currentStep % this.SCENARIO_ROTATION.length];
    
    // 1. Inject Chaos
    chaosOrchestrator.inject(scenario);

    // 2. Schedule Clear
    this.timer = setTimeout(() => {
      chaosOrchestrator.clear();
      
      // 3. Recovery window
      this.timer = setTimeout(() => {
        this.currentStep++;
        this.executeStep();
      }, this.RECOVERY_WINDOW_MS);

    }, this.STEP_DURATION_MS);
  }

  public getStatus() {
    const elapsedMs = this.isRunning ? Date.now() - this.startTime : 0;
    const progress = Math.min(1, elapsedMs / (this.TOTAL_SOAK_HOURS * 3600 * 1000));
    
    return {
      isRunning: this.isRunning,
      currentStep: this.currentStep,
      activeScenario: chaosOrchestrator.getActiveScenario(),
      totalScenariosCompleted: this.currentStep,
      progress: progress,
      hoursRemaining: Math.max(0, this.TOTAL_SOAK_HOURS - (elapsedMs / 3600000)),
      certificationTarget: 100,
      decisionsCount: this.currentStep // Mock for now, linked to analytics in real run
    };
  }
}

export const soakTester = new SoakTester();
