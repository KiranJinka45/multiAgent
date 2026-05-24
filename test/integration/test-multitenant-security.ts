import * as fs from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import crypto from 'node:crypto';
import {
    DurableSegmentedWal,
    WorkflowOrchestrator,
    DurableWorkflowContext,
    ResourceRegistry,
    TcpReplicationTransport,
    TenantManager,
    ClusterAuthManager,
    SecureWorkflowPackager,
    WasmSandbox,
    DeterministicScheduler,
    SideEffectJournal
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

// Pre-compiled Wasm Bytecode Array for executing side-effects
const runWorkflowStepWasm = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 
    0x01, 0x09, 0x01, 0x60, 0x04, 0x7f, 0x7f, 0x7f, 
    0x7f, 0x01, 0x7f, 0x02, 0x2a, 0x02, 0x03, 0x65, 
    0x6e, 0x76, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 
    0x79, 0x02, 0x01, 0x01, 0x0a, 0x03, 0x65, 0x6e, 
    0x76, 0x13, 0x65, 0x78, 0x65, 0x63, 0x75, 0x74, 
    0x65, 0x5f, 0x73, 0x69, 0x64, 0x65, 0x5f, 0x65, 
    0x66, 0x66, 0x65, 0x63, 0x74, 0x00, 0x00, 0x03, 
    0x02, 0x01, 0x00, 0x07, 0x13, 0x01, 0x0f, 0x72, 
    0x75, 0x6e, 0x57, 0x6f, 0x72, 0x6b, 0x66, 0x6c, 
    0x6f, 0x77, 0x53, 0x74, 0x65, 0x70, 0x00, 0x01, 
    0x0a, 0x0e, 0x01, 0x0c, 0x00, 0x20, 0x00, 0x20, 
    0x01, 0x20, 0x02, 0x20, 0x03, 0x10, 0x00, 0x0b
]);

class MultiTenantSecurityTester {
    private testDir = path.join(process.cwd(), 'scratch', 'test-security-' + Math.random().toString(36).substr(2, 9));
    private resourceRegistry = new ResourceRegistry();

    private cleanTestDir() {
        if (!fs.existsSync(this.testDir)) return;
        for (let i = 0; i < 5; i++) {
            try {
                fs.rmSync(this.testDir, { recursive: true, force: true });
                return;
            } catch (e: any) {
                if (i === 4) {
                    logger.warn(`Failed to clean test directory ${this.testDir}: ${e.message}`);
                } else {
                    const start = Date.now();
                    while (Date.now() - start < 50) {}
                }
            }
        }
    }

