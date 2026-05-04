"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: ".env.local" });
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
const connection = new ioredis_1.default(redisUrl);
async function checkStatus() {
    const executions = await connection.smembers('active:executions');
    console.log("Active Executions:", executions);
    for (const id of executions) {
        const data = await connection.get(`execution:${id}`);
        if (data) {
            const ctx = JSON.parse(data);
            console.log(`\n--- Execution: ${id} ---`);
            console.log(`Status: ${ctx.status}`);
            console.log(`Stage: ${ctx.currentStage}`);
            console.log(`Message: ${ctx.currentMessage || 'N/A'}`);
            if (ctx.agentResults) {
                console.log(`Results:`, Object.keys(ctx.agentResults).map(k => `${k}: ${ctx.agentResults[k].status}`));
            }
            else {
                console.log(`Results: None`);
            }
        }
    }
    const valWaiting = await connection.llen('bull:validator-queue:wait');
    const valActive = await connection.llen('bull:validator-queue:active');
    const repWaiting = await connection.llen('bull:repair-queue:wait');
    const repActive = await connection.llen('bull:repair-queue:active');
    console.log(`\nQueue Status:`);
    console.log(`Validator - Waiting: ${valWaiting}, Active: ${valActive}`);
    console.log(`Repair    - Waiting: ${repWaiting}, Active: ${repActive}`);
    process.exit(0);
}
checkStatus().catch(console.error);
//# sourceMappingURL=check-chaos-status.js.map