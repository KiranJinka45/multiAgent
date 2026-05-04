"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("./src");
async function purge() {
    await src_1.freeQueue.drain();
    await src_1.freeQueue.obliterate({ force: true });
    console.log('Queue purged.');
    process.exit(0);
}
purge();
//# sourceMappingURL=purge-queue.js.map