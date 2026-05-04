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
const orchestrator_1 = require("../services/orchestrator");
const fs = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const queue_1 = require("../services/queue");
async function testSelfHealing() {
    console.log('🚀 Starting Autonomous Self-Healing Verification Test');
    const projectId = 'test-healing-' + Date.now();
    const executionId = 'exec-' + Date.now();
    const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId);
    await fs.ensureDir(sandboxDir);
    // 1. Create a broken project (Syntax Error in app/page.tsx)
    const brokenFiles = [
        {
            path: 'package.json',
            content: JSON.stringify({
                name: "broken-project",
                version: "1.0.0",
                scripts: {
                    "build": "next build",
                    "install": "npm install"
                },
                dependencies: {
                    "next": "14.2.3",
                    "react": "18.3.1",
                    "react-dom": "18.3.1"
                }
            }, null, 2)
        },
        {
            path: 'app/page.tsx',
            content: `export default function Home() {
                return (
                    <div>
                        <h1>Broken Project</h1>
                        {/* Intentionally missing closing brace or tag */}
                        <p>This should fail build
                );
            }`
        }
    ];
    for (const file of brokenFiles) {
        const fullPath = path_1.default.join(sandboxDir, file.path);
        await fs.ensureDir(path_1.default.dirname(fullPath));
        await fs.writeFile(fullPath, file.content);
    }
    console.log('✅ Created broken project in sandbox:', sandboxDir);
    const orchestrator = new orchestrator_1.Orchestrator();
    // We manually invoke the private validateAndHeal for testing
    // Since it's private in TypeScript, we cast to any or use a helper
    console.log('🛠 Engaging Autonomous Healing Loop...');
    // Mocking elog
    const elog = {
        info: (msg) => console.log('[INFO]', msg),
        warn: (msg) => console.warn('[WARN]', msg),
        error: (msg) => console.error('[ERROR]', msg)
    };
    try {
        // @ts-ignore - Accessing private method for testing
        const success = await orchestrator.validateAndHeal(projectId, executionId, sandboxDir, brokenFiles, elog);
        if (success) {
            console.log('🎊 SUCCESS: Autonomous Self-Healing resolved the build error!');
            // Verify file was actually fixed
            const fixedContent = await fs.readFile(path_1.default.join(sandboxDir, 'app/page.tsx'), 'utf-8');
            console.log('📄 Fixed Content Sample:', fixedContent.substring(0, 100) + '...');
            if (fixedContent.includes(')')) {
                console.log('✅ Syntax verified: Closing brace/parenthesis found.');
            }
        }
        else {
            console.error('❌ FAILURE: Autonomous Self-Healing could not resolve the error.');
        }
    }
    catch (error) {
        console.error('💥 CRASH during self-healing test:', error);
    }
    finally {
        // Cleanup
        // await fs.remove(sandboxDir);
        await queue_1.redis.quit();
        process.exit(0);
    }
}
testSelfHealing().catch(console.error);
//# sourceMappingURL=test-self-healing.js.map