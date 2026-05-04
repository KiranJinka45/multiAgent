"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const queue_1 = require("@packages/queue");
const uuid_1 = require("uuid");
async function simulateHighLoad() {
    const tenantId = `tenant_sim_${(0, uuid_1.v4)().substring(0, 8)}`;
    const numJobs = 50; // Trigger high load
    console.log(`🚀 Starting High-Load Simulation for Tenant: ${tenantId}`);
    console.log(`📡 Injecting ${numJobs} concurrent missions into the pipeline...`);
    const promises = [];
    for (let i = 0; i < numJobs; i++) {
        const executionId = `sim_job_${(0, uuid_1.v4)().substring(0, 8)}`;
        promises.push(queue_1.freeQueue.add('build-job', {
            executionId,
            projectId: `sim_proj_${i}`,
            userId: tenantId,
            prompt: `High load simulation task ${i}`,
            isFastPreview: true
        }));
    }
    await Promise.all(promises);
    console.log(`✅ Successfully injected ${numJobs} jobs into the queue.`);
    console.log('👀 The SLA Engine should detect this spike within 5 seconds and trigger scaling events.');
    console.log('💰 Once processed, the Billing Engine will calculate costs for this tenant.');
    // Allow time for processing to start before exit
    setTimeout(() => {
        console.log('🏁 Load injected. Monitor the SRE Cockpit for real-time scaling and billing updates.');
        process.exit(0);
    }, 10000);
}
simulateHighLoad().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=high-load-simulation.js.map