import logger from '../config/logger';
import { JobArtifact } from '@libs/contracts';

const FORBIDDEN_PATTERNS = [
    'rm -rf',
    'process.exit',
    'fs.unlink',
    'child_process.exec',
    'eval(',
    '/etc/passwd',
    '.env'
];

const MAX_PATCH_LENGTH = 5000;

/**
 * Principal-Level Security Guardrail for AI-Generated Patches
 * Prevents destructive commands and large hallucinations.
 */
export function validatePatchOrThrow(patch: JobArtifact): void {
    if (!patch || !patch.content) {
        throw new Error('Invalid patch: Missing content');
    }

    // 1. Size Guardrail (Hallucination detection)
    if (patch.content.length > MAX_PATCH_LENGTH) {
        logger.warn({ path: patch.path, size: patch.content.length }, '[SelfHealer] Patch rejected: Too large');
        throw new Error(`Patch too large (${patch.content.length} chars) - possible AI hallucination`);
    }

    // 2. Security Patterns Guardrail
    for (const pattern of FORBIDDEN_PATTERNS) {
        if (patch.content.includes(pattern)) {
            logger.error({ path: patch.path, pattern }, '[SelfHealer] Security violation detected');
            throw new Error(`Unsafe patch detected: Contains forbidden pattern "${pattern}"`);
        }
    }

    logger.info({ path: patch.path }, '[SelfHealer] Patch security check passed');
}

/**
 * Normalizes varied agent error formats into a standard string for comparison.
 */
export function normalizeError(error: unknown): string {
    if (!error) return 'unknown_error';
    if (typeof error === 'string') return error.toLowerCase();
    if (error instanceof Error) return error.message.toLowerCase();
    return JSON.stringify(error).toLowerCase();
}
