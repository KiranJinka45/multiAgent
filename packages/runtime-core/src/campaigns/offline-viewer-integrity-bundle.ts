/**
 * ZTAN Phase Ω.3 - Air-Gapped Trust Bootstrap Campaign
 * 
 * DESIGN CONSTRAINTS:
 * 1. Offline viewer integrity auditing and manifest serialization.
 * 2. Purely advisory. Zero runtime process modification.
 * 3. Standard ES modules. Zero autonomous recovery loops.
 */

import crypto from 'crypto';

export interface StaticArtifactDigest {
    fileName: string;
    sha256Hex: string;
    byteSize: number;
    lastChecked: number;
}

export interface ReproducibleBuildManifest {
    manifestId: string;
    timestamp: number;
    artifacts: StaticArtifactDigest[];
    reproducibilityCommand: string;
    signature: string;
}

export interface BootstrapIntegrityReport {
    campaignId: string;
    timestamp: number;
    passed: boolean;
    totalArtifactsCount: number;
    verifiedArtifactsCount: number;
    mismatchList: string[];
    manifestAuthenticated: boolean;
    advisoryWarnings: string[];
}

export class OfflineViewerIntegrityBundle {

    /**
     * Recalculates and verifies standard SHA-256 signature digests of static viewer assets
     * to identify local file tampering, insertion, or malicious injection.
     */
    public verifyArtifactDigest(
        fileName: string,
        fileContent: string,
        expectedDigest: string
    ): StaticArtifactDigest & { matches: boolean } {
        // Strip out carriage returns to make verification robust across Windows/Linux git checkouts
        const normalizedContent = fileContent.replace(/\r\n/g, '\n');
        const sha256Hex = crypto.createHash('sha256').update(normalizedContent).digest('hex');
        const matches = sha256Hex === expectedDigest;

        return {
            fileName,
            sha256Hex,
            byteSize: Buffer.byteLength(normalizedContent, 'utf8'),
            lastChecked: Date.now(),
            matches
        };
    }

    /**
     * Compiles a detached JSON manifest tracking physical hashes, sizes, and terminal
     * offline verification guidelines.
     */
    public generateSelfHashingManifest(
        manifestId: string,
        artifacts: StaticArtifactDigest[],
        signerSecret: string
    ): ReproducibleBuildManifest {
        const timestamp = Date.now();
        const reproducibilityCommand = 'openssl dgst -sha256 index.html';

        // Preimage: manifestId || timestamp || JSON(artifacts)
        const artifactsStr = JSON.stringify(artifacts);
        const preimage = `${manifestId}${timestamp}${artifactsStr}`;
        const signature = crypto.createHmac('sha256', signerSecret).update(preimage).digest('hex');

        return {
            manifestId,
            timestamp,
            artifacts,
            reproducibilityCommand,
            signature
        };
    }

    /**
     * Executes the Air-Gapped Trust Bootstrap Campaign.
     * Evaluates static viewer assets against golden baseline digests and validates the manifest signature.
     */
    public runIntegrityCampaign(
        campaignId: string,
        viewerFiles: Record<string, string>,
        expectedDigests: Record<string, string>,
        manifest: ReproducibleBuildManifest,
        signerPublicKeyOrSecret: string
    ): BootstrapIntegrityReport {
        const mismatchList: string[] = [];
        const advisoryWarnings: string[] = [];
        let verifiedArtifactsCount = 0;
        let totalArtifactsCount = 0;

        // 1. Validate each supplied physical file contents against golden hash references
        for (const [fileName, content] of Object.entries(viewerFiles)) {
            totalArtifactsCount++;
            const expected = expectedDigests[fileName];
            
            if (!expected) {
                mismatchList.push(fileName);
                advisoryWarnings.push(`UNREGISTERED ARTIFACT: Local file '${fileName}' is not enrolled in the Golden Digest manifest.`);
                continue;
            }

            const result = this.verifyArtifactDigest(fileName, content, expected);
            if (result.matches) {
                verifiedArtifactsCount++;
            } else {
                mismatchList.push(fileName);
                violationsReport(`TAMPERED ARTIFACT DETECTED: Hash mismatch in static asset '${fileName}'. Got: '${result.sha256Hex}', Expected: '${expected}'`);
            }
        }

        function violationsReport(msg: string) {
            advisoryWarnings.push(msg);
        }

        // 2. Validate manifest signature authenticity
        let manifestAuthenticated = false;
        try {
            const artifactsStr = JSON.stringify(manifest.artifacts);
            const preimage = `${manifest.manifestId}${manifest.timestamp}${artifactsStr}`;
            const expectedSig = crypto.createHmac('sha256', signerPublicKeyOrSecret).update(preimage).digest('hex');
            
            if (manifest.signature === expectedSig) {
                manifestAuthenticated = true;
            } else {
                advisoryWarnings.push('MANIFEST INTEGRITY BREACHED: The reproducible build manifest signature is invalid or forged.');
            }
        } catch {
            advisoryWarnings.push('MANIFEST VALIDATION ERROR: Failed to parse or verify manifest signature.');
        }

        const passed = mismatchList.length === 0 && manifestAuthenticated && totalArtifactsCount > 0;

        if (!passed) {
            advisoryWarnings.push('BOOTSTRAP TRUST FAILURE: The offline viewer bundle fails air-gapped cryptographic integrity audits.');
        }

        return {
            campaignId,
            timestamp: Date.now(),
            passed,
            totalArtifactsCount,
            verifiedArtifactsCount,
            mismatchList,
            manifestAuthenticated,
            advisoryWarnings
        };
    }
}
