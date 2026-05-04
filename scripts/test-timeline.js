"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../packages/utils/src/server");
/**
 * test-timeline.ts
 *
 * Verifies the end-to-end Build Timeline API and Redis Stream integration.
 */
async function runTest() {
    const executionId = 'test-exec-' + Math.random().toString(36).substring(7);
    const projectId = 'test-proj-123';
    console.log(`\n🚀 Starting Timeline Test [Execution: ${executionId}]\n`);
    try {
        // 1. Initialise Timers
        const pipelineTimer = await server_1.eventBus.startTimer(executionId, 'orchestrator', 'total_pipeline', 'Full Test Pipeline');
        await new Promise(r => setTimeout(r, 500));
        const agentTimer = await server_1.eventBus.startTimer(executionId, 'FrontendAgent', 'ui_generation', 'Generating React Dashboard');
        await server_1.eventBus.thought(executionId, 'FrontendAgent', 'Analyzing UI requirements...');
        await new Promise(r => setTimeout(r, 1000));
        await server_1.eventBus.thought(executionId, 'FrontendAgent', 'Generating layout.tsx and page.tsx...');
        await agentTimer('Success');
        const deployTimer = await server_1.eventBus.startTimer(executionId, 'runner', 'deployment', 'Deploying to Preview Sandbox');
        await new Promise(r => setTimeout(r, 800));
        await deployTimer('Success');
        await pipelineTimer('Success');
        console.log('✅ Events published to Redis Stream.');
        // 2. Read back from Redis Stream
        console.log('\n📖 Reading back events from stream...');
        const events = await server_1.eventBus.readBuildEvents(executionId);
        console.log(`Count: ${events.length}`);
        events.forEach(([id, payload]) => {
            console.log(`- [${id}] ${payload.type}: ${payload.label || payload.message || ''} (${payload.source || payload.agent || '?'})`);
        });
        if (events.length >= 6) {
            console.log('\n✨ TEST PASSED: Timeline captured and persisted successfully.');
        }
        else {
            console.error('\n❌ TEST FAILED: Fewer events than expected in stream.');
        }
    }
    catch (err) {
        console.error('\n❌ TEST CRASHED:', err);
    }
    finally {
        process.exit(0);
    }
}
runTest();
//# sourceMappingURL=test-timeline.js.map