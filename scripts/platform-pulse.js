"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("@packages/db");
const utils_1 = require("@packages/utils");
const axios_1 = __importDefault(require("axios"));
/**
 * Platform Pulse
 *
 * Production-grade health verification for the MultiAgent Cluster.
 * Checks all vital subsystems and performs a loopback test.
 */
async function pulse() {
    console.log('💓 MultiAgent Platform Pulse: V17.2');
    console.log('====================================');
    const stats = {
        database: 'down',
        redis: 'down',
        api: 'down',
        workerFleet: 0,
        errors: []
    };
    // 1. Database Health
    try {
        await db_1.db.$connect();
        await db_1.db.user.count();
        stats.database = 'healthy';
        console.log('✅ Database: Connection stable');
    }
    catch (err) {
        stats.errors.push(`DB_FAIL: ${err.message}`);
        console.log('❌ Database: Connection failed');
    }
    // 2. Redis Health
    try {
        const ping = await utils_1.redis.ping();
        if (ping === 'PONG') {
            stats.redis = 'healthy';
            console.log('✅ Redis: Connection stable');
        }
    }
    catch (err) {
        stats.errors.push(`REDIS_FAIL: ${err.message}`);
        console.log('❌ Redis: Connection failed');
    }
    // 3. API Health
    try {
        const res = await axios_1.default.get('http://localhost:3001/api/system/status', { timeout: 2000 });
        if (res.data.status === 'operational') {
            stats.api = 'healthy';
            console.log('✅ API: Gateway responding (v17.2-direct)');
        }
    }
    catch (err) {
        stats.errors.push(`API_FAIL: ${err.message}`);
        console.log('❌ API: Gateway unreachable');
    }
    // 4. Worker Fleet
    try {
        const workerKeys = await utils_1.redis.keys('worker:heartbeat:*');
        stats.workerFleet = workerKeys.length;
        console.log(`✅ Workers: ${stats.workerFleet} active nodes detected`);
    }
    catch (err) {
        console.log('⚠️ Workers: Could not determine fleet size');
    }
    console.log('\n--- Final Verdict ---');
    if (stats.errors.length === 0 && stats.workerFleet > 0) {
        console.log('🚀 SYSTEM READY FOR PRODUCTION LOAD');
        process.exit(0);
    }
    else {
        console.log('🚨 SYSTEM UNSTABLE: Checks failed');
        console.log(stats.errors);
        process.exit(1);
    }
}
pulse().catch(err => {
    console.error('CRITICAL PULSE FAILURE:', err);
    process.exit(1);
});
//# sourceMappingURL=platform-pulse.js.map