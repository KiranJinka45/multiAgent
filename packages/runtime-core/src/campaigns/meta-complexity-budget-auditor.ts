/**
 * ZTAN Phase Ω.4 - Meta-Complexity Budget Auditor
 * 
 * DESIGN CONSTRAINTS:
 * 1. Measures campaign LOC, import fanout, and surface bloat.
 * 2. Protects the Constitutional Freeze by enforcing stopping bounds.
 * 3. Advisory-only. Zero autonomous recovery loops.
 */

export interface ComplexityMetrics {
    filePath: string;
    linesOfCode: number;
    importsCount: number;
    externalImports: string[];
}

export interface EcosystemBudgetReport {
    campaignId: string;
    timestamp: number;
    totalCampaignFilesCount: number;
    cumulativeCampaignLoc: number;
    maxCampaignLocLimit: number;
    cumulativeImportsCount: number;
    budgetLimitPassed: boolean;
    structuralRotRiskScore: number; // 0.0 to 1.0 where 1.0 represents high structural debt
    overlappingMetricsCount: number;
    campaignSurfaceRatio: number; // cumulativeCampaignLoc / maxCampaignLocLimit
    consolidationRecommendations: string[];
    advisoryWarnings: string[];
    fileMetrics: ComplexityMetrics[];
}

export class MetaComplexityBudgetAuditor {
    private maxCumulativeLoc = 15000; // Total campaigns LOC limit to shield the core freeze

    /**
     * Statically evaluates import patterns and package coupling to prevent
     * campaign tooling from expanding into its own unmaintainable ecosystem.
     */
    public calculateImportFanout(content: string): { importsCount: number; externalImports: string[] } {
        const externalImports: string[] = [];
        const lines = content.split('\n');
        let importsCount = 0;

        const importRegex = /import\s+[^;]*from\s+["']([^"']+)["']/g;
        let match;

        for (const line of lines) {
            importRegex.lastIndex = 0;
            if ((match = importRegex.exec(line)) !== null) {
                importsCount++;
                const importSource = match[1];
                
                // Track imports that go outside local campaign or relative scope
                if (!importSource.startsWith('.') && !importSource.startsWith('crypto')) {
                    externalImports.push(importSource);
                }
            }
        }

        return {
            importsCount,
            externalImports
        };
    }

    /**
     * Inspects a campaign file, checking code size and dependency fanout.
     */
    public auditCampaignFile(filePath: string, fileContent: string): ComplexityMetrics {
        const lines = fileContent.split('\n');
        const { importsCount, externalImports } = this.calculateImportFanout(fileContent);

        return {
            filePath,
            linesOfCode: lines.length,
            importsCount,
            externalImports
        };
    }

    /**
     * Analyzes campaign files for metric overlaps and recommends consolidation epochs
     * to prevent campaign tooling from becoming a secondary bloated OS.
     */
    public auditCampaignConsolidation(
        files: ComplexityMetrics[],
        fileContents: Record<string, string>
    ): { overlapsCount: number; recommendations: string[] } {
        const recommendations: string[] = [];
        let overlapsCount = 0;

        // Group campaigns by semantic focus based on keyword scans
        const categories = {
            telemetry: [] as string[],
            witness: [] as string[],
            entropy: [] as string[],
            portability: [] as string[]
        };

        for (const file of files) {
            const content = fileContents[file.filePath] || '';
            const pathLower = file.filePath.toLowerCase();

            if (content.includes('telemetry') || pathLower.includes('silence') || pathLower.includes('collapse')) {
                categories.telemetry.push(file.filePath);
            }
            if (content.includes('witness') || content.includes('anchor') || pathLower.includes('divergence')) {
                categories.witness.push(file.filePath);
            }
            if (content.includes('entropy') || content.includes('drift') || pathLower.includes('determinism')) {
                categories.entropy.push(file.filePath);
            }
            if (pathLower.includes('replayer') || pathLower.includes('fidelity') || pathLower.includes('portable')) {
                categories.portability.push(file.filePath);
            }
        }

        // Recommend consolidation if any category accumulates more than 2 campaign files
        for (const [category, paths] of Object.entries(categories)) {
            if (paths.length > 2) {
                overlapsCount += (paths.length - 1);
                recommendations.push(
                    `CONSOLIDATION EPOCH CANDIDATE [${category.toUpperCase()}]: Detected ${paths.length} distinct campaign files focusing on similar domain metrics. Recommend merging [${paths.map(p => p.split('/').pop()).join(', ')}] into a unified auditor module.`
                );
            }
        }

        // Enforce meta-simplicity guideline
        if (files.length > 12) {
            recommendations.push(`METRIC SATURATION WARNING: Total campaign count (${files.length}) is high. Plan a Campaign Consolidation Epoch to compress evidence surfaces.`);
        }

        return {
            overlapsCount,
            recommendations
        };
    }

