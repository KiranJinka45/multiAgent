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
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: ".env.local" });
const redis = new ioredis_1.default(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
});
async function trigger() {
    const projectId = "9a4b7634-ab3f-43cd-8230-f0ab875820c9";
    const userId = "024e8e19-03b0-466d-8951-87a17387cc2a";
    const executionId = "exec-test-dedup-" + Date.now();
    const prompt = "A steampunk style weather application with brass gears, steam animations, and copper dials.";
    console.log(`🚀 Orchestrating build ${executionId}...`);
    const freeQueue = new bullmq_1.Queue("project-generation-free-v1", { connection: redis });
    await freeQueue.add("generate-project", {
        projectId,
        userId,
        executionId,
        prompt
    }, {
        jobId: `gen:${projectId}:${executionId}`
    });
    console.log("✅ Dispatched to grid cluster.");
    process.exit(0);
}
trigger().catch(console.error);
//# sourceMappingURL=trigger-5.js.map