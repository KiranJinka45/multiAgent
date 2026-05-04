"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const build_cache_manager_1 = require("../api-gateway/services/build-cache-manager");
const build_graph_engine_1 = require("../api-gateway/services/build-graph-engine");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
async function verifyUltimateArch() {
    console.log('=== MULTIAGENT ULTIMATE ARCHITECTURE VERIFICATION ===');
    const testProject = path_1.default.join(process.cwd(), '.previews', 'test-perf-project');
    await fs_extra_1.default.ensureDir(testProject);
    await fs_extra_1.default.writeJSON(path_1.default.join(testProject, 'package.json'), { name: 'test-perf' });
    await fs_extra_1.default.ensureDir(path_1.default.join(testProject, 'app'));
    await fs_extra_1.default.writeFile(path_1.default.join(testProject, 'app/page.tsx'), 'export default () => <div>Hello World</div>');
    // 1. Verify CAS
    console.log('\n--- 1. Verifying Content-Addressable Storage (CAS) ---');
    await build_cache_manager_1.BuildCacheManager.init();
    const startTime = Date.now();
    const hash = await build_cache_manager_1.BuildCacheManager.putBlob(testProject);
    console.log(`✅ CAS Push: ${hash}`);
    const restoreDir = path_1.default.join(process.cwd(), '.previews', 'test-restore');
    await build_cache_manager_1.BuildCacheManager.getBlob(hash, restoreDir);
    const duration = Date.now() - startTime;
    console.log(`✅ CAS Restore: ${duration}ms`);
    // 2. Verify Dependency Tracking
    console.log('\n--- 2. Verifying Dependency Tree Tracking ---');
    const affected = await build_graph_engine_1.BuildGraphEngine.getAffectedNodes(testProject);
    console.log(`✅ BuildGraph: ${affected.length} nodes affected`);
    // 3. Verify Hot-Swap Injection (Mocking pool)
    console.log('\n--- 3. Verifying Hot-Swap Injection ---');
    try {
        // Pre-warm manually for test
        // await PreviewRuntimePool.prewarm(); 
        console.log('ℹ️ Hot-Swap requires active Docker. Skipping live container test in script.');
    }
    catch (e) {
        console.log('⚠️ Hot-Swap test failed (Docker might be offline)');
    }
    console.log('\n=== VERIFICATION COMPLETE ===');
    process.exit(0);
}
verifyUltimateArch().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=verify-ultimate-arch.js.map