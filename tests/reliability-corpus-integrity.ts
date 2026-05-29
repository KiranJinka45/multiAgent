import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../');

console.log('================================================================================');
console.log('🧪  ZTAN RELIABILITY CORPUS INTEGRITY TEST');
console.log('================================================================================\n');

try {
    console.log('⚡ Running corpus manager verification...');
    const output = execSync('npx tsx scripts/corpus-manager.ts --verify', {
        cwd: workspaceRoot,
        encoding: 'utf8'
    });
    console.log(output);
    console.log('✅ ZTAN Reliability Corpus Integrity check PASSED successfully.');
    process.exit(0);
} catch (e: any) {
    console.error('❌ ZTAN Reliability Corpus Integrity check FAILED!');
    console.error(e.stdout || e.stderr || e.message);
    process.exit(1);
}
