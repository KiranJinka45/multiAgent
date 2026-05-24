import { logger } from '@packages/observability';
import type { DurableWorkflowContext } from './durable-orchestration.js';
import type { WorkflowEvent } from './durable-orchestration.js';

export type MigrationHook = (oldPayload: any) => any;

export class VersionedWorkflowRegistry {
    // Maps workflowName -> version -> definitionFn
    private registry = new Map<string, Map<string, (ctx: DurableWorkflowContext, ...args: any[]) => Promise<any>>>();

    public define(
        name: string,
        version: string,
        fn: (ctx: DurableWorkflowContext, ...args: any[]) => Promise<any>
    ): void {
        let versionMap = this.registry.get(name);
        if (!versionMap) {
            versionMap = new Map();
            this.registry.set(name, versionMap);
        }
        versionMap.set(version, fn);
        logger.info(`📋 Registered versioned workflow: ${name}@${version}`);
    }

    public get(name: string, version: string): ((ctx: DurableWorkflowContext, ...args: any[]) => Promise<any>) | undefined {
        return this.registry.get(name)?.get(version);
    }

    public getLatestVersion(name: string): string | undefined {
        const versions = this.getVersions(name);
        if (versions.length === 0) return undefined;
        // Sort semver or strings
        return versions.sort((a, b) => b.localeCompare(a))[0];
    }

    public getVersions(name: string): string[] {
        const versionMap = this.registry.get(name);
        return versionMap ? Array.from(versionMap.keys()) : [];
    }
}

export class MigrationHookRegistry {
    // Maps workflowName -> fromVersion -> toVersion -> hookFn
    private hooks = new Map<string, Map<string, Map<string, MigrationHook>>>();

    public registerHook(
        workflowName: string,
        fromVersion: string,
        toVersion: string,
        hook: MigrationHook
    ): void {
        let fromMap = this.hooks.get(workflowName);
        if (!fromMap) {
            fromMap = new Map();
            this.hooks.set(workflowName, fromMap);
        }
        let toMap = fromMap.get(fromVersion);
        if (!toMap) {
            toMap = new Map();
            fromMap.set(fromVersion, toMap);
        }
        toMap.set(toVersion, hook);
        logger.info(`🔄 Registered migration hook for ${workflowName}: ${fromVersion} -> ${toVersion}`);
    }

    public getHook(workflowName: string, fromVersion: string, toVersion: string): MigrationHook | undefined {
        return this.hooks.get(workflowName)?.get(fromVersion)?.get(toVersion);
    }

    public migrateEvent(
        workflowName: string,
        fromVersion: string,
        toVersion: string,
        event: WorkflowEvent
    ): WorkflowEvent {
        const hook = this.getHook(workflowName, fromVersion, toVersion);
        if (!hook) {
            return event;
        }

        // Deep copy event
        const migrated = JSON.parse(JSON.stringify(event)) as WorkflowEvent;
        try {
            migrated.payload = hook(migrated.payload);
            logger.info(`✨ Migrated event payload for ${workflowName} (${event.type}) from ${fromVersion} to ${toVersion}`);
        } catch (err: any) {
            logger.error(`❌ Migration hook failed for ${workflowName} ${fromVersion}->${toVersion}: ${err.message}`);
        }
        return migrated;
    }
}

export interface NodeVersionMetadata {
    nodeId: string;
    nodeSoftwareVersion: string;
    supportedWorkflows: Record<string, string[]>; // workflowName -> supportedVersions[]
}

export class RollingDeploymentCoordinator {
    private nodeMetadata = new Map<string, NodeVersionMetadata>();

    public registerNodeVersion(metadata: NodeVersionMetadata): void {
        this.nodeMetadata.set(metadata.nodeId, metadata);
        logger.info(`🖥️ Registered node ${metadata.nodeId} version metadata (software v${metadata.nodeSoftwareVersion})`);
    }

    public isNodeCompatible(nodeId: string, workflowName: string, version: string): boolean {
        const meta = this.nodeMetadata.get(nodeId);
        if (!meta) return false;
        
        const versions = meta.supportedWorkflows[workflowName];
        return versions ? versions.includes(version) : false;
    }

    public getCompatibleNode(workflowName: string, version: string): string | null {
        for (const [nodeId, meta] of this.nodeMetadata.entries()) {
            const versions = meta.supportedWorkflows[workflowName];
            if (versions && versions.includes(version)) {
                return nodeId;
            }
        }
        return null;
    }

    public listActiveNodes(): string[] {
        return Array.from(this.nodeMetadata.keys());
    }
}
