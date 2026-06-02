import { TemporalWorkflowOrchestrator } from '../packages/governance-core/src/escalation/temporal-workflow.js';
import * as fs from 'fs';

async function runDrill() {
    console.log('=== Drill 3: Live Temporal Persistence Recovery Drill ===');
    process.env.NODE_ENV = 'test';
    
    // Step 1: Start Esc Workflow
    console.log('[Drill] 1. Dispatching Esc Workflow...');
    const mockProposal: any = { id: 'test-prop', payload: '{}' };
    const workflowId = await TemporalWorkflowOrchestrator.startEscalationWorkflow(mockProposal, 60000);
    
    console.log(`[Drill] Workflow started: ${workflowId}`);
    console.log(`[Drill] Current State:`, TemporalWorkflowOrchestrator.getWorkflowState(workflowId));
    
    // Step 2: Serialize
    console.log('\n[Drill] 2. Serializing Workflow State (Simulating Durable Storage)...');
    const stateJson = (TemporalWorkflowOrchestrator as any).serializeState();
    console.log(`[Drill] Serialized Output:`, stateJson);
    fs.writeFileSync('temporal-state-dump.json', stateJson);
    
    // Step 3: Terminate the memory
    console.log('\n[Drill] 3. Terminating Worker Node (clearing memory)...');
    (TemporalWorkflowOrchestrator as any).activeWorkflows.clear();
    console.log(`[Drill] Workflows in memory: ${(TemporalWorkflowOrchestrator as any).activeWorkflows.size}`);
    
    // Step 4: Deserialize and verify recovery
    console.log('\n[Drill] 4. Bootstrapping New Worker Node (Restoring State)...');
    const recoveredJson = fs.readFileSync('temporal-state-dump.json', 'utf8');
    (TemporalWorkflowOrchestrator as any).deserializeState(recoveredJson);
    
    const recoveredState = TemporalWorkflowOrchestrator.getWorkflowState(workflowId);
    console.log(`[Drill] Recovered State:`, recoveredState);
    
    if (recoveredState && recoveredState.status === 'PENDING') {
        console.log('\n[Drill] SUCCESS: The Temporal Workflow durably resumed from PENDING status.');
    } else {
        console.log('\n[Drill] FAILED: Workflow state was not properly recovered.');
        process.exit(1);
    }
    
    process.exit(0);
}

runDrill();
