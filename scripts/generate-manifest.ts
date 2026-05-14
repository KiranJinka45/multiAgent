import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

/**
 * ZTAN Manifest Generator
 * Creates a SHA256 manifest for a directory of evidence.
 */

const targetDir = process.argv[2];

if (!targetDir) {
    console.error('❌ Usage: tsx scripts/generate-manifest.ts <directory>');
    process.exit(1);
}

function getFiles(dir: string): string[] {
    const subdirs = readdirSync(dir);
    const files = subdirs.map((subdir) => {
        const res = join(dir, subdir);
        return statSync(res).isDirectory() ? getFiles(res) : res;
    });
    return files.flat();
}

console.log(`📝 Generating manifest for: ${targetDir}`);

const allFiles = getFiles(targetDir).filter(f => !f.endsWith('manifest.sha256'));
const manifestLines: string[] = [];

for (const file of allFiles) {
    const fileBuffer = readFileSync(file);
    const hash = createHash('sha256').update(fileBuffer).digest('hex');
    const relativePath = relative(targetDir, file);
    manifestLines.push(`${hash}  ${relativePath}`);
}

writeFileSync(join(targetDir, 'manifest.sha256'), manifestLines.join('\n') + '\n');
console.log('✅ manifest.sha256 generated.');
