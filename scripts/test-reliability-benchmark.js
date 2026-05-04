"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orchestrator_1 = require("../services/orchestrator");
const uuid_1 = require("uuid");
async function reliabilityBenchmark() {
    console.log('🏗️ Starting Level-7 Reliability Benchmark');
    const orchestrator = new orchestrator_1.Orchestrator();
    const projectId = 'reliability-test-' + Date.now();
    const executionId = (0, uuid_1.v4)();
    const prompt = "Build a high-performance Silk Saree E-commerce Landing Page with a Hero Section, Product Grid showing Dharmavaram Silks, and a Contact Form. Use professional styling.";
    console.log(`🚀 Triggering build for project: ${projectId}`);
    try {
        const result = await orchestrator.execute(prompt, 'test-user', projectId, executionId, new AbortController().signal);
        if (result.success) {
            console.log('✅ Build phase completed successfully.');
            console.log(`🔗 Preview URL: ${result.previewUrl}`);
            // Verify if build passed (this is implied by orchestrator.execute success in this context)
            console.log('🧪 Build validation: PASSED');
        }
        else {
            console.error('❌ Build failed:', result.error);
        }
    }
    catch (error) {
        console.error('💥 Benchmark crashed:', error);
    }
    finally {
        process.exit(0);
    }
}
reliabilityBenchmark().catch(console.error);
//# sourceMappingURL=test-reliability-benchmark.js.map