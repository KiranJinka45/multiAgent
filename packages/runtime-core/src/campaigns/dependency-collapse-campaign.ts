/**
 * ZTAN Phase Ω.2 - Dependency Collapse Campaign
 * 
 * DESIGN CONSTRAINTS:
 * 1. Supply chain failure simulation and capsule independence validation.
 * 2. Purely advisory testing.
 * 3. Never mutates live running dependencies or configuration.
 */

export type SupplyChainFailureType =
    | 'NPM_REGISTRY_GONE'
    | 'RUSTUP_UNAVAILABLE'
    | 'PACKAGE_SIGNATURE_EXPIRED'
    | 'BROWSER_API_REMOVED'
    | 'BUILD_TOOL_INCOMPATIBLE';

export interface SupplyChainFailureScenario {
    scenarioId: string;
    failureType: SupplyChainFailureType;
    affectedComponent: string;
    severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface CapsuleReadabilityResult {
    capsuleId: string;
    rendersWithoutExternalNetwork: boolean;
    hasThirdPartyImports: boolean;
    thirdPartyImportsList: string[];
    survivesRegistryCollapse: boolean;
}

export interface DependencyCollapseCampaignReport {
    campaignId: string;
    timestamp: number;
    scenariosSimulated: SupplyChainFailureScenario[];
    capsuleReadabilityScores: Record<string, CapsuleReadabilityResult>;
    reproducibilityPassed: boolean;
    archaeologyDurabilityScore: number; // 0.0 to 1.0
    advisoryWarnings: string[];
}

export class DependencyCollapseCampaign {

    /**
     * Runs the Dependency Collapse Campaign.
     * Simulates various levels of registry outages and browser API deprecations,
     * auditing the durability and readability of archaeology replayers and verifiers.
     */
    public runCollapseCampaign(
        campaignId: string,
        scenarios: SupplyChainFailureScenario[],
        capsules: { capsuleId: string; rawHtmlContent: string }[]
    ): DependencyCollapseCampaignReport {
        const capsuleReadabilityScores: Record<string, CapsuleReadabilityResult> = {};
        const advisoryWarnings: string[] = [];
        let totalScore = 0;

        // 1. Audit Capsule HTML files for external dependency indicators
        for (const cap of capsules) {
            const result = this.auditCapsuleReadability(cap.capsuleId, cap.rawHtmlContent);
            capsuleReadabilityScores[cap.capsuleId] = result;

            let capScore = 1.0;
            if (!result.rendersWithoutExternalNetwork) {
                capScore -= 0.5;
                advisoryWarnings.push(`Capsule '${cap.capsuleId}' relies on local/remote networks. Will not render in air-gapped environments.`);
            }
            if (result.hasThirdPartyImports) {
                capScore -= 0.3;
                advisoryWarnings.push(`Capsule '${cap.capsuleId}' has external JS imports: ${result.thirdPartyImportsList.join(', ')}. Vulnerable to CDN/registry outages.`);
            }
            
            totalScore += Math.max(0, capScore);
        }

        // 2. Evaluate simulated scenarios
        let reproducibilityPassed = true;
        for (const scenario of scenarios) {
            switch (scenario.failureType) {
                case 'NPM_REGISTRY_GONE':
                    advisoryWarnings.push(`Simulated npm registry outage. Impact on: ${scenario.affectedComponent}. Verification of code requires pre-bundled artifacts.`);
                    break;
                case 'RUSTUP_UNAVAILABLE':
                    advisoryWarnings.push(`Simulated Rustup registry outage. Host-level Rust auditor builds require cached Cargo vendors.`);
                    break;
                case 'PACKAGE_SIGNATURE_EXPIRED':
                    reproducibilityPassed = false;
                    advisoryWarnings.push(`CRITICAL: Expired signature simulated for dependency: ${scenario.affectedComponent}. Build systems with strict hash verification will block.`);
                    break;
                case 'BROWSER_API_REMOVED':
                    advisoryWarnings.push(`Simulated browser deprecation (e.g. removal of standard storage/crypto APIs). IndexDB or subtle crypto failures simulated.`);
                    break;
                case 'BUILD_TOOL_INCOMPATIBLE':
                    advisoryWarnings.push(`Build tool mismatch simulated on node/tsup config.`);
                    break;
            }
        }

        const archaeologyDurabilityScore = capsules.length > 0
            ? Math.round((totalScore / capsules.length) * 100) / 100
            : 1.0;

        return {
            campaignId,
            timestamp: Date.now(),
            scenariosSimulated: scenarios,
            capsuleReadabilityScores,
            reproducibilityPassed,
            archaeologyDurabilityScore,
            advisoryWarnings
        };
    }

    private auditCapsuleReadability(capsuleId: string, htmlContent: string): CapsuleReadabilityResult {
        const thirdPartyImportsList: string[] = [];
        let hasThirdPartyImports = false;
        let rendersWithoutExternalNetwork = true;

        // Simple static string parsing to scan for dependency links or script tags
        // Look for external script CDNs or relative node_modules linkages
        const scriptSrcRegex = /<script\s+[^>]*src=["']([^"']+)["']/g;
        let match;
        
        while ((match = scriptSrcRegex.exec(htmlContent)) !== null) {
            const src = match[1];
            hasThirdPartyImports = true;
            thirdPartyImportsList.push(src);

            if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
                rendersWithoutExternalNetwork = false;
            }
        }

        // Look for external CSS links
        const cssLinkRegex = /<link\s+[^>]*href=["']([^"']+)["']/g;
        while ((match = cssLinkRegex.exec(htmlContent)) !== null) {
            const href = match[1];
            if (href.endsWith('.css')) {
                hasThirdPartyImports = true;
                thirdPartyImportsList.push(href);
                if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
                    rendersWithoutExternalNetwork = false;
                }
            }
        }

        const survivesRegistryCollapse = !hasThirdPartyImports && rendersWithoutExternalNetwork;

        return {
            capsuleId,
            rendersWithoutExternalNetwork,
            hasThirdPartyImports,
            thirdPartyImportsList,
            survivesRegistryCollapse
        };
    }
}
