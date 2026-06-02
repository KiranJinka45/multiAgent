import { AgentCoordinator } from '../packages/governance-core/src/intelligence/agent-coordinator.js';

async function runTrace() {
    console.log('[Trace] Initializing AgentCoordinator...');
    try {
        const coordinator = new AgentCoordinator();
        
        console.log('[Trace] Calling coordinateObjective...');
        const result = await coordinator.coordinateObjective("Add additional logging to the database layer to track slow queries.", "platform-admin");
        
        console.log('[Trace] Coordination Result:');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('[Trace] Coordination Failed:', err.message);
    }
}

runTrace();
