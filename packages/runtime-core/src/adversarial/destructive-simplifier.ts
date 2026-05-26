import { PolicyRule } from './governance-shrinker.js';
import { TelemetryFieldMetadata } from '../soak/rarity-telemetry-valuer.js';

export interface DeletionCampaign {
    targetPrunedRules: string[];
    targetPrunedTelemetryFields: string[];
    targetPrunedDashboards: string[];
}

export interface CampaignDriftResult {
    outcomeDriftScore: number; // 0.0 to 1.0 (lower is better, higher means reliability drift)
    replaySurvivabilityScore: number; // 0.0 to 1.0 (higher is better)
    operatorMttrDeltaSec: number; // negative is improvement, positive is degradation
    isSimplificationSuccessful: boolean;
    actionableFeedback: string[];
}

export class DestructiveSimplifier {
    /**
     * Simulates the experimental deletion of policies, telemetry fields, and SRE dashboards
     * to measure outcome drift, replay survivability, and SRE MTTR deltas.
     */
    public orchestrateDestructiveCampaign(
        campaign: DeletionCampaign,
        allRules: PolicyRule[],
        allFields: TelemetryFieldMetadata[],
        activeWidgets: string[],
        widgetViews: Record<string, number>
    ): CampaignDriftResult {
        let outcomeDriftScore = 0.0;
        let replaySurvivabilityScore = 1.0;
        let operatorMttrDeltaSec = 0; // Cumulative change in SRE MTTR
        const actionableFeedback: string[] = [];

        // 1. Process Rule Deletion Impact
        for (const ruleId of campaign.targetPrunedRules) {
            const rule = allRules.find(r => r.id === ruleId);
            if (!rule) continue;

            // Deleting a high-efficacy rule causes critical outcome drift
            if (rule.efficacyScore >= 0.70) {
                outcomeDriftScore += 0.35;
                operatorMttrDeltaSec += 300; // MTTR degrades because SREs lose critical guards
                actionableFeedback.push(`WARNING: Deletion of high-efficacy validator '${rule.name}' introduces significant reliability drift.`);
            } 
            // Deleting a high-conflict or low-efficacy rule improves MTTR by reducing noise
            else if (rule.conflictIndex >= 0.70 || rule.efficacyScore < 0.15) {
                operatorMttrDeltaSec -= 120; // 2 minutes improvement per noisy rule pruned
                actionableFeedback.push(`SUCCESS: Pruning noisy/contradictory validator '${rule.name}' reduces operator distraction.`);
            } else {
                operatorMttrDeltaSec -= 30; // Minor complexity reduction
            }
        }

        // 2. Process Telemetry Field Deletion Impact
        for (const fieldName of campaign.targetPrunedTelemetryFields) {
            const field = allFields.find(f => f.name === fieldName);
            if (!field) continue;

            // Deleting a protected/forensically critical field decays replay capabilities
            const isProtected = field.anomalyRarity >= 0.80 || field.reconstructionWeight >= 0.80;
            if (isProtected) {
                replaySurvivabilityScore -= 0.30;
                operatorMttrDeltaSec += 180; // MTTR degrades because SREs lose diagnostic visibility
                actionableFeedback.push(`WARNING: Deletion of forensically critical telemetry field '${field.name}' causes a severe replay blind spot.`);
            } else {
                operatorMttrDeltaSec -= 60; // 1 minute improvement per redundant metric pruned
                actionableFeedback.push(`SUCCESS: Pruned low-utility telemetry field '${field.name}'.`);
            }
        }

        // 3. Process SRE Dashboard Panel Deletion Impact
        for (const dashboardId of campaign.targetPrunedDashboards) {
            if (!activeWidgets.includes(dashboardId)) continue;

            const views = widgetViews[dashboardId] || 0;
            if (views < 5) {
                operatorMttrDeltaSec -= 45; // 45 seconds improvement by decluttering unused dashboards
                actionableFeedback.push(`SUCCESS: Dashboard decluttered by removing unused panel '${dashboardId}'.`);
            } else {
                operatorMttrDeltaSec += 90; // MTTR degrades if SREs lose a dashboard they actively use
                actionableFeedback.push(`WARNING: Removing heavily used dashboard panel '${dashboardId}' may increase SRE visibility gaps.`);
            }
        }

        // Normalize metrics
        outcomeDriftScore = Math.max(0.0, Math.min(1.0, Math.round(outcomeDriftScore * 100) / 100));
        replaySurvivabilityScore = Math.max(0.0, Math.min(1.0, Math.round(replaySurvivabilityScore * 100) / 100));

        const isSimplificationSuccessful = 
            outcomeDriftScore < 0.50 && 
            replaySurvivabilityScore >= 0.70 && 
            operatorMttrDeltaSec <= 0;

        return {
            outcomeDriftScore,
            replaySurvivabilityScore,
            operatorMttrDeltaSec,
            isSimplificationSuccessful,
            actionableFeedback
        };
    }
}