    async run() {
        logger.info('🏁 [TEST] Starting Phase U: Multi-Tenant Security & Auth boundaries Tests');
        let passed = 0;
        let total = 0;

        this.cleanTestDir();
        fs.mkdirSync(this.testDir, { recursive: true });

        const wal = new DurableSegmentedWal<any>({ walDir: path.join(this.testDir, 'wal') });
        this.resourceRegistry.registerHook(async () => {
            wal.closeActiveSegment();
        });

        // ─── Scenario 1: Namespace ACL Authorization ───
        total++;
        logger.info('🛡️ [Scenario 1] Verifying Namespace ACL and Access Control boundary...');
        try {
            const tenantManager = new TenantManager();
            tenantManager.registerNamespace({
                namespace: 'tenant-a',
                allowedWorkflows: ['allowed-flow'],
                maxConcurrentWorkflows: 10,
                rateLimitRequestsPerMin: 100
            });

            const orchestrator = new WorkflowOrchestrator(
                'node-1',
                wal,
                1,
                undefined,
                undefined,
                undefined,
                tenantManager
            );

            orchestrator.defineWorkflow('allowed-flow', async (ctx, input) => {
                return 'ok';
            });
            orchestrator.defineWorkflow('forbidden-flow', async (ctx, input) => {
                return 'should-not-run';
            });

            const contextUserA = {
                tenantId: 'user-a',
                roles: ['user'],
                allowedNamespaces: ['tenant-a']
            };

            const contextUserB = {
                tenantId: 'user-b',
                roles: ['user'],
                allowedNamespaces: ['tenant-b']
            };

            // 1. Valid authorization should succeed
            const p1 = await orchestrator.startWorkflow('tenant-a/flow-1', 'allowed-flow', {}, contextUserA);
            const r1 = await p1;
            assert(r1 === 'ok', 'Allowed flow should execute successfully');

            // 2. Access denied to namespace
            let errorB: any = null;
            try {
                await orchestrator.startWorkflow('tenant-a/flow-2', 'allowed-flow', {}, contextUserB);
            } catch (err: any) {
                errorB = err;
            }
            assert(errorB && errorB.message.includes('Access denied to namespace tenant-a'), 'Should throw Access Denied');

            // 3. Workflow forbidden in namespace
            let errorForbidden: any = null;
            try {
                await orchestrator.startWorkflow('tenant-a/flow-3', 'forbidden-flow', {}, contextUserA);
            } catch (err: any) {
                errorForbidden = err;
            }
            assert(errorForbidden && errorForbidden.message.includes('is not allowed in namespace tenant-a'), 'Should throw Forbidden Workflow');

            // 4. Missing security context should throw
            let errorMissingCtx: any = null;
            try {
                await orchestrator.startWorkflow('tenant-a/flow-4', 'allowed-flow', {});
            } catch (err: any) {
                errorMissingCtx = err;
            }
            assert(errorMissingCtx && errorMissingCtx.message.includes('SecurityContext is required'), 'Should throw Ctx Required');

            logger.info('  ✅ PASS: Namespace ACL and workflow whitelist authorization enforced successfully');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 1');
            console.error(e);
        }

        // ─── Scenario 2: Token-Bucket Rate Limiting & Concurrent Quotas ───
        total++;
        logger.info('⏳ [Scenario 2] Verifying rate limiters and concurrent execution quotas...');
        try {
            const tenantManager = new TenantManager();
            tenantManager.registerNamespace({
                namespace: 'tenant-rate',
                allowedWorkflows: ['flow'],
                maxConcurrentWorkflows: 10,
                rateLimitRequestsPerMin: 2 // Allow 2 requests per min max (start with 2 tokens)
            });

            tenantManager.registerNamespace({
                namespace: 'tenant-quota',
                allowedWorkflows: ['slow-flow'],
                maxConcurrentWorkflows: 1, // Only 1 concurrent workflow allowed
                rateLimitRequestsPerMin: 1000
            });

            const orchestrator = new WorkflowOrchestrator(
                'node-1',
                wal,
                1,
                undefined,
                undefined,
                undefined,
                tenantManager
            );

            let flowCounter = 0;
            orchestrator.defineWorkflow('flow', async (ctx, input) => {
                return ++flowCounter;
            });

            const signalResolvers: (() => void)[] = [];
            orchestrator.defineWorkflow('slow-flow', async (ctx, input) => {
                await ctx.step('blocker', async () => {
                    return new Promise<void>((resolve) => {
                        signalResolvers.push(resolve);
                    });
                });
                return 'slow-done';
            });

            const contextRate = {
                tenantId: 'rate-user',
                roles: ['user'],
                allowedNamespaces: ['tenant-rate']
            };

            // Call 1: Success
            const p1 = await orchestrator.startWorkflow('tenant-rate/r1', 'flow', {}, contextRate);
            await p1;
            // Call 2: Success
            const p2 = await orchestrator.startWorkflow('tenant-rate/r2', 'flow', {}, contextRate);
            await p2;

            // Call 3: Rate limit exceeded
            let rateLimitError: any = null;
            try {
                await orchestrator.startWorkflow('tenant-rate/r3', 'flow', {}, contextRate);
            } catch (err: any) {
                rateLimitError = err;
            }
            assert(rateLimitError && rateLimitError.message.includes('Rate limit exceeded for namespace tenant-rate'), 'Should throw Rate Limit Exceeded');

            // Now test concurrent quota limits
            const contextQuota = {
                tenantId: 'quota-user',
                roles: ['user'],
                allowedNamespaces: ['tenant-quota']
            };

            // Start first slow-flow: Success
            orchestrator.startWorkflow('tenant-quota/q1', 'slow-flow', {}, contextQuota);

            // Retrieve running promise from orchestrator without awaiting startWorkflow directly
            const slowPromise = orchestrator.getActivePromise('tenant-quota/q1');
            assert(slowPromise !== undefined, 'Slow workflow promise should be active');

            // Attempt to start second slow-flow while first is running: Failure
            let quotaError: any = null;
            try {
                await orchestrator.startWorkflow('tenant-quota/q2', 'slow-flow', {}, contextQuota);
            } catch (err: any) {
                quotaError = err;
            }
            assert(quotaError && quotaError.message.includes('Concurrent workflow execution quota exceeded'), 'Should throw Quota Exceeded');

            // Complete first flow, allowing namespace count to decrement
            const resolver = signalResolvers.shift();
            if (resolver) resolver();
            await slowPromise;

            // Attempt to start slow-flow again: Success
            orchestrator.startWorkflow('tenant-quota/q3', 'slow-flow', {}, contextQuota);
            const nextQuotaPromise = orchestrator.getActivePromise('tenant-quota/q3');
            assert(nextQuotaPromise !== undefined, 'Next slow workflow promise should be active');

            const resolverNext = signalResolvers.shift();
            if (resolverNext) resolverNext();
            await nextQuotaPromise;

            logger.info('  ✅ PASS: Token-bucket rate limits and concurrent workflow quotas strictly enforced');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 2');
            console.error(e);
        }

        // ─── Scenario 3: WASM Capability Whitelisting ───
        total++;
        logger.info('🔒 [Scenario 3] Verifying WASM sandbox side-effect capability whitelisting...');
        try {
            const sandbox = new WasmSandbox();
            const scheduler = new DeterministicScheduler(false);
            const journal = new SideEffectJournal(10, false);

            sandbox.bindContext({
                scheduler,
                journal
            });

            // Seed side-effect outcome in host journal for 'allowed-effect'
            const expectedRetryId = journal.generateRetryId('allowed-effect');
            (journal as any).callCounts.set('allowed-effect', 0);
            journal.loadLoggedEffects([{
                effectId: expectedRetryId,
                name: 'allowed-effect',
                outcome: 'success',
                result: 'effect-ok'
            }]);

            // Instantiate with whitelist containing only 'allowed-effect'
            const instance = await sandbox.instantiate(runWorkflowStepWasm, {
                allowedSideEffects: ['allowed-effect'],
                memoryLimitPages: 10
            });
            const exports = instance.exports as any;
            const memory = (instance as any).memory as WebAssembly.Memory;

            // Write 'allowed-effect' to WASM memory
            const allowedName = 'allowed-effect';
            const allowedBytes = new TextEncoder().encode(allowedName);
            new Uint8Array(memory.buffer, 100, allowedBytes.length).set(allowedBytes);

            // Execute the allowed side-effect: should pass and write result to memory offset 200
            const allowedLen = exports.runWorkflowStep(100, allowedName.length, 200, 50);
            assert(allowedLen > 0, 'Side effect outcome should be written to memory');
            const allowedResult = new TextDecoder().decode(new Uint8Array(memory.buffer, 200, allowedLen));
            assert(JSON.parse(allowedResult) === 'effect-ok', 'Side effect output should match host value');

            // Write forbidden side effect name to memory offset 100
            const forbiddenName = 'forbidden-effect';
            const forbiddenBytes = new TextEncoder().encode(forbiddenName);
            new Uint8Array(memory.buffer, 100, forbiddenBytes.length).set(forbiddenBytes);

            let wasmError: any = null;
            try {
                // Execute forbidden side effect: should throw Security Error
                exports.runWorkflowStep(100, forbiddenName.length, 200, 50);
            } catch (err: any) {
                wasmError = err;
            }
            assert(wasmError && wasmError.message.includes('Forbidden side-effect execution: forbidden-effect'), 'Should throw Forbidden Side-effect Error');

            sandbox.unbindContext();
            logger.info('  ✅ PASS: WASM sandbox side-effect whitelisting verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 3');
            console.error(e);
        }

        // ─── Scenario 4: Cryptographic Package Signature Verification ───
        total++;
        logger.info('🔑 [Scenario 4] Verifying asymmetric cryptographic package signatures...');
        try {
            const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });

