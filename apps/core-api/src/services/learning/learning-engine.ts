import { ErrorAnalyzer } from './error-analyzer.js';
import { KnowledgeStore } from './knowledge-store.js';
import { FixRecommender } from './fix-recommender.js';
import { logger } from '@packages/observability';

/**
 * Self-Improving Learning Engine
 * Orchestrates error analysis, knowledge accumulation, and fix recommendation.
 */
export class LearningEngine {
  /**
   * Processes an incident to learn from it.
   */
  public async learn(incident: any) {
    logger.info({ incidentId: incident.id }, '[LEARNING] Initiating learning cycle');

    // 1. Analyze what went wrong
    const analysis = await ErrorAnalyzer.analyze(incident.logs);

    // 2. Persist in knowledge base
    const knowledgeStore = new KnowledgeStore();
    await knowledgeStore.storeIncident({
      incidentId: incident.id,
      analysis,
      solution: incident.actionTaken
    });

    // 3. Update fix recommender
    const recommender = new FixRecommender();
    recommender.updateWeights(analysis, incident.outcome === 'RESOLVED' ? 1.0 : -0.5);

    logger.info('[LEARNING] Learning cycle complete. Knowledge base expanded.');
  }

  public async recommendFix(stderr: string): Promise<string | null> {
    return FixRecommender.recommendFix(stderr);
  }

  public async recordSuccess(stderr: string, fixStrategy: string): Promise<void> {
    const errors = ErrorAnalyzer.analyze(stderr);
    for (const error of errors) {
      const signature = error.message.slice(0, 100);
      await KnowledgeStore.recordFix(signature, fixStrategy);
    }
  }
}

export const learningEngine = new LearningEngine();
export { ErrorAnalyzer, KnowledgeStore, FixRecommender };
