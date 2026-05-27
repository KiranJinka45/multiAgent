import * as fs from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { execSync } from 'node:child_process';
import {
    DurableSegmentedWal,
    WorkflowOrchestrator,
    DurableWorkflowContext,
    ResourceRegistry,
    TcpReplicationTransport,
    VersionedWorkflowRegistry,
    MigrationHookRegistry,
    RollingDeploymentCoordinator,
    DeploymentRegistry,
    BackupCoordinator,
    DisasterRecoveryManager,
    AtomicSnapshotStore
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

function generateCertAndKey(commonName: string, tempDir: string): { cert: string; key: string } {
    const keyFile = path.join(tempDir, `${commonName}.key`);
    const certFile = path.join(tempDir, `${commonName}.crt`);

    const cmd = `"C:\\Program Files\\Git\\usr\\bin\\openssl.exe" req -x509 -newkey rsa:2048 -nodes -keyout "${keyFile}" -out "${certFile}" -days 365 -subj "/CN=${commonName}"`;
    execSync(cmd, { stdio: 'ignore' });

    const key = fs.readFileSync(keyFile, 'utf8');
    const cert = fs.readFileSync(certFile, 'utf8');

    fs.unlinkSync(keyFile);
    fs.unlinkSync(certFile);

    return { cert, key };
}

class OpsUpgradeTester {
    private testDir = path.join(process.cwd(), 'scratch', 'test-ops-' + Math.random().toString(36).substr(2, 9));
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
        logger.info('🏁 [TEST] Starting Phase V: Secure Transport, Deployment Coordination & Upgrade Safety Tests');
        let passed = 0;
        let total = 0;

        this.cleanTestDir();
        fs.mkdirSync(this.testDir, { recursive: true });

        // ─── Scenario 1: TLS/mTLS Encrypted Transport & Dynamic Rotation ───
        total++;
        logger.info('🔒 [Scenario 1] Verifying TLS/mTLS and dynamic cert rotation...');
        try {
            const certDir = path.join(this.testDir, 'certs');
            fs.mkdirSync(certDir, { recursive: true });

            logger.info('  Generating node keys and certificates...');
            const nodeACreds = generateCertAndKey('node-a', certDir);
            const nodeBCreds = generateCertAndKey('node-b', certDir);
            const untrustedCreds = generateCertAndKey('untrusted', certDir);

            // Node A listens on 4285. It trusts Node B's cert.
            const transportA = new TcpReplicationTransport('node-a', 4285, {
                key: nodeACreds.key,
                cert: nodeACreds.cert,
                ca: nodeBCreds.cert,
                requestCert: true,
                rejectUnauthorized: true
            });

            // Node B listens on 4286. It trusts Node A's cert.
            const transportB = new TcpReplicationTransport('node-b', 4286, {
                key: nodeBCreds.key,
                cert: nodeBCreds.cert,
                ca: nodeACreds.cert,
                requestCert: true,
                rejectUnauthorized: true
            });

            transportA.addPeer('node-b', '127.0.0.1', 4286);
            transportB.addPeer('node-a', '127.0.0.1', 4285);

            this.resourceRegistry.registerHook(async () => { await transportA.stop(); });
            this.resourceRegistry.registerHook(async () => { await transportB.stop(); });

            await transportA.start();
            await transportB.start();

            // Set up handlers
            transportA.registerNode('node-a', async (msg) => {
                return { type: 'PONG', senderId: 'node-a', epoch: msg.epoch, payload: { value: 'response-a' } };
            });
            transportB.registerNode('node-b', async (msg) => {
                return { type: 'PONG', senderId: 'node-b', epoch: msg.epoch, payload: { value: 'response-b' } };
            });

            // 1. Verify connection and message delivery over secure channel
            const res1 = await transportA.send('node-b', { type: 'PING', senderId: 'node-a', epoch: 1 });
            assert(res1.type === 'PONG' && res1.payload?.value === 'response-b', 'Should receive pong from node-b over secure TLS');

            // 2. Untrusted peer connection rejection
            const untrustedTransport = new TcpReplicationTransport('untrusted', 4287, {
                key: untrustedCreds.key,
                cert: untrustedCreds.cert,
                ca: nodeACreds.cert,
                requestCert: true,
                rejectUnauthorized: true
            });
            untrustedTransport.addPeer('node-a', '127.0.0.1', 4285);
            await untrustedTransport.start();
            this.resourceRegistry.registerHook(async () => { await untrustedTransport.stop(); });

            let connectionError: any = null;
            try {
                // Should fail because Node A does not trust untrusted cert
                await untrustedTransport.send('node-a', { type: 'PING', senderId: 'untrusted', epoch: 1 });
            } catch (err: any) {
                connectionError = err;
            }
            assert(connectionError !== null, 'Untrusted node connection must be rejected');

            // 3. Dynamic certificate rotation
            logger.info('  Rotating node-a certificates dynamically...');
            const nodeANewCreds = generateCertAndKey('node-a-new', certDir);

            // Inform Node B to trust the new certificate for node-a
            transportB.updateTlsCredentials(nodeBCreds.cert, nodeBCreds.key, nodeANewCreds.cert);
            // Rotate Node A's certificates
            transportA.updateTlsCredentials(nodeANewCreds.cert, nodeANewCreds.key, nodeBCreds.cert);

            // Clear Node A active sockets to trigger new connection with the rotated certs
            const transportAAny = transportA as any;
            for (const socket of transportAAny.activeSockets.values()) {
                socket.destroy();
            }
            transportAAny.activeSockets.clear();

            // Verify communication survives cert rotation
            const resRotated = await transportA.send('node-b', { type: 'PING', senderId: 'node-a', epoch: 2 });
            assert(resRotated.type === 'PONG' && resRotated.payload?.value === 'response-b', 'Should communicate successfully after cert rotation');

            logger.info('  ✅ PASS: TLS/mTLS encryption and dynamic credential rotation verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 1');
            console.error(e);
        }

        // ─── Scenario 2: Workflow Version Migration ───
        total++;
        logger.info('🔄 [Scenario 2] Verifying workflow version migration and state conversion...');
        try {
            const walDir = path.join(this.testDir, 'wal-migration');
            const wal = new DurableSegmentedWal<any>({ walDir });
            this.resourceRegistry.registerHook(async () => { wal.closeActiveSegment(); });

            const versionedRegistry = new VersionedWorkflowRegistry();
            const migrationHookRegistry = new MigrationHookRegistry();

            // Register version 1.0.0
            versionedRegistry.define('payment-flow', '1.0.0', async (ctx: DurableWorkflowContext, input: any) => {
                const res = await ctx.step('charge', async () => {
                    return { amount: input.val, gateway: 'legacy' };
                });
                return res;
            });

            // Register version 2.0.0 (updated step results and processing logic)
            versionedRegistry.define('payment-flow', '2.0.0', async (ctx: DurableWorkflowContext, input: any) => {
                const res = await ctx.step('charge', async () => {
                    // Expects different shape in v2
                    return { chargedAmount: input.chargeVal, provider: 'stripe', status: 'settled' };
                });
                return res;
            });

            // Register migration hook: translates V1 step outputs and inputs to V2 schema
            migrationHookRegistry.registerHook('payment-flow', '1.0.0', '2.0.0', (oldPayload: any) => {
                // If it's the start input
                if (oldPayload.name === 'payment-flow' && oldPayload.input) {
                    return {
                        ...oldPayload,
                        input: { chargeVal: oldPayload.input.val * 100 } // convert to cents
                    };
                }
                // If it's the step completion result
                if (oldPayload.stepId && oldPayload.stepId.startsWith('charge-') && oldPayload.result) {
                    return {
                        ...oldPayload,
                        result: {
                            chargedAmount: oldPayload.result.amount * 100,
                            provider: 'stripe',
                            status: 'settled'
                        }
                    };
                }
                return oldPayload;
            });

            // Spin up orchestrator with V1 registry active
            const orchestratorV1 = new WorkflowOrchestrator(
                'node-1',
                wal,
                1,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                versionedRegistry,
                migrationHookRegistry
            );

            // Execute version 1.0.0
            const p1 = await orchestratorV1.startWorkflow('flow-v1', 'payment-flow', { val: 50 }, undefined, undefined, undefined, '1.0.0');
            const r1 = await p1;
            assert(r1.amount === 50 && r1.gateway === 'legacy', 'V1 execution should return V1 output');

            // Force close log segments
            wal.closeActiveSegment();

            // Boot clean orchestrator V2 (only latest version registry)
            const walV2 = new DurableSegmentedWal<any>({ walDir });
            this.resourceRegistry.registerHook(async () => { walV2.closeActiveSegment(); });

            const orchestratorV2 = new WorkflowOrchestrator(
                'node-1',
                walV2,
                1,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                versionedRegistry,
                migrationHookRegistry
            );

            // Trigger recovery. Replay engine should load V1 WAL, map through migration hooks to V2,
            // and execute V2 payment-flow without throwing any replay divergence errors!
            orchestratorV2.recoverAndResume();

            // Verify recovered instance properties have successfully migrated to 2.0.0
            const recoveredInst = orchestratorV2.getWorkflow('flow-v1');
            assert(recoveredInst !== undefined, 'Recovered workflow should exist');
            assert(recoveredInst?.status === 'COMPLETED', `Should be completed, got ${recoveredInst?.status}`);
            
            // Check that the returned result matches the v2 structure returned by the v2 definition!
            assert(recoveredInst?.result?.chargedAmount === 5000, `Result amount should be migrated, got ${JSON.stringify(recoveredInst?.result)}`);
            assert(recoveredInst?.result?.provider === 'stripe', 'Result provider should match v2 definition');

            logger.info('  ✅ PASS: Version migration and event payload conversion replayed cleanly');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 2');
            console.error(e);
        }

        // ─── Scenario 3: Rolling Deployment Coordination ───
        total++;
        logger.info('🖥️ [Scenario 3] Verifying rolling deployment compatibility and execution routing...');
        try {
            const coordinator = new RollingDeploymentCoordinator();

            // Node A supports version 1.0.0
            coordinator.registerNodeVersion({
                nodeId: 'node-a',
                nodeSoftwareVersion: '1.0.0',
                supportedWorkflows: { 'auth-flow': ['1.0.0'] }
            });

            // Node B supports version 2.0.0
            coordinator.registerNodeVersion({
                nodeId: 'node-b',
                nodeSoftwareVersion: '2.0.0',
                supportedWorkflows: { 'auth-flow': ['2.0.0'] }
            });

            // Assert routing queries
            const targetNodeForV1 = coordinator.getCompatibleNode('auth-flow', '1.0.0');
            assert(targetNodeForV1 === 'node-a', `Should route version 1.0.0 to node-a, got: ${targetNodeForV1}`);

            const targetNodeForV2 = coordinator.getCompatibleNode('auth-flow', '2.0.0');
            assert(targetNodeForV2 === 'node-b', `Should route version 2.0.0 to node-b, got: ${targetNodeForV2}`);

            logger.info('  ✅ PASS: Rolling deployment compatibility mapping and version routing verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 3');
            console.error(e);
        }

        // ─── Scenario 4: Persistent Deployment Registry ───
        total++;
        logger.info('📦 [Scenario 4] Verifying persisted deployment registry and rollback governance...');
        try {
            const registryFile = path.join(this.testDir, 'deployments.json');
            const registry = new DeploymentRegistry(registryFile);

            const record1 = {
                workflowName: 'billing',
                version: '1.0.0',
                codeHash: 'hash1',
                signature: 'sig1',
                author: 'alice',
                timestamp: Date.now() - 5000
            };

            const record2 = {
                workflowName: 'billing',
                version: '2.0.0',
                codeHash: 'hash2',
                signature: 'sig2',
                author: 'bob',
                timestamp: Date.now()
            };

            // Register first deployment
            registry.registerDeployment(record1);
            assert(registry.getActiveDeployment('billing')?.version === '1.0.0', 'Active version should be 1.0.0');

            // Register second deployment (should overwrite active)
            registry.registerDeployment(record2);
            assert(registry.getActiveDeployment('billing')?.version === '2.0.0', 'Active version should be updated to 2.0.0');

            // Trigger Rollback
            const rolledBack = registry.rollback('billing');
            assert(rolledBack?.version === '1.0.0', 'Rollback destination should be 1.0.0');
            assert(registry.getActiveDeployment('billing')?.version === '1.0.0', 'Active version should revert to 1.0.0');

            // Check persistence by reloading registry from disk
            const reloadedRegistry = new DeploymentRegistry(registryFile);
            assert(reloadedRegistry.getActiveDeployment('billing')?.version === '1.0.0', 'Active version should persist as 1.0.0 across reload');

            logger.info('  ✅ PASS: Deployment registry persistent version activations and rollbacks verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 4');
            console.error(e);
        }

        // ─── Scenario 5: Disaster Recovery & Restore ───
        total++;
        logger.info('💾 [Scenario 5] Verifying cold-cluster restore via snapshot + shipped WAL logs...');
        try {
            const sourceWalDir = path.join(this.testDir, 'source-wal');
            const backupDir = path.join(this.testDir, 'backup-destination');
            const restoreWalDir = path.join(this.testDir, 'restore-wal');

            fs.mkdirSync(sourceWalDir, { recursive: true });

            const wal = new DurableSegmentedWal<any>({ walDir: sourceWalDir });
            this.resourceRegistry.registerHook(async () => { wal.closeActiveSegment(); });

            const orchestrator = new WorkflowOrchestrator('node-1', wal, 1);
            orchestrator.defineWorkflow('backup-flow', async (ctx: DurableWorkflowContext) => {
                await ctx.step('step-1', async () => 'data-1');
                await ctx.sleep('delay', 100);
                await ctx.step('step-2', async () => 'data-2');
                return 'done';
            });

            // Start workflow and run step-1
            orchestrator.startWorkflow('flow-backup', 'backup-flow', {});
            const activePromise = orchestrator.getActivePromise('flow-backup');

            // Wait a moment for step-1 to log and active timer to register
            await new Promise(resolve => setTimeout(resolve, 30));

            // Write snapshot atomically
            const snapshotStore = new AtomicSnapshotStore(sourceWalDir);
            snapshotStore.writeSnapshotAtomically({
                sequence: wal.getNextSequence() - 1,
                state: { progress: 'timer-active' }
            });

            // Wait for timer to fire and run step-2
            await activePromise;

            // Trigger full backup: exports snapshot and ships all WAL logs to backupDir
            const backupCoordinator = new BackupCoordinator(sourceWalDir, backupDir);
            backupCoordinator.runFullBackup();

            // Confirm backup files exist
            assert(fs.existsSync(path.join(backupDir, 'snapshot.json')), 'Backup snapshot must exist');
            const shippedLogs = fs.readdirSync(backupDir).filter(f => f.startsWith('segment_') && f.endsWith('.log'));
            assert(shippedLogs.length > 0, 'Backup log segments must exist');

            // Simulate disaster: restore cold cluster from backup into a completely clean directory
            DisasterRecoveryManager.restoreColdCluster(backupDir, restoreWalDir);

            // Re-boot a clean orchestrator from the restored WAL directory
            const restoredWal = new DurableSegmentedWal<any>({ walDir: restoreWalDir });
            this.resourceRegistry.registerHook(async () => { restoredWal.closeActiveSegment(); });

            const restoredOrchestrator = new WorkflowOrchestrator('node-1', restoredWal, 1);
            restoredOrchestrator.defineWorkflow('backup-flow', async (ctx: DurableWorkflowContext) => {
                await ctx.step('step-1', async () => 'data-1');
                await ctx.sleep('delay', 100);
                await ctx.step('step-2', async () => 'data-2');
                return 'done';
            });

            // Trigger state recovery
            restoredOrchestrator.recoverAndResume();

            // Assert restored state is fully complete and correct
            const recoveredInst = restoredOrchestrator.getWorkflow('flow-backup');
            assert(recoveredInst !== undefined, 'Recovered workflow must exist');
            assert(recoveredInst?.status === 'COMPLETED', `Recovered workflow status should be COMPLETED, got: ${recoveredInst?.status}`);
            assert(recoveredInst?.result === 'done', 'Recovered result should match original run output');

            logger.info('  ✅ PASS: Disaster recovery snapshot restoration and shipped log playback verified');
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
            throw new Error(`Ops Upgrade Safety Test Suite Failed: only ${passed}/${total} passed.`);
        }
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED ASSERTION: ${message}`);
        throw new Error(message);
    }
}

const tester = new OpsUpgradeTester();
tester.run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal ops upgrade safety test failure:', err.message);
        process.exit(1);
    });
