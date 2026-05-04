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
const supabase_js_1 = require("@libs/supabase/supabase-js");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: ".env.local" });
const redis = new ioredis_1.default(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
});
async function triggerAndWatch() {
    const projectId = "9a4b7634-ab3f-43cd-8230-f0ab875820c9";
    const userId = "024e8e19-03b0-466d-8951-87a17387cc2a"; // From your profile check
    const executionId = "exec-" + Date.now();
    const prompt = "A high-performance stock trading dashboard with real-time charts using Next.js and Tailwind CSS.";
    console.log(`🚀 Triggering build for project ${projectId}...`);
    console.log(`Execution ID: ${executionId}`);
    const freeQueue = new bullmq_1.Queue("project-generation-free-v1", { connection: redis });
    await freeQueue.add("generate-project", {
        projectId,
        userId,
        executionId,
        prompt
    }, {
        jobId: `gen:${projectId}:${executionId}`
    });
    console.log("✅ Job added to queue. Watching state in Redis...");
    const stateKey = `build:state:${executionId}`;
    let lastStage = "";
    let lastProgress = -1;
    const interval = setInterval(async () => {
        const stateStr = await redis.get(stateKey);
        if (stateStr) {
            const state = JSON.parse(stateStr);
            if (state && state.status && (state.currentStage !== lastStage || state.totalProgress !== lastProgress)) {
                console.log(`[${state.status.toUpperCase()}] Stage: ${state.currentStage ?? 'unknown'} (${state.totalProgress ?? 0}%) - ${state.message ?? 'N/A'}`);
                lastStage = state.currentStage;
                lastProgress = state.totalProgress;
            }
            if (state.status === "completed") {
                console.log("\n✨ BUILD COMPLETED SUCCESSFULLY!");
                clearInterval(interval);
                await verifyPersistence(projectId);
                process.exit(0);
            }
            else if (state.status === "failed") {
                console.error("\n❌ BUILD FAILED!");
                console.error(state.error);
                clearInterval(interval);
                process.exit(1);
            }
        }
    }, 1000);
}
async function verifyPersistence(projectId) {
    console.log("\n🔍 Verifying persistence in Supabase...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    // Check project status
    const { data: project } = await supabase.from('projects').select('status').eq('id', projectId).single();
    console.log(`Database Project Status: ${project?.status}`);
    // Check files
    const { count } = await supabase.from('project_files').select('*', { count: 'exact', head: true }).eq('project_id', projectId);
    console.log(`Database Project Files: ${count}`);
}
triggerAndWatch().catch(console.error);
//# sourceMappingURL=trigger-verify.js.map