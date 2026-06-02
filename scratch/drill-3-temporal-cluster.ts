import { TemporalWorkflowOrchestrator, EscalationDecisionSignal } from '../packages/governance-core/src/escalation/temporal-workflow.js';
import type { CommandExecutionProposal } from '../packages/governance-core/src/filters/command-filter.js';
import * as child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);
const spawn = child_process.spawn;

async function main() {
    console.log('--- Priority 3: Real Temporal Cluster Drill ---');
    
    // We intentionally start the worker in a separate process so we can SIGKILL it
    console.log('[Step 1] Booting independent Temporal Worker process...');
    
    // The worker is located at packages/governance-core/src/escalation/temporal-worker.ts
    const workerProcess = spawn('npx.cmd', ['tsx', 'packages/governance-core/src/escalation/temporal-worker.ts'], {
        stdio: 'pipe',
        shell: true
    });
    
    workerProcess.stdout.on('data', (data) => console.log(`  [Worker PID ${workerProcess.pid}] ${data.toString().trim()}`));
    workerProcess.stderr.on('data', (data) => console.error(`  [Worker PID ${workerProcess.pid}] ERROR: ${data.toString().trim()}`));
    
    // Give the worker some time to boot
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n[Step 2] Initializing Orchestrator Client and triggering Workflow...');
    const proposal: CommandExecutionProposal = {
        tenantId: 'tenant-test',
        toolName: 'system_modification',
        payload: 'test-payload',
        dryRunMode: false
    };
    
    const workflowId = await TemporalWorkflowOrchestrator.startEscalationWorkflow(proposal, 600000); // 10 minutes timeout
    console.log(`✅ Started Durable Escalation Workflow with ID: ${workflowId}`);
    
    // Verify it is active
    console.log('\n[Step 3] Sending SIGKILL to the Worker process...');
    workerProcess.kill('SIGKILL');
    console.log(`✅ Worker process (PID ${workerProcess.pid}) forcibly killed (Simulating node crash)`);
    
    // Wait for the process to actually die
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n[Step 4] Restarting Worker process from scratch...');
    const newWorkerProcess = spawn('npx.cmd', ['tsx', 'packages/governance-core/src/escalation/temporal-worker.ts'], {
        stdio: 'pipe',
        shell: true
    });
    
    newWorkerProcess.stdout.on('data', (data) => console.log(`  [New Worker PID ${newWorkerProcess.pid}] ${data.toString().trim()}`));
    newWorkerProcess.stderr.on('data', (data) => console.error(`  [New Worker PID ${newWorkerProcess.pid}] ERROR: ${data.toString().trim()}`));
    
    // Give the new worker time to boot and resume the workflow
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n[Step 5] Sending Decision Signal to the restarted workflow...');
    // We import the temporal client directly to send a signal
    const { Connection, Client } = await import('@temporalio/client');
    const connection = await Connection.connect({ address: 'localhost:7233' });
    const client = new Client({ connection });
    
    const handle = client.workflow.getHandle(workflowId);
    
    const signalData: EscalationDecisionSignal = { decision: 'APPROVE', decidedBy: 'steward_test' };
    await handle.signal('escalationDecision', signalData);
    
    console.log('✅ Signal dispatched to Workflow!');
    
    console.log('\n[Step 6] Awaiting durable completion...');
    const result = await handle.result();
    
    console.log(`✅ Workflow completed durably! Final State:`, result);
    
    // Cleanup
    newWorkerProcess.kill();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
