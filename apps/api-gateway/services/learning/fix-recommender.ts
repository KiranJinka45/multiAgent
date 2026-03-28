import { ErrorAnalyzer, BuildError } from './error-analyzer';
import { KnowledgeStore } from './knowledge-store';
import { logger } from '@packages/utils/server';

export class FixRecommender {
    /**
     * Checks if any of the parsed errors have a known fix in the KnowledgeStore.
     */
    static async recommendFix(stderr: string): Promise<string | null> {
        const errors = ErrorAnalyzer.analyze(stderr);

        for (const error of errors) {
            const signature = this.generateSignature(error);
            const fix = await KnowledgeStore.findPattern(signature);
            if (fix) {
                logger.info({ signature, fixFound: true }, '[FixRecommender] Found matching fix pattern');
                return fix;
            }
        }

        return null;
    }

    /**
     * Generates a unique signature for an error to query the knowledge base.
     */
    private static generateSignature(error: BuildError): string {
        // Normalize error message (remove paths, line numbers for generic matching)
        let sig = error.message.toLowerCase();

        if (error.type === 'dependency') {
            // "module not found: x" -> "dependency:x"
            const match = sig.match(/module not found: error: can't resolve '(.+)'/);
            if (match) return `dependency:${match[1]}`;
        }

        if (error.type === 'syntax') {
            return `syntax:${sig.slice(0, 50)}`;
        }

        return `${error.type}:${sig.slice(0, 50)}`;
    }
}
