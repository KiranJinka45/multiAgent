"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./pre-init");
const bullmq_1 = require("bullmq");
const agent_queues_1 = require("../lib/queue/agent-queues");
const redis_client_1 = __importDefault(require("../queue/redis-client"));
const execution_context_1 = require("../services/execution-context");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const validatorQueue = new bullmq_1.Queue(agent_queues_1.QUEUE_VALIDATOR, { connection: redis_client_1.default });
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function run() {
    console.log('=== TEST 11: Autonomous Complex Repair (Logical Error) ===\n');
    const projectId = 'chaos-11-complex-repair';
    const context = new execution_context_1.DistributedExecutionContext();
    const executionId = context.getExecutionId();
    // 1. Setup sandbox with a LOGICAL ERROR (Incorrect Import)
    const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId);
    fs_1.default.mkdirSync(path_1.default.join(sandboxDir, 'app'), { recursive: true });
    // Create a component with a non-existent import
    const pageContent = `
import { NonExistentComponent } from './components/Missing';
export default function Page() { 
    return (
        <div>
            <h1>Complex Repair Test</h1>
            <NonExistentComponent />
        </div>
    ); 
}
`.trim();
    const layoutContent = `
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`.trim();
    const tsConfig = {
        compilerOptions: {
            target: "es5",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            forceConsistentCasingInFileNames: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "node",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./*"] }
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"]
    };
    fs_1.default.writeFileSync(path_1.default.join(sandboxDir, 'app/page.tsx'), pageContent);
    fs_1.default.writeFileSync(path_1.default.join(sandboxDir, 'app/layout.tsx'), layoutContent);
    fs_1.default.writeFileSync(path_1.default.join(sandboxDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(sandboxDir, 'package.json'), JSON.stringify({
        name: 'chaos-11-app', version: '1.0.0',
        dependencies: { next: "latest", react: "latest", "react-dom": "latest" }
    }, null, 2));
    // 2. Init context
    await context.init('user-chaos-11', projectId, 'Complex Repair Test', 'chaos-11-corr');
    await context.update({
        finalFiles: [
            { path: 'app/page.tsx', content: pageContent },
            { path: 'app/layout.tsx', content: layoutContent }
        ], status: 'executing', currentStage: 'validator'
    });
    // 3. Enqueue
    await validatorQueue.add('validate', { executionId, projectId });
    console.log(`[STEP 1] Job enqueued: ${executionId}`);
    console.log(`         Error: Incorrect import in app/page.tsx`);
    // 4. Watch for repairs
    console.log(`\n[STEP 2] Watching for RepairAgent processing...`);
    let solved = false;
    for (let i = 0; i < 20; i++) {
        await sleep(5000);
        const ctx = await context.get();
        console.log(`         [T+${(i + 1) * 5}s] Status: ${ctx?.status}, Stage: ${ctx?.currentStage}`);
        if (ctx?.status === 'completed' || ctx?.currentStage === 'dockerization' || ctx?.currentStage === 'deploy') {
            solved = true;
            break;
        }
        if (ctx?.status === 'failed' && ctx?.currentStage === 'validator') {
            // It might have failed after all heal attempts
            break;
        }
    }
    if (solved) {
        console.log(`\n  ✅ TEST 11 PASSED: RepairAgent successfully resolved the logical error!`);
    }
    else {
        console.log(`\n  ❌ TEST 11 FAILED: RepairAgent could not resolve the error or timed out.`);
        process.exit(1);
    }
    process.exit(0);
}
run().catch(console.error);
//# sourceMappingURL=chaos-complex-repair.js.map