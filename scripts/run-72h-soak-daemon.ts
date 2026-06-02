import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours
const LOG_DIR = path.resolve(__dirname, '../.ztan/soak-metrics/72h');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

console.log(`\n🚀 Starting 72-Hour Continuous Soak Campaign...`);
console.log(`📂 Logs will be written to: ${LOG_DIR}`);

const scripts = [
    { name: 'long-horizon-runner', file: 'long-horizon-runner.ts', args: [`--duration=${DURATION_MS}`] },
    { name: 'memory-drift-auditor', file: 'memory-drift-auditor.ts', args: [`--duration=${DURATION_MS}`] },
    { name: 'telemetry-archaeologist', file: 'telemetry-archaeologist.ts', args: [`--duration=${DURATION_MS}`] },
    // quarantine-frequency-analyzer runs as a summary at the end, so we will schedule it or just let the user run it at the end.
    // Actually, let's run it periodically or as a daemon if we modify it, but for now we'll run it once to baseline.
    { name: 'quarantine-frequency-analyzer', file: 'quarantine-frequency-analyzer.ts', args: [] }
];

for (const script of scripts) {
    const scriptPath = path.resolve(__dirname, script.file);
    const outLog = fs.openSync(path.join(LOG_DIR, `${script.name}-out.log`), 'a');
    const errLog = fs.openSync(path.join(LOG_DIR, `${script.name}-err.log`), 'a');

    console.log(`   ➡️ Spawning ${script.name}...`);
    
    // Use tsx to execute the typescript files
    const child = spawn('npx', ['tsx', scriptPath, ...script.args], {
        detached: true,
        stdio: ['ignore', outLog, errLog],
        cwd: path.resolve(__dirname, '..'),
        // On Windows, detached processes need shell: true or special handling sometimes,
        // but npx tsx in powershell usually works via cmd. Let's ensure shell is true.
        shell: process.platform === 'win32'
    });

    child.unref();
    console.log(`      PID: ${child.pid} (Detached)`);
}

console.log(`\n✅ All soak processes have been detached and are running in the background.`);
console.log(`   You may safely close this terminal. The processes will self-terminate after 72 hours.`);
console.log(`   Tail the logs in ${LOG_DIR} to monitor progress.\n`);
process.exit(0);
