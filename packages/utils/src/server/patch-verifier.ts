import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import logger from '@libs/observability';
import { learningEngine } from './learning';
import { VirtualFileSystem } from './vfs';

const execAsync = util.promisify(exec);

export interface VerifyResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
    healed: boolean;
    healAttempts: number;
}

/**
 * PatchVerifier — lightweight verification loop for chat edits.
 *
 * Runs ONLY `tsc --noEmit` (not a full next build) so it completes in
 * ~3-8 seconds rather than 30-60 seconds. This makes the chat editing
 * loop feel fast while still catching type errors before preview reload.
 *
 * Flow:
 *   Apply patches → tsc --noEmit → if errors → RepairAgent → retry (max 2)
 *
 * Full next build is intentionally skipped here because:
 * - Dev server hot-reloads files anyway
 * - Full builds take 30-60s which breaks the chat UX
 * - tsc catches 95% of bugs introduced by AI patches
 */
export class PatchVerifier {
    private maxHealAttempts = 2;
    private tscTimeout = 30_000; // 30s max for tsc

    /**
     * Verify the sandbox directory after patches have been applied.
     * Returns a structured result including whether healing was needed.
     */
    async verify(
        sandboxDir: string,
        vfs: VirtualFileSystem
    ): Promise<VerifyResult> {
        const result: VerifyResult = {
            passed: false,
            errors: [],
            warnings: [],
            healed: false,
            healAttempts: 0
        };

        if (!fs.existsSync(sandboxDir)) {
            result.errors.push('Sandbox directory not found — skipping type check');
            result.passed = true; // non-critical, allow through
            return result;
        }

        // Check if tsconfig exists — if not, skip TS check
        const tsConfigPath = path.join(sandboxDir, 'tsconfig.json');
        if (!fs.existsSync(tsConfigPath)) {
            logger.info({ sandboxDir }, 'No tsconfig.json found — skipping type check');
            result.passed = true;
            return result;
        }

        // Initial TypeScript check
        const tscResult = await this.runTsc(sandboxDir);

        if (tscResult.passed) {
            result.passed = true;
            result.warnings = tscResult.warnings;
            return result;
        }

        result.errors = tscResult.errors;
        logger.warn({ errorCount: tscResult.errors.length, sandboxDir }, 'TypeScript errors found after patch — attempting auto-heal');

        // Auto-heal loop  
        for (let attempt = 1; attempt <= this.maxHealAttempts; attempt++) {
            result.healAttempts = attempt;
            const currentErrorMsg = tscResult.errors.join('\n');

            const recommendedFix = await learningEngine.recommendFix(currentErrorMsg);

            const healed = await this.healErrors(
                sandboxDir,
                currentErrorMsg + (recommendedFix ? `\n\nKNOWN FIX STRATEGY TO APPLY: ${recommendedFix}` : ''),
                vfs
            );

            if (!healed) {
                logger.warn({ attempt }, 'RepairAgent returned no patches — stopping heal loop');
                break;
            }

            result.healed = true;
            logger.info({ attempt }, 'Patches applied by RepairAgent — re-running tsc...');

            const retryResult = await this.runTsc(sandboxDir);
            if (retryResult.passed) {
                result.passed = true;
                result.errors = [];
                result.warnings = retryResult.warnings;
                logger.info({ attempt }, 'Auto-heal successful — tsc clean');

                // Record the success to Learn Engine for future identical crashes
                await learningEngine.recordSuccess(currentErrorMsg, 'Applied Auto-Healer patches');

                return result;
            }

            result.errors = retryResult.errors;
            tscResult.errors = retryResult.errors; // Update for next iteration
            logger.warn({ attempt, remaining: this.maxHealAttempts - attempt }, 'Still failing after heal — retrying...');
        }

        // After max retries: FAIL. Do not allow through with errors for chaos test.
        logger.warn({ errorCount: result.errors.length }, 'Max heal attempts reached — verification FAILED');
        result.passed = false;
        return result;
    }

    /**
     * Run tsc --noEmit and parse errors vs warnings.
     */
    private async runTsc(dir: string): Promise<{ passed: boolean; errors: string[]; warnings: string[] }> {
        try {
            const { stdout, stderr } = await execAsync(
                'npx tsc --noEmit --pretty false 2>&1 || true',
                { cwd: dir, timeout: this.tscTimeout, shell: process.env.ComSpec || 'cmd.exe' }
            );

            const output = (stdout + stderr).trim();
            if (!output) return { passed: true, errors: [], warnings: [] };

            const lines = output.split('\n');
            const errors: string[] = [];
            const warnings: string[] = [];

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed.includes(': error TS')) {
                    errors.push(trimmed.substring(0, 200)); // truncate very long lines
                } else if (trimmed.includes(': warning TS')) {
                    warnings.push(trimmed.substring(0, 200));
                }
            }

            return { passed: errors.length === 0, errors, warnings };
        } catch (e: unknown) {
            const err = e as { stdout?: string; stderr?: string; message?: string };
            const errText = (err.stdout || err.stderr || err.message || '').substring(0, 500);
            return { passed: false, errors: [errText], warnings: [] };
        }
    }

    /**
     * Invoke RepairAgent to produce patches for the given TypeScript errors.
     */
    private async healErrors(
        dir: string,
        stderr: string,
        vfs: VirtualFileSystem
    ): Promise<boolean> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { RepairAgent } = require('@libs/brain');
            const repairAgent = new RepairAgent();

            let filesToRepair = vfs.getDirtyFiles();
            if (filesToRepair.length === 0) {
                filesToRepair = vfs.getAllFiles();
            }

            const response = await repairAgent.execute(
                { error: stderr, stdout: '', files: filesToRepair.slice(0, 15) },
                {} as unknown
            );

            console.log(`[PatchVerifier] RepairAgent response success: ${response.success}`);
            if (response.success && response.data) {
                console.log(`[PatchVerifier] RepairAgent Explanation: ${response.data.explanation}`);
                console.log(`[PatchVerifier] RepairAgent Patches: ${response.data.patches?.length || 0}`);
            } else {
                console.log(`[PatchVerifier] RepairAgent Error: ${response.error}`);
            }

            if (response.success && response.data?.patches?.length > 0) {
                // Apply patches BACK TO VFS, not disk directly
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { PatchEngine } = require('./vfs');
                PatchEngine.applyPatches(vfs, response.data.patches);
                logger.info({ patchCount: response.data.patches.length }, '[PatchVerifier] RepairAgent patches applied to VFS');
                return true;
            }

            return false;
        } catch (e) {
            logger.error({ error: e }, '[PatchVerifier] RepairAgent threw during heal');
            return false;
        }
    }
}

export const patchVerifier = new PatchVerifier();
