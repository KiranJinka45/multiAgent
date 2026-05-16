import { execSync } from 'child_process';
import { logger } from '@packages/observability';
import fs from 'fs';
import path from 'path';

/**
 * Real-world Terraform Infrastructure Driver
 */
export class TerraformDriver {
    /**
     * Executes terraform apply for a given project.
     */
    public async apply(workingDir: string, vars?: Record<string, string>): Promise<string> {
        logger.info({ workingDir }, '[TerraformDriver] Executing apply...');
        
        const varFlags = vars 
            ? Object.entries(vars).map(([k, v]) => `-var="${k}=${v}"`).join(' ')
            : '';

        try {
            // 1. Initialize
            execSync('terraform init -no-color', { cwd: workingDir });
            
            // 2. Apply
            const output = execSync(`terraform apply -auto-approve -no-color ${varFlags}`, { 
                cwd: workingDir,
                encoding: 'utf8' 
            });
            
            logger.info({ workingDir }, '[TerraformDriver] Apply successful.');
            return output;
        } catch (error: any) {
            logger.error({ workingDir, error: error.message }, '[TerraformDriver] Apply failed.');
            throw new Error(`Terraform Apply Failed: ${error.message}`);
        }
    }

    /**
     * Validates a plan without applying.
     */
    public async validate(workingDir: string): Promise<boolean> {
        try {
            execSync('terraform init -no-color', { cwd: workingDir });
            execSync('terraform validate -no-color', { cwd: workingDir });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Reverts to a previous state by applying a backup.
     * In production, this would use a remote state versioning system.
     */
    public async rollback(workingDir: string): Promise<void> {
        logger.warn({ workingDir }, '[TerraformDriver] Initiating State Rollback...');
        
        const stateFile = path.join(workingDir, 'terraform.tfstate');
        const backupFile = path.join(workingDir, 'terraform.tfstate.backup');

        if (fs.existsSync(backupFile)) {
            fs.copyFileSync(backupFile, stateFile);
            logger.info({ workingDir }, '[TerraformDriver] Restored previous state file. Re-applying...');
            await this.apply(workingDir);
        } else {
            throw new Error('No backup state found for rollback.');
        }
    }
}
