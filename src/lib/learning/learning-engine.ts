import { ErrorAnalyzer } from './error-analyzer';
import { KnowledgeStore } from './knowledge-store';
import { FixRecommender } from './fix-recommender';
import logger from '../logger';

/**
 * Self-Improving Learning Engine
 * Bridges the gap between raw build errors and structured fix patterns.
 */
export class LearningEngine {
    /**
     * Checks if a previous successful fix exists for this specific error signature.
     */
    async recommendFix(error: string): Promise<string | null> {
        return FixRecommender.recommendFix(error);
    }

    /**
     * Records a new successful patch fix against an initial error condition.
     */
    async recordSuccess(error: string, appliedPatchSummary: string) {
        const errors = ErrorAnalyzer.analyze(error);
        if (errors.length === 0) return;

        const primaryError = errors[0];
        const signature = this.generateSignature(primaryError);

        logger.info({ signature }, '[LearningEngine] Recording successful fix strategy');
        await KnowledgeStore.recordFix(signature, appliedPatchSummary);
    }

    private generateSignature(error: any): string {
        return `${error.type}:${error.message.toLowerCase().slice(0, 50)}`;
    }
}

export const learningEngine = new LearningEngine();
export { ErrorAnalyzer, KnowledgeStore, FixRecommender };
