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
const dotenv = __importStar(require("dotenv"));
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
dotenv.config({ path: ".env.local" });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
async function trigger() {
    console.log("Starting Trigger Script...");
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    // 1. Find the project and user
    const projectId = "e0409937-2f76-415a-9b7d-4a71282022c9";
    const { data: project, error: pErr } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (pErr) {
        console.error("Project not found:", pErr);
        return;
    }
    const userId = project.user_id;
    const prompt = project.description || "Build a simple Next.js landing page with Tailwind, a single API route, and deploy it.";
    const executionId = `exec_${Date.now()}`;
    console.log(`Triggering build for Project: ${projectId}, User: ${userId}`);
    // 2. Add to Queue
    const connection = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: null });
    const queue = new bullmq_1.Queue('project-generation-free-v1', { connection });
    const jobId = `gen:${projectId}:${executionId}`;
    await queue.add('generate-project', {
        prompt,
        userId,
        projectId,
        executionId
    }, {
        jobId,
        priority: 1,
        removeOnComplete: true
    });
    console.log(`Job added to queue: ${jobId}`);
    // 3. Update Project Status
    await supabase.from('projects').update({
        status: 'generating',
        last_execution_id: executionId
    }).eq('id', projectId);
    console.log("Project status updated to 'generating'.");
    await connection.quit();
}
trigger().then(() => console.log("Trigger finished.")).catch(err => console.error("Trigger failed:", err));
//# sourceMappingURL=trigger-manual-build.js.map