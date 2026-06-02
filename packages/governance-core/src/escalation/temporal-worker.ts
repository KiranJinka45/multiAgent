import { Worker } from '@temporalio/worker';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    // Determine the workflows path. In this repository, temporal-workflow.ts is the file that contains the workflows.
    const workflowsPath = path.join(__dirname, 'temporal-workflow.ts');
    
    console.log(`[Temporal Worker] Initializing...`);
    const worker = await Worker.create({
        workflowsPath,
        taskQueue: 'ztan-escalation',
    });

    console.log(`[Temporal Worker] Worker created successfully! Starting execution...`);
    await worker.run();
}

main().catch(err => {
    console.error(`[Temporal Worker] FATAL ERROR:`, err);
    process.exit(1);
});
