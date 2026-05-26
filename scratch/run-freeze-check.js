import fs from 'fs';
import path from 'path';
import { ConstitutionalFreezeCheck } from '../packages/runtime-core/src/campaigns/constitutional-freeze-check.js';

const newFiles = [
    'packages/runtime-core/src/campaigns/hardware-attestation-campaign.ts',
    'packages/runtime-core/src/campaigns/detached-witness-anchor.ts',
    'packages/runtime-core/src/campaigns/multi-operator-divergence-campaign.ts',
    'packages/runtime-core/src/campaigns/dependency-collapse-campaign.ts',
    'packages/runtime-core/src/campaigns/cold-path-exerciser.ts',
    'packages/runtime-core/src/campaigns/economic-collapse-simulator.ts',
    'packages/runtime-core/src/campaigns/determinism-certification-campaign.ts',
    'packages/runtime-core/src/campaigns/memory-pressure-campaign.ts',
    'packages/runtime-core/src/campaigns/offline-viewer-integrity-bundle.ts',
    'packages/runtime-core/src/campaigns/semantic-loss-auditor.ts',
    'packages/runtime-core/src/campaigns/crypto-rot-campaign.ts',
    'packages/runtime-core/src/campaigns/institutional-silence-detector.ts',
    'packages/runtime-core/src/campaigns/meta-complexity-budget-auditor.ts',
    'packages/runtime-core/src/campaigns/cross-witness-divergence-campaign.ts',
    'packages/runtime-core/src/campaigns/counterfactual-diversity-campaign.ts',
    'packages/runtime-core/src/campaigns/visual-fidelity-regression-campaign.ts',
    'packages/runtime-core/src/campaigns/minimal-runtime-survivability-campaign.ts'
];

const check = new ConstitutionalFreezeCheck();
let totalViolations = 0;

for (const relPath of newFiles) {
    const absPath = path.resolve(relPath);
    console.log(`Auditing: ${relPath}`);
    const content = fs.readFileSync(absPath, 'utf8');
    const result = check.auditSourceContent(relPath, content);
    if (!result.success) {
        console.error(`❌ VIOLATIONS IN ${relPath}:`);
        for (const v of result.violationsDetected) {
            console.error(`  - ${v}`);
        }
        totalViolations += result.violationsDetected.length;
    } else {
        console.log(`✅ ${relPath} passed freeze check.`);
    }
}

if (totalViolations > 0) {
    console.error(`\nFatal: Constitutional Freeze Check found ${totalViolations} violations.`);
    process.exit(1);
} else {
    console.log('\nAll new campaigns conform to Constitutional Freeze. Excellent.');
    process.exit(0);
}
