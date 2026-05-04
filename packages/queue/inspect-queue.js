"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("./src");
async function inspect() {
    const waiting = await src_1.freeQueue.getWaitingCount();
    const active = await src_1.freeQueue.getActiveCount();
    const completed = await src_1.freeQueue.getCompletedCount();
    const failed = await src_1.freeQueue.getFailedCount();
    const delayed = await src_1.freeQueue.getDelayedCount();
    console.log({ waiting, active, completed, failed, delayed });
    const failedJobs = await src_1.freeQueue.getFailed();
    if (failedJobs.length > 0) {
        console.log('Last Failed Job:', failedJobs[0].id, failedJobs[0].failedReason);
    }
    process.exit(0);
}
inspect();
//# sourceMappingURL=inspect-queue.js.map