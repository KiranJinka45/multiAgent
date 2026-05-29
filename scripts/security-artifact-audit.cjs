const fs = require('fs');
const path = require('path');

const FORBIDDEN_STRINGS = ['allowDevBypass'];

const directoriesToScan = [
    path.join(__dirname, '../apps/gateway/dist'),
    path.join(__dirname, '../deploy/gateway/dist')
];

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return true;

    let passed = true;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!scanDirectory(fullPath)) passed = false;
        } else if (entry.isFile() && fullPath.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const forbidden of FORBIDDEN_STRINGS) {
                if (content.includes(forbidden)) {
                    console.error(`\x1b[31m[SECURITY FATAL]\x1b[0m Forbidden string "${forbidden}" found in compiled artifact: ${fullPath}`);
                    passed = false;
                }
            }
        }
    }
    return passed;
}

console.log('Running Artifact Security Scan...');
let allPassed = true;
for (const dir of directoriesToScan) {
    if (fs.existsSync(dir)) {
        console.log(`Scanning ${dir}...`);
        if (!scanDirectory(dir)) {
            allPassed = false;
        }
    } else {
        console.log(`Skipping ${dir} (does not exist)`);
    }
}

if (!allPassed) {
    console.error('\x1b[31mArtifact audit failed! Fix security violations before deployment.\x1b[0m');
    process.exit(1);
} else {
    console.log('\x1b[32mArtifact audit passed. No forbidden strings found.\x1b[0m');
    process.exit(0);
}
