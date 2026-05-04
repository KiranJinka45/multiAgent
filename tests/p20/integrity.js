"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tests/p20/integrity.ts
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
// 1. DB Integrity Verifier (Prisma)
const prisma = new client_1.PrismaClient();
async function checkDbIntegrity() {
    try {
        // Audit for duplicated event IDs (violation of idempotency)
        const logsWithDuplicates = await prisma.executionLog.groupBy({
            by: ["eventId"],
            _count: true,
            having: {
                eventId: {
                    _count: { gt: 1 }
                }
            }
        });
        if (logsWithDuplicates.length > 0) {
            console.error(JSON.stringify({
                type: "ALARM_INTEGRITY_FAILURE",
                timestamp: new Date().toISOString(),
                severity: "CRITICAL",
                message: "DUPLICATE EVENTS DETECTED IN LOGS",
                details: logsWithDuplicates
            }));
        }
        else {
            console.log(JSON.stringify({
                type: "LOG_INTEGRITY_SAFE",
                timestamp: new Date().toISOString(),
                message: "Database consistency verified (No duplicates)."
            }));
        }
    }
    catch (e) {
        console.error(JSON.stringify({ type: "ERROR_DB_CHECK", error: e.message }));
    }
}
// 2. Health Agent (External)
const TARGET_HEALTH = process.env.TARGET || "http://localhost:4080/health";
async function checkHTTPHealth() {
    try {
        const res = await axios_1.default.get(TARGET_HEALTH);
        console.log(JSON.stringify({
            type: "METRIC_HEALTH",
            timestamp: new Date().toISOString(),
            status: "UP",
            code: res.status,
            latency: res.headers["x-response-time"] || "unknown"
        }));
    }
    catch (e) {
        console.error(JSON.stringify({
            type: "ALARM_SERVICE_DOWN",
            timestamp: new Date().toISOString(),
            error: e.message
        }));
    }
}
// Schedules
setInterval(checkDbIntegrity, 300000); // Check DB every 5 minutes
setInterval(checkHTTPHealth, 30000); // Check Health every 30 seconds
console.log(`🛡️  Integrity & Health Agents active.`);
//# sourceMappingURL=integrity.js.map