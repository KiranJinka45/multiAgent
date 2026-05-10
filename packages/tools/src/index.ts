import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@packages/observability';

/**
 * 🛠️ AI Tool Registry
 * Real tools that allow agents to execute side-effects in a controlled manner.
 */

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

/**
 * CODER TOOLS
 */
export class CoderTools {
    /**
     * Modifies a file in the workspace.
     */
    static modifyFile(filePath: string, content: string): ToolResult {
        try {
            const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
            fs.writeFileSync(absolutePath, content);
            return { success: true, output: `File ${filePath} updated successfully.` };
        } catch (err: any) {
            return { success: false, output: "", error: err.message };
        }
    }

    /**
     * Runs tests in the workspace.
     */
    static runTests(command: string = 'npm test'): ToolResult {
        try {
            const output = execSync(command, { encoding: 'utf8' });
            return { success: true, output };
        } catch (err: any) {
            return { success: false, output: err.stdout || "", error: err.message };
        }
    }
}

/**
 * SECURITY TOOLS
 */
export class SecurityTools {
    /**
     * Runs a Snyk scan on a specific path.
     */
    static runSnykScan(targetPath: string): ToolResult {
        try {
            const output = execSync(`snyk code test ${targetPath} --json`, { encoding: 'utf8' });
            return { success: true, output };
        } catch (err: any) {
            return { success: false, output: err.stdout || "", error: err.message };
        }
    }

    /**
     * Detects hardcoded secrets using a simple regex-based scan (simulating Gitleaks).
     */
    static detectSecrets(content: string): string[] {
        const secretPatterns = [
            /sk-[a-zA-Z0-9]{48}/g, // OpenAI
            /AKIA[0-9A-Z]{16}/g,   // AWS
            /AIza[0-9A-Za-z-_]{35}/g // Google Cloud
        ];
        const findings: string[] = [];
        secretPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) findings.push(...matches);
        });
        return findings;
    }
}

/**
 * VALIDATOR TOOLS
 */
export class ValidatorTools {
    /**
     * Replays an execution trace and verifies output determinism.
     */
    static verifyDeterminism(originalOutput: string, replayedOutput: string): boolean {
        return originalOutput === replayedOutput;
    }
}
