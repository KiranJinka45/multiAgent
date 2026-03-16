const { spawn } = require('child_process');
const fs = require('fs');

const child = spawn('npx', ['tsx', 'apps/worker/build-worker.ts'], {
    cwd: 'C:/multiAgentic_system/MultiAgent',
    shell: true,
    env: process.env
});

let output = '';

child.stdout.on('data', (data) => {
    output += data.toString();
});

child.stderr.on('data', (data) => {
    output += data.toString();
});

child.on('close', (code) => {
    fs.writeFileSync('worker_debug_output.log', output);
    console.log(`Worker exited with code ${code}. Output saved to worker_debug_output.log`);
});
