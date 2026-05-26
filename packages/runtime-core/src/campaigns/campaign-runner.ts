import { EntropyHarness, EntropyHarnessReport, FaultType } from './entropy-harness.js';
import { ExecutionCoordinator } from '../execution/execution-coordinator.js';

export interface CampaignReport {
    campaignId: string;
    timestamp: number;
    success: boolean;
    overallSovereigntyScore: number;
    drillResults: EntropyHarnessReport[];
    summary: string;
}

export class CampaignRunner {
    private harness = new EntropyHarness();

    /**
     * Executes a series of validation campaign drills and returns a consolidated reporter summary.
     */
    public runValidationCampaign(
        campaignId: string,
        coordinator: ExecutionCoordinator,
        drills: FaultType[][]
    ): CampaignReport {
        const drillResults: EntropyHarnessReport[] = [];
        let totalSovereignty = 0;
        let campaignSuccess = true;

        for (const drill of drills) {
            const report = this.harness.runChaosDrill(coordinator, drill);
            drillResults.push(report);
            
            totalSovereignty += report.kernelSovereigntyScore;
            if (!report.invariantsPassed) {
                campaignSuccess = false;
            }
        }

        const overallSovereigntyScore = drills.length > 0
            ? Math.round((totalSovereignty / drills.length) * 100) / 100
            : 1.0;

        const summary = campaignSuccess
            ? 'Survivability Campaign completed successfully. All core runtime-decoupling invariants passed.'
            : 'Survivability Campaign flagged invariant violations. Decoupled boundary integrity warnings active.';

        return {
            campaignId,
            timestamp: Date.now(),
            success: campaignSuccess,
            overallSovereigntyScore,
            drillResults,
            summary
        };
    }
}
