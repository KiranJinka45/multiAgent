import dotenv from 'dotenv';
dotenv.config();

import {
  TaskLifecycleEngine,
  TaskState,
  TaskStateTransitionReport,
  ExecutionJournal,
  JournalEntry,
  SandboxSupervisor,
  SandboxResourceUsage,
  SandboxReport,
  ExecutionContractValidator,
  ExecutionContract,
  ContractValidationReport,
  ExecutionCapabilityRegistry,
  ExecutionCapability,
  RollbackCoordinator,
  ExecutionStep,
  RollbackAction,
  RollbackReport,
  BoundedWorkflowEngine,
  WorkflowNode,
  WorkflowEdge,
  WorkflowGraph,
  ExecutionCoordinator,
  ExecutionTaskResult
} from '../packages/runtime-core/src/index';

async function runPhase27Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 27 — DETERMINISTIC EXECUTION KERNEL VERIFICATION DRILLS');
  console.log('================================================================================\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Task Lifecycle State transitions
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Testing Task Lifecycle State Machine...');
  const lifecycle = new TaskLifecycleEngine();

  // Case A: Valid transition
  const transA = lifecycle.transitionState('task-100', 'INIT', 'RUNNING');
  console.log(`     - Valid transition INIT -> RUNNING: success=${transA.success}, fromState=${transA.fromState}, toState=${transA.toState}`);
  if (!transA.success || transA.toState !== 'RUNNING') {
    throw new Error('TaskLifecycleEngine failed valid state transition!');
  }

  // Case B: Invalid transition (e.g. SUCCESS -> RUNNING)
  const transB = lifecycle.transitionState('task-100', 'SUCCESS', 'RUNNING');
  console.log(`     - Invalid transition SUCCESS -> RUNNING: success=${transB.success}, error="${transB.error}"`);
  if (transB.success || !transB.error?.includes('Invalid')) {
    throw new Error('TaskLifecycleEngine allowed invalid state transition SUCCESS -> RUNNING!');
  }

  console.log('  ✅ Task Lifecycle State Machine verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: WAL Journal Logging & Recovery Reconstruction
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Testing WAL Journal Logging & Recovery Reconstruction...');
  const journal = new ExecutionJournal();

  journal.appendEntry('task-200', 0, 'INIT', { start: true });
  journal.appendEntry('task-200', 1, 'RUNNING', { completedStep: 'CREATE_FILE' });
  journal.appendEntry('task-200', 2, 'RUNNING', { completedStep: 'WRITE_DATABASE' });

  // Reconstruct state
  const recovery = journal.reconstructTaskState('task-200');
  console.log(`     - WAL Reconstruction: lastStepIndex=${recovery.lastStepIndex}, lastState=${recovery.lastState}`);
  if (recovery.lastStepIndex !== 2 || recovery.lastState !== 'RUNNING') {
    throw new Error('ExecutionJournal failed to reconstruct correct last task state!');
  }

  console.log('  ✅ WAL Journal Recovery verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Sandbox Supervisor (cgroup resource & seccomp validation)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Testing Sandbox Supervisor...');
  const supervisor = new SandboxSupervisor(256); // Limit 256MB

  // Case A: Clean execution complying with limits
  const usageClean: SandboxResourceUsage = {
    cpuPercent: 30.0,
    memoryMb: 120,
    maxMemoryLimitMb: 256,
    sysCallsCount: 15
  };
  const reportClean = supervisor.superviseSandbox(usageClean, ['read', 'write', 'open']);
  console.log(`     - Clean Sandbox: isIsolated=${reportClean.isIsolated}, resourceCompliant=${reportClean.resourceCompliant}`);
  if (!reportClean.isIsolated || !reportClean.resourceCompliant) {
    throw new Error('SandboxSupervisor flagged clean sandbox as non-compliant!');
  }

  // Case B: Seccomp restricted syscall violation (reboot)
  const reportSeccomp = supervisor.superviseSandbox(usageClean, ['read', 'sys_reboot']);
  console.log(`     - Seccomp Violation: isIsolated=${reportSeccomp.isIsolated}, syscallBlocked=${reportSeccomp.restrictedSyscallBlocked}, violations=[${reportSeccomp.violations.join('; ')}]`);
  if (reportSeccomp.isIsolated || !reportSeccomp.restrictedSyscallBlocked) {
    throw new Error('SandboxSupervisor failed to block restricted syscall sys_reboot!');
  }

  // Case C: File system overlay escape attempt
  const reportEscape = supervisor.superviseSandbox(usageClean, ['read'], true);
  console.log(`     - Namespace Escape: isIsolated=${reportEscape.isIsolated}, quarantineTriggered=${reportEscape.quarantineTriggered}`);
  if (reportEscape.isIsolated || !reportEscape.quarantineTriggered) {
    throw new Error('SandboxSupervisor failed to trigger quarantine on namespace privilege escalation!');
  }

  console.log('  ✅ Sandbox Supervisor verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Execution Contract Validator
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Testing Execution Contract Validator...');
  const validator = new ExecutionContractValidator();
  
  const contract: ExecutionContract = {
    expectedInputs: ['filePath', 'mode'],
    expectedOutputs: ['bytesWritten', 'checksum'],
    allowOptional: false
  };

  // Case A: Perfect contract match
  const inputsValid = { filePath: 'src/main.ts', mode: 'w' };
  const outputsValid = { bytesWritten: 1024, checksum: 'sha-abc123xyz' };
  const auditValid = validator.validateContract(contract, inputsValid, outputsValid);
  console.log(`     - Valid Contract: isValid=${auditValid.isValid}`);
  if (!auditValid.isValid) {
    throw new Error('ExecutionContractValidator flagged perfect contract matching as invalid!');
  }

  // Case B: Missing mandatory outputs & unexpected inputs
  const inputsInvalid = { filePath: 'src/main.ts', mode: 'w', extraArg: 'dangerous-inject' };
  const outputsInvalid = { bytesWritten: 1024 }; // Missing checksum!
  const auditInvalid = validator.validateContract(contract, inputsInvalid, outputsInvalid);
  console.log(`     - Invalid Contract: isValid=${auditInvalid.isValid}, error="${auditInvalid.error}"`);
  if (auditInvalid.isValid || auditInvalid.missingOutputs.length === 0 || auditInvalid.unexpectedKeys.length === 0) {
    throw new Error('ExecutionContractValidator failed to identify missing output/unexpected inputs contract divergence!');
  }

  console.log('  ✅ Execution Contract Validator verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 5: Execution Capability Registry
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 5] Testing Execution Capability Registry...');
  const registry = new ExecutionCapabilityRegistry(['fs_read', 'db_write']);

  // Case A: Permit fs_read
  const hasRead = registry.hasCapability('fs_read');
  console.log(`     - Allowed: fs_read=${hasRead}`);
  if (!hasRead) {
    throw new Error('ExecutionCapabilityRegistry denied registered fs_read capability!');
  }

  // Case B: Deny subprocess
  const hasSubprocess = registry.hasCapability('subprocess');
  console.log(`     - Blocked: subprocess=${hasSubprocess}`);
  if (hasSubprocess) {
    throw new Error('ExecutionCapabilityRegistry allowed unregistered subprocess capability!');
  }

  // Case C: Dynamic registration
  registry.registerCapability('subprocess');
  const hasSubprocessPost = registry.hasCapability('subprocess');
  console.log(`     - Dynamic Register: subprocess=${hasSubprocessPost}`);
  if (!hasSubprocessPost) {
    throw new Error('ExecutionCapabilityRegistry failed dynamic capability registration!');
  }

  console.log('  ✅ Execution Capability Registry verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 6: Bounded Workflow Engine (DAG topology check)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 6] Testing Bounded Workflow Engine DAG topology...');
  const workflowEngine = new BoundedWorkflowEngine();

  // Case A: Valid DAG graph
  const validGraph: WorkflowGraph = {
    nodes: [
      { id: 'node-A', actionType: 'fs_read', payload: {} },
      { id: 'node-B', actionType: 'fs_write', payload: {} },
      { id: 'node-C', actionType: 'db_write', payload: {} }
    ],
    edges: [
      { from: 'node-A', to: 'node-B' },
      { from: 'node-B', to: 'node-C' }
    ]
  };
  const dagCheckValid = workflowEngine.validateWorkflowDAG(validGraph);
  console.log(`     - Valid Graph DAG: isDag=${dagCheckValid.isDag}`);
  if (!dagCheckValid.isDag) {
    throw new Error('BoundedWorkflowEngine flagged valid graph DAG as recursive cycle!');
  }

  // Case B: Recursive Graph Cycle
  const recursiveGraph: WorkflowGraph = {
    nodes: [
      { id: 'node-A', actionType: 'fs_read', payload: {} },
      { id: 'node-B', actionType: 'fs_write', payload: {} }
    ],
    edges: [
      { from: 'node-A', to: 'node-B' },
      { from: 'node-B', to: 'node-A' } // Cycle back!
    ]
  };
  const dagCheckRecursive = workflowEngine.validateWorkflowDAG(recursiveGraph);
  console.log(`     - Recursive Graph DAG: isDag=${dagCheckRecursive.isDag}, error="${dagCheckRecursive.error}"`);
  if (dagCheckRecursive.isDag || !dagCheckRecursive.error?.includes('Recursive')) {
    throw new Error('BoundedWorkflowEngine failed to block recursive workflow graphs!');
  }

  console.log('  ✅ Bounded Workflow Engine verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 7: Safe Transaction Rollback Coordinator
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 7] Testing Rollback Coordinator...');
  const rollbackCoordinator = new RollbackCoordinator();

  const completedSteps: ExecutionStep[] = [
    { actionType: 'CREATE_FILE', payload: { filePath: 'temp.log' } },
    { actionType: 'WRITE_DATABASE', payload: { table: 'audit_log', recordId: 'tx-999' } }
  ];

  const executedReversals: RollbackAction[] = [];

  // Execute LIFO rollback
  const rollbackReport = await rollbackCoordinator.executeRollback(completedSteps, async (action) => {
    executedReversals.push(action);
  });

  console.log(`     - Rollback Report: success=${rollbackReport.success}, executedReversals=${executedReversals.length}`);
  console.log(`       └─ First executed (LIFO order): ${executedReversals[0]?.inverseActionType} for ${executedReversals[0]?.payload.table || executedReversals[0]?.payload.filePath}`);
  
  if (
    !rollbackReport.success ||
    executedReversals.length !== 2 ||
    executedReversals[0].inverseActionType !== 'DELETE_DATABASE_RECORD' || // LIFO: WRITE_DATABASE reversed first
    executedReversals[1].inverseActionType !== 'DELETE_FILE'
  ) {
    throw new Error('RollbackCoordinator failed to execute safe LIFO reversals sequence!');
  }

  console.log('  ✅ Rollback Coordinator verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 8: Central Execution Coordinator Orchestrator integration
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 8] Testing Central Execution Coordinator Integration...');
  const coordinator = new ExecutionCoordinator({
    maxMemoryMb: 256,
    initialCapabilities: ['fs_write', 'db_write']
  });

  const sandboxResources: SandboxResourceUsage = {
    cpuPercent: 20.0,
    memoryMb: 64,
    maxMemoryLimitMb: 256,
    sysCallsCount: 5
  };

  const sampleContract: ExecutionContract = {
    expectedInputs: ['filePath'],
    expectedOutputs: ['bytesWritten'],
    allowOptional: false
  };

  let executionReversed = false;

  // Case A: Fully successful orchestrated step
  const resultSuccess = await coordinator.executeTaskStep({
    taskId: 'tx-success-01',
    stepIndex: 0,
    actionType: 'CREATE_FILE',
    payload: { filePath: 'test.txt' },
    requiredCapabilities: ['fs_write'],
    contract: sampleContract,
    sandboxResources,
    executedSyscalls: ['read', 'write'],
    stepExecutor: async (step) => ({ bytesWritten: 120 }),
    rollbackExecutor: async (action) => { executionReversed = true; }
  });

  console.log(`     - Successful Orchestrated Step: finalState=${resultSuccess.finalState}, completedSteps=${resultSuccess.completedStepsCount}`);
  if (resultSuccess.finalState !== 'RUNNING' || resultSuccess.completedStepsCount !== 1 || executionReversed) {
    throw new Error('ExecutionCoordinator failed to execute successful step safely!');
  }

  // Case B: Idempotency Key violation
  const resultIdempotency = await coordinator.executeTaskStep({
    taskId: 'tx-success-01',
    stepIndex: 0,
    actionType: 'CREATE_FILE',
    payload: { filePath: 'test.txt' },
    requiredCapabilities: ['fs_write'],
    contract: sampleContract,
    sandboxResources,
    executedSyscalls: ['read', 'write'],
    idempotencyKey: 'idemp-111',
    stepExecutor: async (step) => ({ bytesWritten: 120 }),
    rollbackExecutor: async (action) => {}
  });

  const resultIdempotencyDup = await coordinator.executeTaskStep({
    taskId: 'tx-success-01',
    stepIndex: 0,
    actionType: 'CREATE_FILE',
    payload: { filePath: 'test.txt' },
    requiredCapabilities: ['fs_write'],
    contract: sampleContract,
    sandboxResources,
    executedSyscalls: ['read', 'write'],
    idempotencyKey: 'idemp-111', // Duplicate key!
    stepExecutor: async (step) => ({ bytesWritten: 120 }),
    rollbackExecutor: async (action) => {}
  });
  console.log(`     - Idempotency check: DupError="${resultIdempotencyDup.error}"`);
  if (!resultIdempotencyDup.error?.includes('Idempotency violation')) {
    throw new Error('ExecutionCoordinator failed to enforce idempotency keys checks!');
  }

  // Case C: Sandbox Violation triggers automated safe rollback of completed steps
  let rollbackActionsCount = 0;
  const resultFailure = await coordinator.executeTaskStep({
    taskId: 'tx-success-01',
    stepIndex: 1,
    actionType: 'CREATE_FILE',
    payload: { filePath: 'test.txt' },
    requiredCapabilities: ['fs_write'],
    contract: sampleContract,
    sandboxResources: { ...sandboxResources, memoryMb: 500 }, // Triggers sandbox quota violation!
    executedSyscalls: ['read'],
    stepExecutor: async (step) => ({ bytesWritten: 120 }),
    rollbackExecutor: async (action) => { rollbackActionsCount++; }
  });

  console.log(`     - Failure / Rollback orchestrator: finalState=${resultFailure.finalState}, sandboxViolation=${resultFailure.sandboxViolationDetected}, rollbackExecuted=${resultFailure.rollbackExecuted}, rollbackSuccess=${resultFailure.rollbackSuccess}, rollbackActionsCount=${rollbackActionsCount}`);
  if (
    resultFailure.finalState !== 'ROLLED_BACK' ||
    !resultFailure.sandboxViolationDetected ||
    !resultFailure.rollbackExecuted ||
    !resultFailure.rollbackSuccess ||
    rollbackActionsCount !== 2 // Rolls back BOTH success steps executed so far on task tx-success-01 LIFO!
  ) {
    throw new Error('ExecutionCoordinator failed to orchestrate safe sandbox quarantine exception & LIFO rollbacks!');
  }

  console.log('  ✅ Central Execution Coordinator Integration verified.\n');

  console.log('🎉==============================================================================');
  console.log('🏆  ALL ZTAN PHASE 27 DETERMINISTIC EXECUTION KERNEL DRILLS PASSED SUCCESSFULLY!');
  console.log('==============================================================================🎉');
}

runPhase27Verification().catch((err) => {
  console.error('\n❌ VERIFICATION DRILLS FAILED IN RUNTIME STAGE:');
  console.error(err);
  process.exit(1);
});
