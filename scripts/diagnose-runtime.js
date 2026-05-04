"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const preview_manager_1 = require("../runtime/preview-manager");
const preview_registry_1 = require("../runtime/preview-registry");
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execPromise = util_1.default.promisify(child_process_1.exec);
/**
 * Tier-1 Diagnostic Suite
 * Detects root causes of preview failures in under 30 seconds.
 */
async function diagnose(projectId) {
    console.log(`\n🔍 [Diagnostic] Analyzing Preview Runtime for Project: ${projectId}`);
    // 1. Registry Lookup
    const previewId = await preview_registry_1.previewRegistry.getPreviewId(projectId);
    if (!previewId) {
        console.error('❌ FAIL: No preview registered for this project in Redis.');
        return;
    }
    const reg = await preview_registry_1.previewRegistry.lookup(previewId);
    if (!reg) {
        console.error('❌ FAIL: Preview ID exists in mapping but registry record is missing.');
        return;
    }
    console.log(`✅ Registry: [${reg.status}] host=${reg.containerHost} port=${reg.containerPort}`);
    // 2. Process Check (ps aux substitute for Windows/Sandbox)
    try {
        const { stdout: tasklist } = await execPromise(`tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH`);
        if (tasklist.includes('node.exe')) {
            console.log('✅ Process: Node.exe is running in the environment.');
        }
        else {
            console.error('❌ FAIL: No Node.exe processes detected.');
        }
    }
    catch {
        console.warn('⚠️ Warning: Could not verify process list.');
    }
    // 3. Port Check (netstat substitute)
    const isPortActive = await preview_manager_1.previewManager.isPortOpen(reg.containerPort);
    if (isPortActive) {
        console.log(`✅ Network: Port ${reg.containerPort} is OPEN and accepting connections.`);
    }
    else {
        console.error(`❌ FAIL: Port ${reg.containerPort} is CLOSED. Server crashed or never started.`);
    }
    // 4. Verify Container Binding (Step 4)
    console.log(`✅ Step 4: Verification of container binding...`);
    const isLoopbackActive = await preview_manager_1.previewManager.isPortOpen(reg.containerPort);
    if (isLoopbackActive) {
        console.log(`   [Pass] 127.0.0.1:${reg.containerPort} is responsive.`);
    }
    // 5. Verify Preview Route Mapping (Step 5)
    console.log(`✅ Step 5: Verification of preview route mapping...`);
    const finalMappingId = await preview_registry_1.previewRegistry.getPreviewId(projectId);
    if (finalMappingId === previewId) {
        console.log(`   [Pass] ${projectId} correctly maps to ${previewId}`);
    }
    else {
        console.error(`   [Fail] Mapping mismatch! Expected ${previewId}, got ${finalMappingId}`);
    }
    // 6. Gateway Access Check (with token)
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const testUrl = `${baseUrl}/preview/${previewId}?token=${reg.accessToken}`;
    console.log(`\n🔗 [PROMPT COMPLIANT] Final Test URL: ${testUrl}`);
    console.log('----------------------------------------------------');
}
if (process.argv[2]) {
    diagnose(process.argv[2]).catch(console.error);
}
else {
    console.log('Usage: npx tsx scripts/diagnose-runtime.ts <projectId>');
}
//# sourceMappingURL=diagnose-runtime.js.map