import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '@packages/observability';

export interface DeploymentRecord {
    workflowName: string;
    version: string;
    codeHash: string;
    signature: string;
    author: string;
    timestamp: number;
    compatibilityMetadata?: any;
    isActive: boolean;
}

export class DeploymentRegistry {
    private registryPath: string;

    constructor(customPath?: string) {
        this.registryPath = customPath || path.join(process.cwd(), '.ztan', 'deployments.json');
        this.ensureDirExists();
    }

    private ensureDirExists() {
        const dir = path.dirname(this.registryPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private loadAll(): DeploymentRecord[] {
        if (!fs.existsSync(this.registryPath)) {
            return [];
        }
        try {
            const data = fs.readFileSync(this.registryPath, 'utf8');
            return JSON.parse(data) as DeploymentRecord[];
        } catch (err: any) {
            logger.error(`[DEPLOYMENT_REGISTRY] Failed to read registry file: ${err.message}`);
            return [];
        }
    }

    private saveAll(records: DeploymentRecord[]): void {
        const tempPath = this.registryPath + '.tmp';
        try {
            fs.writeFileSync(tempPath, JSON.stringify(records, null, 2), 'utf8');
            if (fs.existsSync(this.registryPath)) {
                fs.unlinkSync(this.registryPath);
            }
            fs.renameSync(tempPath, this.registryPath);
        } catch (err: any) {
            logger.error(`[DEPLOYMENT_REGISTRY] Failed to save registry atomically: ${err.message}`);
            // Fallback direct write
            try {
                fs.writeFileSync(this.registryPath, JSON.stringify(records, null, 2), 'utf8');
            } catch (fallbackErr: any) {
                logger.error(`[DEPLOYMENT_REGISTRY] Fallback write also failed: ${fallbackErr.message}`);
            }
        }
    }

    public registerDeployment(record: Omit<DeploymentRecord, 'isActive'>): void {
        const records = this.loadAll();
        
        // Deactivate older deployments for this workflow if we want to make the new one active
        for (const rec of records) {
            if (rec.workflowName === record.workflowName) {
                rec.isActive = false;
            }
        }

        const newRecord: DeploymentRecord = {
            ...record,
            isActive: true
        };

        records.push(newRecord);
        this.saveAll(records);
        logger.info(`🚀 Registered deployment: ${record.workflowName}@${record.version} (Active: true)`);
    }

    public getDeployment(workflowName: string, version: string): DeploymentRecord | undefined {
        return this.loadAll().find(r => r.workflowName === workflowName && r.version === version);
    }

    public getActiveDeployment(workflowName: string): DeploymentRecord | undefined {
        return this.loadAll().find(r => r.workflowName === workflowName && r.isActive);
    }

    public setActiveDeployment(workflowName: string, version: string): void {
        const records = this.loadAll();
        let found = false;
        
        for (const rec of records) {
            if (rec.workflowName === workflowName) {
                if (rec.version === version) {
                    rec.isActive = true;
                    found = true;
                } else {
                    rec.isActive = false;
                }
            }
        }

        if (!found) {
            throw new Error(`[DEPLOYMENT_REGISTRY] Deployment not found for ${workflowName}@${version}`);
        }

        this.saveAll(records);
        logger.info(`✨ Promoted ${workflowName}@${version} to active deployment`);
    }

    public rollback(workflowName: string): DeploymentRecord | undefined {
        const records = this.loadAll();
        const workflowDeployments = records
            .filter(r => r.workflowName === workflowName)
            .sort((a, b) => b.timestamp - a.timestamp); // newest first

        if (workflowDeployments.length < 2) {
            logger.warn(`[DEPLOYMENT_REGISTRY] Cannot rollback: less than two deployments exist for workflow ${workflowName}`);
            return undefined;
        }

        // Current active deployment is the one marked active, rollback target is the next one in timestamp
        const activeIdx = workflowDeployments.findIndex(r => r.isActive);
        const rollbackTarget = activeIdx !== -1 && activeIdx + 1 < workflowDeployments.length
            ? workflowDeployments[activeIdx + 1]
            : workflowDeployments[1]; // fallback to second newest if active is not marked correctly

        for (const rec of records) {
            if (rec.workflowName === workflowName) {
                rec.isActive = (rec.version === rollbackTarget.version);
            }
        }

        this.saveAll(records);
        logger.info(`⏪ Rolled back ${workflowName} to version ${rollbackTarget.version}`);
        return rollbackTarget;
    }

    public listDeployments(workflowName?: string): DeploymentRecord[] {
        const records = this.loadAll();
        if (workflowName) {
            return records.filter(r => r.workflowName === workflowName);
        }
        return records;
    }
}
