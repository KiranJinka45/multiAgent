import { 
    RuntimeLifecycleManager, 
    LifecycleState 
} from '../../packages/production-pilot/src/index.js';
import etcdPkg from 'etcd3';
import grpc from '@grpc/grpc-js';

class PackagingLifecycleTester {
    async run() {
        console.log('🏁 [TEST] Starting Phase X: Packaging and Module Boundaries / Lifecycle Tests');
        let passed = 0;
        let total = 0;

        // ─── Scenario 1: Load packages without ESM/CJS packaging errors ───
        total++;
        console.log('🛰️ [Scenario 1] Checking package boundary loading stability...');
        try {
            assert(RuntimeLifecycleManager !== undefined, 'RuntimeLifecycleManager should be exported');
            assert(LifecycleState !== undefined, 'LifecycleState should be exported');
            console.log('  ✅ PASS: Classes resolved cleanly without require/import errors.');
            passed++;
        } catch (err: any) {
            console.error('  ❌ FAIL: Scenario 1:', err.message);
        }

        // ─── Scenario 2: Validate external dependencies resolve correctly ───
        total++;
        console.log('📦 [Scenario 2] Verifying etcd3 and @grpc/grpc-js load correctly...');
        try {
            assert(etcdPkg !== undefined, 'etcd3 must be importable');
            assert(grpc !== undefined, '@grpc/grpc-js must be importable');
            assert(typeof grpc.credentials.createInsecure === 'function', '@grpc/grpc-js exports must be fully accessible');
            console.log('  ✅ PASS: Dynamic dependency boundaries verify correctly.');
            passed++;
        } catch (err: any) {
            console.error('  ❌ FAIL: Scenario 2:', err.message);
        }

        // ─── Scenario 3: Test RuntimeLifecycleManager Transition Restrictions ───
        total++;
        console.log('🌿 [Scenario 3] Testing lifecycle transition restriction rules...');
        try {
            const manager = new RuntimeLifecycleManager();
            assert(manager.getState() === LifecycleState.PREINIT, 'Initial state should be PREINIT');

            // Preinit to configured
            await manager.transitionTo(LifecycleState.CONFIGURED);
            assert(manager.getState() === LifecycleState.CONFIGURED, 'State should be CONFIGURED');

            // Try invalid state transition: Configured to Active (should throw)
            let threw = false;
            try {
                await manager.transitionTo(LifecycleState.ACTIVE);
            } catch (e) {
                threw = true;
            }
            assert(threw, 'Invalid transition should throw exception');
            assert(manager.getState() === LifecycleState.CONFIGURED, 'State remains unchanged after invalid transition');

            // Shutdown should always be permitted as an escape hatch
            await manager.transitionTo(LifecycleState.SHUTDOWN);
            assert(manager.getState() === LifecycleState.SHUTDOWN, 'Escape hatch transition to SHUTDOWN allowed');

            console.log('  ✅ PASS: Transition restrictions correctly fence service lifecycle states.');
            passed++;
        } catch (err: any) {
            console.error('  ❌ FAIL: Scenario 3:', err.message);
        }

        // ─── Scenario 4: Test Transition Hook Execution ordering ───
        total++;
        console.log('🔗 [Scenario 4] Testing transition hooks firing and sequence timing...');
        try {
            const manager = new RuntimeLifecycleManager();
            const sequence: string[] = [];

            manager.onTransition(LifecycleState.CONFIGURED, async () => {
                sequence.push('configured-hook-1');
            });
            manager.onTransition(LifecycleState.CONFIGURED, async () => {
                sequence.push('configured-hook-2');
            });
            manager.onTransition(LifecycleState.STORAGE_READY, async () => {
                sequence.push('storage-ready-hook');
            });

            await manager.transitionTo(LifecycleState.CONFIGURED);
            await manager.transitionTo(LifecycleState.STORAGE_READY);

            assert(sequence.length === 3, 'All 3 hooks must fire');
            assert(sequence[0] === 'configured-hook-1', 'First configured hook runs first');
            assert(sequence[1] === 'configured-hook-2', 'Second configured hook runs second');
            assert(sequence[2] === 'storage-ready-hook', 'Storage hook runs last in sequence');

            console.log('  ✅ PASS: Transition hooks fire deterministically in the correct sequence.');
            passed++;
        } catch (err: any) {
            console.error('  ❌ FAIL: Scenario 4:', err.message);
        }

        // ─── Scenario 5: Full Mock Boot Sequence Demonstration ───
        total++;
        console.log('⚡ [Scenario 5] Executing full ordered boot sequence mock...');
        try {
            const manager = new RuntimeLifecycleManager();
            const bootLog: string[] = [];

            manager.onTransition(LifecycleState.CONFIGURED, async () => {
                bootLog.push('1. Parameters loaded');
            });
            manager.onTransition(LifecycleState.STORAGE_READY, async () => {
                bootLog.push('2. Segmented WAL directories opened');
            });
            manager.onTransition(LifecycleState.CONSENSUS_READY, async () => {
                bootLog.push('3. etcd cluster lease acquired');
            });
            manager.onTransition(LifecycleState.TRANSPORT_READY, async () => {
                bootLog.push('4. TCP servers bound and listening');
            });
            manager.onTransition(LifecycleState.OBSERVABILITY_READY, async () => {
                bootLog.push('5. Observability trace context propagators initialized');
            });
            manager.onTransition(LifecycleState.ACTIVE, async () => {
                bootLog.push('6. WorkflowOrchestrator ready to route tasks');
            });

            await manager.transitionTo(LifecycleState.CONFIGURED);
            await manager.transitionTo(LifecycleState.STORAGE_READY);
            await manager.transitionTo(LifecycleState.CONSENSUS_READY);
            await manager.transitionTo(LifecycleState.TRANSPORT_READY);
            await manager.transitionTo(LifecycleState.OBSERVABILITY_READY);
            await manager.transitionTo(LifecycleState.ACTIVE);

            assert(bootLog.length === 6, 'All boot steps executed');
            assert(bootLog[5].startsWith('6. WorkflowOrchestrator'), 'Active state completes sequence');

            console.log('  ✅ PASS: Boot sequence coordinates perfectly.');
            passed++;
        } catch (err: any) {
            console.error('  ❌ FAIL: Scenario 5:', err.message);
        }

        console.log(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Packaging/Lifecycle Test Failed: only ${passed}/${total} passed.`);
        }
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

const tester = new PackagingLifecycleTester();
tester.run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal packaging/lifecycle test failure:', err.message);
        process.exit(1);
    });
