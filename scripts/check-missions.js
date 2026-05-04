"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const db = new client_1.PrismaClient();
async function run() {
    try {
        const count = await db.mission.count();
        console.log('Mission Count:', count);
    }
    catch (err) {
        console.error('Error:', err);
    }
    finally {
        await db.$disconnect();
    }
}
run();
//# sourceMappingURL=check-missions.js.map