    /**
     * Runs the Meta-Complexity Budget Audit.
     * Computes the overall structural debt risk and outputs explicit structural warnings.
     */
    public runComplexityAudit(
        campaignId: string,
        campaignFilesData: { filePath: string; content: string }[]
    ): EcosystemBudgetReport {
        const fileMetrics: ComplexityMetrics[] = [];
        const advisoryWarnings: string[] = [];
        const contentMap: Record<string, string> = {};
        let cumulativeCampaignLoc = 0;
        let cumulativeImportsCount = 0;
        let highCouplingCount = 0;

        for (const file of campaignFilesData) {
            const metrics = this.auditCampaignFile(file.filePath, file.content);
            fileMetrics.push(metrics);
            contentMap[file.filePath] = file.content;

            cumulativeCampaignLoc += metrics.linesOfCode;
            cumulativeImportsCount += metrics.importsCount;

            if (metrics.externalImports.length > 2) {
                highCouplingCount++;
                advisoryWarnings.push(`HIGH COUPLING FANOUT: File '${file.filePath}' imports external packages: [${metrics.externalImports.join(', ')}]. Tooling should remain self-contained.`);
            }

            if (metrics.linesOfCode > 800) {
                advisoryWarnings.push(`TOOLING METASTASIS WARNING: File '${file.filePath}' LOC count ${metrics.linesOfCode} exceeds ideal campaign limits of 800 lines.`);
            }
        }

        // Run consolidation check
        const { overlapsCount, recommendations } = this.auditCampaignConsolidation(fileMetrics, contentMap);

        const budgetLimitPassed = cumulativeCampaignLoc <= this.maxCumulativeLoc;
        if (!budgetLimitPassed) {
            advisoryWarnings.push(`BUDGET EXCEEDED: Cumulative campaign LOC ${cumulativeCampaignLoc} exceeds maximum Constitutional Freeze budget of ${this.maxCumulativeLoc} LOC.`);
        }

        // Calculate Structural Rot Risk based on LOC density and dependency coupling
        let riskAccumulator = 0.0;
        if (cumulativeCampaignLoc > this.maxCumulativeLoc * 0.8) {
            riskAccumulator += 0.3;
        }
        if (highCouplingCount > 2) {
            riskAccumulator += 0.4;
        }
        if (cumulativeImportsCount > 40) {
            riskAccumulator += 0.3;
        }

        const structuralRotRiskScore = Math.round(riskAccumulator * 100) / 100;
        const campaignSurfaceRatio = Math.round((cumulativeCampaignLoc / this.maxCumulativeLoc) * 100) / 100;

        return {
            campaignId,
            timestamp: Date.now(),
            totalCampaignFilesCount: campaignFilesData.length,
            cumulativeCampaignLoc,
            maxCampaignLocLimit: this.maxCumulativeLoc,
            cumulativeImportsCount,
            budgetLimitPassed,
            structuralRotRiskScore,
            overlappingMetricsCount: overlapsCount,
            campaignSurfaceRatio,
            consolidationRecommendations: recommendations,
            advisoryWarnings,
            fileMetrics
        };
    }
}
