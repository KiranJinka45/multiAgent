"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("./packages/db/src");
async function checkFeedback() {
    const feedback = await src_1.db.betaFeedback.findMany();
    console.log('--- BETA FEEDBACK ENTRIES ---');
    feedback.forEach(f => {
        console.log(`[${f.type}] Status: ${f.status} | Content: ${f.content}`);
    });
    await src_1.db.$disconnect();
}
checkFeedback();
//# sourceMappingURL=check-feedback.js.map