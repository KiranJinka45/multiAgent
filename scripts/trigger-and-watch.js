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
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: ".env.local" });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
async function triggerAndWatch() {
    const projectId = "9a4b7634-ab3f-43cd-8230-f0ab875820c9";
    const executionId = "test-" + Date.now();
    console.log(`Triggering build for project ${projectId} with execution ${executionId}...`);
    try {
        // We need a session, so we'll use the service role to simulate the user if we can, 
        // but the API uses createRouteHandlerClient which checks cookies.
        // Instead, I'll just manually add a job to the queue like trigger-manual-build.ts did.
        const { freeQueue } = await Promise.resolve().then(() => __importStar(require('./src/lib/queue')));
        await freeQueue.add('generate-project', {
            prompt: "Build a simple Next.js landing page with Tailwind, a single API route, and deploy it.",
            userId: "bfad-407a-86ce-4bb6d45acc51", // From list-projects.ts earlier
            projectId,
            executionId
        }, {
            jobId: `gen:${projectId}:${executionId}`,
            removeOnComplete: true
        });
        console.log("Job added to queue.");
        // Wait and check status
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const state = await Promise.resolve().then(() => __importStar(require('./src/lib/redis'))).then(r => r.default.get(`build:state:${executionId}`));
            if (state) {
                const parsed = JSON.parse(state);
                console.log(`Step ${i}: Status = ${parsed.status}, Stage = ${parsed.currentStage}`);
                if (parsed.status === 'completed' || parsed.status === 'failed')
                    break;
            }
            else {
                console.log(`Step ${i}: No state yet...`);
            }
        }
    }
    catch (err) {
        console.error(err);
    }
}
triggerAndWatch();
//# sourceMappingURL=trigger-and-watch.js.map