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
require("dotenv/config");
const node_cluster_1 = __importDefault(require("node:cluster"));
node_cluster_1.default.schedulingPolicy = node_cluster_1.default.SCHED_RR;
const node_os_1 = __importDefault(require("node:os"));
const observability_1 = require("@packages/observability");
if (node_cluster_1.default.isPrimary) {
    const rawCpuCount = node_os_1.default.cpus().length;
    // Cap at 4 workers in dev to prevent OOM on high-core machines.
    const maxWorkers = process.env.CLUSTER_WORKERS ? parseInt(process.env.CLUSTER_WORKERS) : Math.min(rawCpuCount, 4);
    observability_1.logger.info(`[AuthService] Primary Cluster Manager ${process.pid} is running`);
    observability_1.logger.info(`[AuthService] Forking ${maxWorkers} worker processes (Detected Cores: ${rawCpuCount})...`);
    // Stagger forks to prevent race conditions
    for (let i = 0; i < maxWorkers; i++) {
        setTimeout(() => {
            if (node_cluster_1.default.isPrimary) {
                node_cluster_1.default.fork();
            }
        }, i * 1000); // 1 second gap per worker
    }
    node_cluster_1.default.on('exit', (worker, code, signal) => {
        observability_1.logger.warn({ pid: worker.process.pid, code, signal }, `[AuthService] Worker identity process died! Spawning replacement...`);
        node_cluster_1.default.fork();
    });
}
else {
    // Dynamic import of the server logic only in workers
    Promise.resolve().then(() => __importStar(require('./server.js'))).then(({ startAuthServer }) => {
        startAuthServer().catch(err => {
            observability_1.logger.error({ err }, '[AuthService] Failed to start worker server');
            process.exit(1);
        });
    }).catch(err => {
        console.error('[AuthService] Failed to load server module:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map