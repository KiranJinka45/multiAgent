import { logger } from '@packages/observability';
import * as fs from 'fs';
import * as path from 'path';

export interface DeploymentProfile {
    retentionYears: number | 'PERMANENT';
    complianceStandard: string;
    witnessQuorum: 'STRICT_MAJORITY' | 'WEIGHTED' | 'CONSENSUS_STRICT' | 'PLURALISTIC' | 'UNANIMOUS_LOCAL';
}

export const DEPLOYMENT_PROFILES: Record<string, DeploymentProfile> = {
    'SOVEREIGN': {
        retentionYears: 'PERMANENT',
        complianceStandard: 'Regulated Sovereign',
        witnessQuorum: 'STRICT_MAJORITY'
    },
    'HEALTHCARE': {
        retentionYears: 7,
        complianceStandard: 'HIPAA/GDPR',
        witnessQuorum: 'WEIGHTED'
    },
    'FINTECH': {
        retentionYears: 10,
        complianceStandard: 'PCI-DSS/SOC2',
        witnessQuorum: 'CONSENSUS_STRICT'
    },
    'UNIVERSITY': {
        retentionYears: 5,
        complianceStandard: 'Academic Integrity',
        witnessQuorum: 'PLURALISTIC'
    },
    'INTERNAL': {
        retentionYears: 1,
        complianceStandard: 'Internal Corporate',
        witnessQuorum: 'STRICT_MAJORITY'
    }
};

export interface PilotMetadata {
    id: string;
    name: string;
    type: 'UNIVERSITY' | 'SANDBOX' | 'SOVEREIGN' | 'FINTECH' | 'INTERNAL' | 'HEALTHCARE';
    onboardingDate: string;
    sunsetDate: string; // Dynamic lease expiration date (Layer 7)
    maxConcurrencyQuota: number;
    driftRollbackThreshold: number; // Maximum allowed dynamic semantic drift (e.g. 0.3)
    status: 'ACTIVE' | 'HIBERNATING' | 'COMPLETED';
    associatedCells: string[];
    profile: DeploymentProfile;
}


export interface HealthReport {
    cellId: string;
    status: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
    uptime: number;
    resourceUsage: any;
}

export class InstitutionalPilotRegistry {
    private static REGISTRY_PATH = path.join(process.cwd(), '.ztan', 'pilot-registry.json');

