const path = require('path');
const fs = require('fs');

console.log('--- Hybrid Resolution Test ---');
const libPath = path.resolve(__dirname, 'lib/queue/agent-queues.ts');
console.log('Checking path:', libPath);
console.log('File exists:', fs.existsSync(libPath));

try {
    // If running with tsx, this should work if we use tsx capabilities
    // For now, let's just use dynamic import
    import('./lib/queue/agent-queues.ts').then(mod => {
        console.log('ESM Import Success! QUEUE_VALIDATOR:', mod.QUEUE_VALIDATOR);
    }).catch(err => {
        console.log('ESM Import Failed:', err.message);
    });
} catch (e) {
    console.log('Import block error:', e.message);
}
