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
// @ts-nocheck
const worker_1 = require("@temporalio/worker");
const activities = __importStar(require("@packages/orchestrator/activities/agentActivities"));
const path_1 = __importDefault(require("path"));
// --- AGENT REGISTRATION ---
const utils_1 = require("@packages/utils");
const agents_1 = require("@packages/agents");
const agents_2 = require("@packages/agents");
const agents_3 = require("@packages/agents");
const agents_4 = require("@packages/agents");
const agents_5 = require("@packages/agents");
const agents_6 = require("@packages/agents");
const agents_7 = require("@packages/agents");
const agents_8 = require("@packages/agents");
const agents_9 = require("@packages/agents");
const agents_10 = require("@packages/agents");
const agents_11 = require("@packages/agents");
const agents_12 = require("@packages/agents");
const agents_13 = require("@packages/agents");
const agents_14 = require("@packages/agents");
// Register with standardized lowercase keys
utils_1.agentRegistry.register('database', new agents_1.DatabaseAgent());
utils_1.agentRegistry.register('backend', new agents_2.BackendAgent());
utils_1.agentRegistry.register('frontend', new agents_3.FrontendAgent());
utils_1.agentRegistry.register('deploy', new agents_4.DeploymentAgent());
utils_1.agentRegistry.register('security', new agents_5.SecurityAgent());
utils_1.agentRegistry.register('monitoring', new agents_6.MonitoringAgent());
utils_1.agentRegistry.register('billing', new agents_7.SaaSMonetizationAgent());
utils_1.agentRegistry.register('planner', new agents_8.PlannerAgent());
utils_1.agentRegistry.register('research', new agents_9.ResearchAgent());
utils_1.agentRegistry.register('debug', new agents_10.DebugAgent());
utils_1.agentRegistry.register('architecture', new agents_11.ArchitectureAgent());
utils_1.agentRegistry.register('ranking', new agents_12.RankingAgent());
utils_1.agentRegistry.register('repair', new agents_13.RepairAgent());
// CriticAgent doesn't match TaskAgent exactly due to its unique execute signature. 
// We cast it to any and we will potentially refactor it later if needed for full type safety.
utils_1.agentRegistry.register('critic', new agents_14.CriticAgent());
async function run() {
    console.log('[TemporalWorker] Starting distributed agent worker...');
    const worker = await worker_1.Worker.create({
        workflowsPath: path_1.default.resolve(__dirname, '../orchestrator/workflows'),
        activities: activities.createActivities('system-worker'),
        taskQueue: 'app-builder',
    });
    await worker.run();
}
run().catch((err) => {
    console.error('[TemporalWorker] Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=temporal-worker.js.map