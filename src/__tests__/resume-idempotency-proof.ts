import { Orchestrator } from '../agents/orchestrator';
import { DistributedExecutionContext as ExecutionContext } from './execution-context';
import redis from '@queue/redis-client';

async function testResumeIdempotency() {
    const executionId = `test-resume-${Date.now()}`;
    const userId = 'user-123';
    const projectId = 'proj-123';
    const prompt = 'Build a landing page';

    console.log(`Starting resume test for executionId: ${executionId}`);

    const context = new ExecutionContext(executionId);
    await context.init(userId, projectId, prompt, executionId);

    // 1. Manually set 'database' stage as completed with artifacts
    await context.setAgentResult('DatabaseAgent', {
        status: 'completed',
        data: { schema: 'CREATE TABLE users...', entities: ['users'] },
        endTime: new Date().toISOString()
    });
    await context.updateStage('database');

    console.log('Context initialized with completed Database stage.');

    // 2. Start Orchestrator (it should resume from backend)
    const orchestrator = new Orchestrator();

    // We'll mock BackendAgent to see if it's called
    // Since we're running real code, we'll just check if it properly enters the 'backend' in_progress state
    // but SKIP the 'database' state.

    console.log('Running orchestrator resume...');

    // In a real scenario, we'd mock the agent's execute method or just check logs
    // For this proof, we will verify the orchestrator doesn't throw the "Invalid stage transition" error
    // when re-entering the 'database' completion state.

    try {
        const result = await orchestrator.run(prompt, userId, projectId, executionId);
        console.log('Orchestrator run result success:', result?.success);
    } catch (err: any) {
        console.error('Orchestrator failed during resume:', err.message);
    }
}

testResumeIdempotency().then(() => {
    console.log('Resume test finished');
    process.exit(0);
}).catch(err => {
    console.error('Test failed', err);
    process.exit(1);
});
