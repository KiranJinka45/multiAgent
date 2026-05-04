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
exports.startTemporalWorker = startTemporalWorker;
const worker_1 = require("@temporalio/worker");
const observability_1 = require("@packages/observability");
const activities = __importStar(require("./activities"));
const path_1 = __importDefault(require("path"));
// In CommonJS, __filename and __dirname are available globally.
// This file is built to CJS because it is part of the worker fleet.
/**
 * Initializes and starts the Temporal Worker for the app-builder task queue.
 */
async function startTemporalWorker() {
    try {
        const worker = await worker_1.Worker.create({
            workflowsPath: path_1.default.resolve(__dirname, '../../../../packages/contracts/src/workflows/build-workflow.ts'),
            activities,
            taskQueue: 'app-builder',
            // In production, we'd add more configuration here (e.g., namespace, connection)
        });
        observability_1.logger.info('[Temporal] Worker initialized on task queue: app-builder');
        // Start polling for tasks
        await worker.run();
    }
    catch (err) {
        observability_1.logger.error({ err: err instanceof Error ? err.message : String(err) }, '[Temporal] Worker failed to start');
        // In a distributed system, we might want to crash here to let K8s restart
        throw err;
    }
}
// Start worker immediately when this file is imported (if not in test mode)
if (process.env.NODE_ENV !== 'test') {
    startTemporalWorker().catch(err => {
        observability_1.logger.error({ err }, '[Temporal] Auto-start failed');
    });
}
//# sourceMappingURL=worker.js.map