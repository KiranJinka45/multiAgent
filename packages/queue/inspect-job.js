"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("./src");
async function inspect(jobId) {
    const job = await src_1.freeQueue.getJob(jobId);
    if (!job) {
        console.log('Job not found');
        process.exit(1);
    }
    console.log(JSON.stringify({
        id: job.id,
        status: await job.getState(),
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        data: job.data
    }, null, 2));
    process.exit(0);
}
const jobId = process.argv[2];
if (!jobId) {
    console.error('Usage: ts-node inspect-job.ts [jobId]');
    process.exit(1);
}
inspect(jobId);
//# sourceMappingURL=inspect-job.js.map