            const wasmBytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
            
            // Sign the package
            const signedPackage = SecureWorkflowPackager.signPackage('secured-flow', wasmBytes, privateKey);

            // Verify using the helper
            const isValid = SecureWorkflowPackager.verifyPackage(signedPackage, wasmBytes, publicKey);
            assert(isValid === true, 'Signature should verify successfully');

            const orchestrator = new WorkflowOrchestrator(
                'node-1',
                wal,
                1
            );
            orchestrator.defineWorkflow('secured-flow', async (ctx, input) => {
                return 'secured-ok';
            });

            // Start workflow with valid signed package
            const promise = await orchestrator.startWorkflow(
                'default/secured',
                'secured-flow',
                { wasmBytes },
                undefined,
                signedPackage,
                publicKey
            );
            const res = await promise;
            assert(res === 'secured-ok', 'Workflow should execute since signature matches');

            // Tamper with the package bytes
            const tamperedBytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x99]);
            let signatureError: any = null;
            try {
                await orchestrator.startWorkflow(
                    'default/tampered',
                    'secured-flow',
                    { wasmBytes: tamperedBytes },
                    undefined,
                    signedPackage,
                    publicKey
                );
            } catch (err: any) {
                signatureError = err;
            }
            assert(signatureError && signatureError.message.includes('verification failed'), 'Should throw verification failure for tampered package');

            logger.info('  ✅ PASS: Asymmetric signing and workflow packaging validation verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 4');
            console.error(e);
        }

        // ─── Scenario 5: Node-to-Node TCP Auth Challenge ───
        total++;
        logger.info('🔌 [Scenario 5] Verifying node-to-node cluster auth and message routing...');
        try {
            const secret = 'cluster-secret-key-challenge-2026';
            const authManager = new ClusterAuthManager(secret);

            const transportA = new TcpReplicationTransport('node-a', 4185);
            const transportB = new TcpReplicationTransport('node-b', 4186);

            transportA.addPeer('node-b', '127.0.0.1', 4186);
            transportB.addPeer('node-a', '127.0.0.1', 4185);

            this.resourceRegistry.registerHook(async () => {
                await transportA.stop();
            });
            this.resourceRegistry.registerHook(async () => {
                await transportB.stop();
            });

            await transportA.start();
            await transportB.start();

            // Set up partition manager to route between node-a and node-b
            const partitionManagerA = {
                isLocal: (id: string) => id.includes('local'),
                getOwner: (id: string) => 'node-b'
            };

            const walA = new DurableSegmentedWal<any>({ walDir: path.join(this.testDir, 'wal-node-a') });
            const walB = new DurableSegmentedWal<any>({ walDir: path.join(this.testDir, 'wal-node-b') });
            this.resourceRegistry.registerHook(async () => {
                walA.closeActiveSegment();
            });
            this.resourceRegistry.registerHook(async () => {
                walB.closeActiveSegment();
            });

            // Set up orchestrators with clusterAuthManager
            const orchestratorA = new WorkflowOrchestrator(
                'node-a',
                walA,
                1,
                partitionManagerA,
                undefined,
                transportA,
                undefined,
                authManager
            );

            const orchestratorB = new WorkflowOrchestrator(
                'node-b',
                walB,
                1,
                undefined,
                undefined,
                transportB,
                undefined,
                authManager
            );

            orchestratorB.defineWorkflow('routed-flow', async (ctx, input) => {
                return 'hello-from-b';
            });

            // Register TCP handlers
            transportA.registerNode('node-a', async (msg) => {
                return orchestratorA.handleRouteWorkflow(msg);
            });

            transportB.registerNode('node-b', async (msg) => {
                return orchestratorB.handleRouteWorkflow(msg);
            });

            // Route start workflow request with correct token: Success
            const promise = await orchestratorA.startWorkflow('remote/flow-1', 'routed-flow', {});
            const res = await promise;
            assert(res === 'hello-from-b', 'Should successfully route and execute on node-b');

            // Send manual ROUTE_WORKFLOW request to node-b with an invalid token
            let peerAuthError: any = null;
            try {
                const response = await transportA.send('node-b', {
                    type: 'ROUTE_WORKFLOW',
                    senderId: 'node-a',
                    epoch: 1,
                    payload: {
                        action: 'start',
                        workflowId: 'remote/flow-2',
                        name: 'routed-flow',
                        input: {},
                        token: 'wrong-token-value'
                    }
                });
                if (response.payload?.error) {
                    throw new Error(response.payload.error);
                }
            } catch (err: any) {
                peerAuthError = err;
            }
            assert(peerAuthError && peerAuthError.message.includes('Peer authentication failed'), 'Should reject call with wrong token');

            logger.info('  ✅ PASS: Cluster TCP node-to-node auth challenge verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 5');
            console.error(e);
        }

        // Final cleanup
        await this.resourceRegistry.teardown();
        this.cleanTestDir();

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Multi-Tenant Security Test Suite Failed: only ${passed}/${total} passed.`);
        }
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED ASSERTION: ${message}`);
        throw new Error(message);
    }
}

const tester = new MultiTenantSecurityTester();
tester.run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal multi-tenant security test failure:', err.message);
        process.exit(1);
    });
