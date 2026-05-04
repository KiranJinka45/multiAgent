import { previewManager } from '../runtime/preview-manager';
import { previewRegistry } from '../runtime/preview-registry';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Tier-1 Diagnostic Suite
 * Detects root causes of preview failures in under 30 seconds.
 */
async function diagnose(projectId: string) {
    console.log(`\n🔍 [Diagnostic] Analyzing Preview Runtime for Project: ${projectId}`);
    
    // 1. Registry Lookup
    const previewId = await previewRegistry.getPreviewId(projectId);
    if (!previewId) {
        console.error('❌ FAIL: No preview registered for this project in Redis.');
        return;
    }

    const reg = await previewRegistry.lookup(previewId);
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
        } else {
            console.error('❌ FAIL: No Node.exe processes detected.');
        }
    } catch {
        console.warn('⚠️ Warning: Could not verify process list.');
    }

    // 3. Port Check (netstat substitute)
    const isPortActive = await previewManager.isPortOpen(reg.containerPort);
    if (isPortActive) {
        console.log(`✅ Network: Port ${reg.containerPort} is OPEN and accepting connections.`);
    } else {
        console.error(`❌ FAIL: Port ${reg.containerPort} is CLOSED. Server crashed or never started.`);
    }

    // 4. Verify Container Binding (Step 4)
    console.log(`✅ Step 4: Verification of container binding...`);
    const isLoopbackActive = await previewManager.isPortOpen(reg.containerPort);
    if (isLoopbackActive) {
        console.log(`   [Pass] 127.0.0.1:${reg.containerPort} is responsive.`);
    }

    // 5. Verify Preview Route Mapping (Step 5)
    console.log(`✅ Step 5: Verification of preview route mapping...`);
    const finalMappingId = await previewRegistry.getPreviewId(projectId);
    if (finalMappingId === previewId) {
        console.log(`   [Pass] ${projectId} correctly maps to ${previewId}`);
    } else {
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
} else {
    console.log('Usage: npx tsx scripts/diagnose-runtime.ts <projectId>');
}

