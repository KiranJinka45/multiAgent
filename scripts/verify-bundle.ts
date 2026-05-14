import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

/**
 * ZTAN Forensic Bundle Verifier
 * Validates the SHA256 manifest of an incident evidence bundle.
 */

const bundlePath = process.argv[2];

if (!bundlePath || !existsSync(bundlePath)) {
    console.error('❌ Usage: tsx scripts/verify-bundle.ts <bundle-directory>');
    process.exit(1);
}

const manifestPath = join(bundlePath, 'manifest.sha256');

if (!existsSync(manifestPath)) {
    console.error('❌ Error: manifest.sha256 not found in bundle.');
    process.exit(1);
}

console.log(`🔍 Verifying ZTAN Forensic Bundle: ${bundlePath}`);

const manifestLines = readFileSync(manifestPath, 'utf-8').split('\n').filter(Boolean);
let hasError = false;

for (const line of manifestLines) {
    const [expectedHash, ...fileParts] = line.split(/\s+/);
    const filePath = fileParts.join(' ');
    const fullPath = join(bundlePath, filePath);

    if (!existsSync(fullPath)) {
        console.error(`❌ Missing file: ${filePath}`);
        hasError = true;
        continue;
    }

    const fileBuffer = readFileSync(fullPath);
    const actualHash = createHash('sha256').update(fileBuffer).digest('hex');

    if (actualHash === expectedHash) {
        console.log(`✅ ${filePath}: OK`);
    } else {
        console.error(`❌ ${filePath}: HASH MISMATCH!`);
        console.error(`   Expected: ${expectedHash}`);
        console.error(`   Actual:   ${actualHash}`);
        hasError = true;
    }
}

if (hasError) {
    console.error('\n🚨 BUNDLE VERIFICATION FAILED: Evidence may be tampered or incomplete.');
    process.exit(1);
} else {
    console.log('\n🏆 BUNDLE VERIFICATION PASSED: Forensic integrity confirmed.');
}