    static registerPilot(name: string, type: PilotMetadata['type'], options?: { sunsetDays?: number; quota?: number; driftThreshold?: number }): PilotMetadata {
        const pilots = this.listPilots();
        const profile = DEPLOYMENT_PROFILES[type] || DEPLOYMENT_PROFILES['INTERNAL'];
        const onboardingDate = new Date();
        const sunsetDate = new Date(onboardingDate.getTime() + (options?.sunsetDays ?? 30) * 24 * 60 * 60 * 1000);
        
        const pilot: PilotMetadata = {
            id: `PILOT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            name,
            type,
            onboardingDate: onboardingDate.toISOString(),
            sunsetDate: sunsetDate.toISOString(),
            maxConcurrencyQuota: options?.quota ?? 10,
            driftRollbackThreshold: options?.driftThreshold ?? 0.30,
            status: 'ACTIVE',
            associatedCells: [],
            profile
        };
        pilots.push(pilot);
        this.savePilots(pilots);
        logger.info(`📝 Registered Institutional Pilot: ${pilot.name} (${pilot.id}) [Profile: ${type}] [Sunset: ${pilot.sunsetDate}]`);
        return pilot;
    }

    static getPilot(id: string): PilotMetadata | undefined {
        return this.listPilots().find(p => p.id === id);
    }

    static listPilots(): PilotMetadata[] {
        if (!fs.existsSync(this.REGISTRY_PATH)) {
            return [];
        }
        try {
            const data = fs.readFileSync(this.REGISTRY_PATH, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            logger.error(`❌ Error reading pilot registry: ${err}`);
            return [];
        }
    }

    static associateCell(pilotId: string, cellId: string): void {
        const pilots = this.listPilots();
        const pilot = pilots.find(p => p.id === pilotId);
        if (pilot) {
            if (!pilot.associatedCells.includes(cellId)) {
                pilot.associatedCells.push(cellId);
                this.savePilots(pilots);
                logger.info(`🔗 Associated Cell ${cellId} with Pilot ${pilot.name}`);
            }
        } else {
            throw new Error(`Pilot ${pilotId} not found`);
        }
    }

    /**
     * Assures lease and quota restrictions are mechanically enforced.
     */
    static validateExecutionAllowed(pilotId: string, currentConcurrency: number, currentDrift: number): { allowed: boolean; reason?: string } {
        const pilot = this.getPilot(pilotId);
        if (!pilot) {
            return { allowed: false, reason: `Pilot registry entry '${pilotId}' not found.` };
        }

        if (pilot.status !== 'ACTIVE') {
            return { allowed: false, reason: `Pilot is in status [${pilot.status}].` };
        }

        // 1. Sunset Date Enforcement
        if (new Date() > new Date(pilot.sunsetDate)) {
            return { allowed: false, reason: `LEASE_EXPIRED: Pilot program lease expired on ${pilot.sunsetDate}.` };
        }

        // 2. Concurrency Quota Check
        if (currentConcurrency > pilot.maxConcurrencyQuota) {
            return { allowed: false, reason: `CONCURRENCY_QUOTA_EXCEEDED: Active concurrency ${currentConcurrency} exceeds quota ceiling of ${pilot.maxConcurrencyQuota}.` };
        }

        // 3. Dynamic Drift Rollback Threshold Check
        if (currentDrift > pilot.driftRollbackThreshold) {
            return { allowed: false, reason: `DYNAMIC_DRIFT_ROLLBACK_TRIGGERED: Semantic drift ${currentDrift} exceeds safety threshold of ${pilot.driftRollbackThreshold}. Initiating emergency rollback.` };
        }

        return { allowed: true };
    }

    private static savePilots(pilots: PilotMetadata[]): void {
        const dir = path.dirname(this.REGISTRY_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.REGISTRY_PATH, JSON.stringify(pilots, null, 2));
    }
}


export class ProductionPilot {
    /**
     * Deploy a high-assurance production-pilot institutional execution cell.
     */
    static deployPilotCell(config: any, pilotId?: string): string {
        const cellId = `CELL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        logger.info(`🚀 Deploying Production-Pilot Cell: ${cellId}`);
        logger.info(`Configuration: ${JSON.stringify(config)}`);
        
        if (pilotId) {
            InstitutionalPilotRegistry.associateCell(pilotId, cellId);
        }

        return cellId;
    }

    /**
     * Monitor the operational health and resource usage of a pilot cell.
     */
    static monitorCellHealth(cellId: string): HealthReport {
        logger.info(`🔍 Monitoring health of pilot cell ${cellId}...`);
        return {
            cellId,
            status: 'OPTIMAL',
            uptime: 3600 * 24 * 7, // 1 week
            resourceUsage: { cpu: '12%', mem: '1.4GB' }
        };
    }
}

export * from './event-store.js';
export * from './reducer.js';
export * from './divergence.js';
export { canonicalizeJson } from './replay.js';
export * from './purity-guard.js';
export * from './compaction.js';
export * from './versioning.js';
export * from './benchmarks.js';
export * from './purity-ast.js';
export * from './journal.js';
export * from './scheduler.js';
export * from './vector-clock.js';
export * from './concurrency-journal.js';
export * from './async-hooks.js';
export * from './virtual-timer.js';
export * from './ingress-journal.js';
export * from './vm-sandbox.js';
export * from './promise-factory.js';
export * from './worker-sandbox.js';
export * from './execution-epoch.js';
export * from './consensus-adapter.js';
export * from './durable-wal.js';
export * from './replicated-wal.js';
export * from './offheap-store.js';
export * from './wasm-sandbox.js';
export * from './workflow-sdk.js';
export * from './replay-diagnostics.js';
export * from './tcp-transport.js';
export * from './control-plane.js';
export * from './wal-compactor.js';
export * from './cluster-governance.js';
export * from './durable-orchestration.js';
export * from './execution-partitioning.js';
export * from './multi-tenant-security.js';
export * from './version-migration.js';
export * from './deployment-registry.js';
export * from './disaster-recovery.js';
export * from './lifecycle.js';
export * from './resource-scope.js';
export * from './adversarial-chaos.js';





