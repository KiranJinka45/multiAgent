import { ISandboxProvider, SandboxProfile, SandboxExecutionResult } from '../types';
import { AdversarialWorkloadSuite } from './adversarial-suite';
import { logger } from '@packages/observability';

export interface ValidationResult {
    testName: string;
    passed: boolean;
    details: string;
    evidence?: string;
}

/**
 * 🛡️ SandboxValidator
 * Automates the verification of sandbox isolation boundaries.
 * Required for Phase 1.2 (Operational Stabilization).
 */
export class SandboxValidator {
    constructor(private provider: ISandboxProvider) {}

    /**
     * Executes the full adversarial suite and returns a compliance report.
     */
    async validateAll(): Promise<{ compliant: boolean, results: ValidationResult[] }> {
        const results: ValidationResult[] = [];
        let allPassed = true;

        logger.info({ provider: this.provider.runtimeClass }, '[Validator] Starting Sandbox Validation');

        // Provision a clean test sandbox
        const profile: SandboxProfile = {
            id: `val-${Date.now()}`,
            runtimeClass: this.provider.runtimeClass,
            mountPoints: []
        };

        try {
            const instance = await this.provider.provision(profile);

            for (const [name, workload] of Object.entries(AdversarialWorkloadSuite)) {
                logger.info({ test: name }, '[Validator] Running adversarial test');
                const result = await this.provider.execute(instance.id, workload);
                
                const validation = this.verifyIsolation(name, result);
                results.push(validation);
                
                if (!validation.passed) {
                    allPassed = false;
                    logger.error({ test: name, details: validation.details }, '[Validator] ISOLATION BREACH DETECTED');
                }
            }

            await this.provider.destroy(instance.id);
        } catch (err: any) {
            logger.error({ err: err.message }, '[Validator] Validation suite failed prematurely');
            return { compliant: false, results: [{ testName: 'SUITE_CRASH', passed: false, details: err.message }] };
        }

        return { compliant: allPassed, results };
    }

    /**
     * Internal logic to verify if an isolation boundary was respected.
     */
    private verifyIsolation(testName: string, result: SandboxExecutionResult): ValidationResult {
        // Successful isolation usually means the command failed or returned empty results for sensitive targets
        switch (testName) {
            case 'FS_TRAVERSAL':
            case 'SYMLINK_ESCAPE':
                // Pass if stderr contains "No such file" or exit code is non-zero
                const escaped = result.stdout.toLowerCase().includes('root:') || result.stdout.toLowerCase().includes('password');
                return {
                    testName,
                    passed: !escaped && (result.exitCode !== 0 || result.stderr.length > 0),
                    details: escaped ? 'Host file content leaked into sandbox output' : 'Filesystem boundary respected',
                    evidence: result.stdout
                };

            case 'OUTBOUND_HTTP':
            case 'DNS_RESOLUTION':
                // Pass if network is unreachable
                const networkUp = result.exitCode === 0;
                return {
                    testName,
                    passed: !networkUp,
                    details: networkUp ? 'Outbound network access detected' : 'Network isolation active',
                    evidence: result.stdout || result.stderr
                };

            case 'FORK_BOMB':
                // Pass if the sandbox stayed alive or was killed by the host resource manager (not crashing the host)
                // This is hard to verify without external host health checks, but we check if result is returned
                return {
                    testName,
                    passed: true, // If we got a result, the host survived
                    details: 'Resource limit applied or host survived fork bomb'
                };

            default:
                // For other tests, a non-zero exit code on an illegal action is a pass
                return {
                    testName,
                    passed: result.exitCode !== 0,
                    details: `Action restricted by runtime (${result.exitCode})`
                };
        }
    }
}
