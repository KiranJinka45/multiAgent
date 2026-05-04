import { logger } from '@packages/observability';
import { GlobalCoordinator } from './global-coordinator';

export interface ChaosScenario {
  id: string;
  name: string;
  targets: { clusterId: string; serviceId: string; fault: 'LATENCY' | 'ERROR' | 'PARTITION' }[];
  durationMs: number;
}

export class GlobalChaosSimulator {
  private static activeScenario: ChaosScenario | null = null;
  private static timer: any = null;

  public static async startScenario(scenario: ChaosScenario) {
    if (this.activeScenario) {
      throw new Error('A scenario is already active');
    }

    this.activeScenario = scenario;
    logger.info({ scenarioId: scenario.id }, '[ChaosSimulator] Starting Global War Game');

    for (const target of scenario.targets) {
      await GlobalCoordinator.publishEvent({
        clusterId: target.clusterId,
        region: 'global', // Simulation context
        type: 'ANOMALY', // Trigger an anomaly in the target cluster
        payload: { 
          zScore: 6.0, 
          confidence: 0.95,
          simulated: true,
          fault: target.fault,
          service: target.serviceId
        }
      });
    }

    this.timer = setTimeout(() => this.stopScenario(), scenario.durationMs);
  }

  public static stopScenario() {
    if (!this.activeScenario) return;
    
    logger.info({ scenarioId: this.activeScenario.id }, '[ChaosSimulator] Scenario Completed');
    this.activeScenario = null;
    if (this.timer) clearTimeout(this.timer);
  }

  public static getStatus() {
    return {
      active: !!this.activeScenario,
      scenario: this.activeScenario
    };
  }
}
