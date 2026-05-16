import { logger } from '@packages/observability';
import { sreEngine } from '../sre-engine.js';
import { CausalityMapper } from './causality-mapper.js';

export class CausalInterventionService {
  /**
   * Applies a causal intervention (Do-calculus) to a specific node in the topology.
   * This overrides the normal data flow to observe downstream effects.
   */
  public static async applyIntervention(nodeId: string, interventionValue: number) {
    logger.warn({ nodeId, interventionValue }, '[CAUSALITY] Applying manual causal intervention');

    // 1. Lock perception for the target node
    sreEngine.overridePerception(nodeId, interventionValue);

    // 2. Map causality
    await CausalityMapper.map(nodeId, interventionValue);

    logger.info({ nodeId }, '[CAUSALITY] Intervention applied. Monitoring for structural recovery.');
  }
}
