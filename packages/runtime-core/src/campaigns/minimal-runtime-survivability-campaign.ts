/**
 * ZTAN Phase Ω.4 - Minimal Runtime Survivability Campaign
 * 
 * DESIGN CONSTRAINTS:
 * 1. Checks ES compatibility, zero-dependency fallbacks, and decompressibility.
 * 2. Bounded, advisory portability testing.
 * 3. Never mutates local runtime installations or paths.
 */

export interface EnvironmentCapability {
    featureName: string;
    isSupported: boolean;
    requiredForFallback: boolean;
}

export interface BinaryPortabilityResult {
    systemRequirement: string;
    isSatisfied: boolean;
    recommendation: string;
}

export interface MinimalRuntimeReport {
    campaignId: string;
    timestamp: number;
    passed: boolean;
    pureJsFallbackScore: number; // 0.0 to 1.0 where 1.0 represents absolute zero-dependency purity
    archiveSurvivable: boolean;
    detectedEcosystemImports: string[];
    advisoryWarnings: string[];
    capabilitiesTested: EnvironmentCapability[];
}

export class MinimalRuntimeSurvivabilityCampaign {

    /**
     * Statically inspects capsule source code to verify it compiles and executes
     * in a zero-dependency, pure JS environment without standard node/Deno bindings.
     */
    public verifyPureJsFallback(sourceCode: string): { isPure: boolean; detectedEcosystemImports: string[] } {
        const detectedEcosystemImports: string[] = [];
        
        // Scan for standard ES modules imports that go outside relative files
        const importRegex = /import\s+[^;]*from\s+["']([^"']+)["']/g;
        let match;

        while ((match = importRegex.exec(sourceCode)) !== null) {
            const importSrc = match[1];
            if (!importSrc.startsWith('.') && importSrc !== 'crypto') {
                detectedEcosystemImports.push(importSrc);
            }
        }

        // Also check for dynamic requires of node specific libs (e.g. require('fs'))
        const requireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
        while ((match = requireRegex.exec(sourceCode)) !== null) {
            const reqSrc = match[1];
            if (!reqSrc.startsWith('.') && reqSrc !== 'crypto') {
                detectedEcosystemImports.push(reqSrc);
            }
        }

        const isPure = detectedEcosystemImports.length === 0;

        return {
            isPure,
            detectedEcosystemImports
        };
    }

    /**
     * Models capsule decompression survivability under bare POSIX environments,
     * ensuring zip or tar formats remain readable by standard systems.
     */
    public verifyArchiveSurvivability(archiveBytes: Uint8Array): { decompressible: boolean; format: 'ZIP' | 'TAR' | 'UNKNOWN' } {
        if (archiveBytes.length < 4) {
            return { decompressible: false, format: 'UNKNOWN' };
        }

        // Standard magic numbers
        // ZIP: PK\x03\x04 (0x50, 0x4b, 0x03, 0x04)
        if (archiveBytes[0] === 0x50 && archiveBytes[1] === 0x4b && archiveBytes[2] === 0x03 && archiveBytes[3] === 0x04) {
            return { decompressible: true, format: 'ZIP' };
        }

        // TAR: check for standard tar indicators at byte 257 (ustar)
        if (archiveBytes.length > 262) {
            const ustarString = String.fromCharCode(...archiveBytes.slice(257, 262));
            if (ustarString === 'ustar') {
                return { decompressible: true, format: 'TAR' };
            }
        }

        return { decompressible: false, format: 'UNKNOWN' };
    }

    /**
     * Runs the Minimal Runtime Survivability Campaign.
     * Evaluates source and formats advisory portability grades.
     */
    public runPortabilityCampaign(
        campaignId: string,
        capsuleCode: string,
        archiveBytes: Uint8Array,
        capabilities: EnvironmentCapability[]
    ): MinimalRuntimeReport {
        const advisoryWarnings: string[] = [];

        // 1. Audit Pure JS Purity
        const jsAudit = this.verifyPureJsFallback(capsuleCode);
        const pureJsFallbackScore = jsAudit.isPure ? 1.0 : Math.max(0.2, 1.0 - (jsAudit.detectedEcosystemImports.length * 0.2));
        
        if (!jsAudit.isPure) {
            advisoryWarnings.push(`ECOSYSTEM DEPENDENCIES FOUND: Capsule source contains external imports [${jsAudit.detectedEcosystemImports.join(', ')}]. Will fail to run on bare-metal air-gapped JS engines.`);
        }

        // 2. Audit Archive decompressibility
        const decomp = this.verifyArchiveSurvivability(archiveBytes);
        const archiveSurvivable = decomp.decompressible;
        if (!archiveSurvivable) {
            advisoryWarnings.push('ARCHIVE ENVELOPE ROT: Captured capsule archive format is unknown or lacks standard ZIP/TAR headers. Extraction under bare POSIX environments will fail.');
        } else {
            advisoryWarnings.push(`Archive format verified: standard ${decomp.format} compression envelope detected.`);
        }

        // 3. Evaluate browser native capabilities
        let failedRequiredCount = 0;
        for (const cap of capabilities) {
            if (!cap.isSupported && cap.requiredForFallback) {
                failedRequiredCount++;
                advisoryWarnings.push(`MISSING CORE REQUIREMENT: Target environment lacks required Web capability: '${cap.featureName}'`);
            }
        }

        const passed = jsAudit.isPure && archiveSurvivable && failedRequiredCount === 0;
        if (!passed) {
            advisoryWarnings.push('PORTABILITY DEGRADATION: The capsule visualizer and evidence parsing layer fail long-horizon environment portability audits.');
        }

        return {
            campaignId,
            timestamp: Date.now(),
            passed,
            pureJsFallbackScore: Math.round(pureJsFallbackScore * 100) / 100,
            archiveSurvivable,
            detectedEcosystemImports: jsAudit.detectedEcosystemImports,
            advisoryWarnings,
            capabilitiesTested: capabilities
        };
    }
}
