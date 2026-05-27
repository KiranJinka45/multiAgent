export interface PlaybookMetadata {
    name: string;
    daysSinceLastUpdate: number;
    operatorOverrideCount: number;
    successRate: number;
}

export interface TelemetryMappingInput {
    fieldName: string;
    historicalIncidentClass: string;
    lastSeenDaysAgo: number;
}

export interface RecoveryReport {
    reconstructedPlaybooks: string[];
    abandonedTelemetryMapped: Record<string, string>;
    actionablePlaybooks: string[];
    warnings: string[];
}

export class InstitutionalRecoveryTool {
    private readonly staleThresholdDays = 90;

    /**
     * Reconstructs forgotten playbooks and maps abandoned telemetry back
     * to original incident classes to preserve SRE team capacity.
     */
    public reconstructPlaybooks(
        stalePlaybooks: PlaybookMetadata[],
        abandonedTelemetry: TelemetryMappingInput[]
    ): RecoveryReport {
        const reconstructedPlaybooks: string[] = [];
        const abandonedTelemetryMapped: Record<string, string> = {};
        const actionablePlaybooks: string[] = [];
        const warnings: string[] = [];

        // 1. Process stale playbooks for recovery or active promotion
        for (const playbook of stalePlaybooks) {
            const isStale = playbook.daysSinceLastUpdate > this.staleThresholdDays;
            
            if (isStale) {
                // If stale but high success rate or high SRE override history, recommend reconstruction
                if (playbook.successRate >= 0.80 || playbook.operatorOverrideCount > 5) {
                    reconstructedPlaybooks.push(playbook.name);
                    warnings.push(`Playbook '${playbook.name}' is stale (${playbook.daysSinceLastUpdate} days old) but has high historical value. Recommending for automated reconstruction.`);
                } else {
                    warnings.push(`Playbook '${playbook.name}' is stale and has low utility. Recommend deprecation.`);
                }
            } else {
                actionablePlaybooks.push(playbook.name);
            }
        }

        // 2. Map abandoned telemetry fields back to original incident templates
        for (const item of abandonedTelemetry) {
            // Reconstruct context mapping for fields that haven't been queried recently
            if (item.lastSeenDaysAgo > this.staleThresholdDays) {
                abandonedTelemetryMapped[item.fieldName] = item.historicalIncidentClass;
                warnings.push(`Abandoned telemetry field '${item.fieldName}' mapped to historical incident class '${item.historicalIncidentClass}' (last seen ${item.lastSeenDaysAgo} days ago).`);
            }
        }

        return {
            reconstructedPlaybooks,
            abandonedTelemetryMapped,
            actionablePlaybooks,
            warnings
        };
    }
}
