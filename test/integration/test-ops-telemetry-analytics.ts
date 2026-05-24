import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { propagation, context, trace } from '@opentelemetry/api';
import {
    DurableSegmentedWal,
    TcpReplicationTransport,
    VectorClock,
    DiagnosticControlPlane,
    ReplicatedWalCoordinator,
    TenantManager,
    WorkflowOrchestrator,
    DurableWorkflowContext,
    SimulatedReplicationTransport,
    PartitionManager
} from '../../packages/production-pilot/src/index.js';
import {
    registry,
    ztanWorkflowDurationSeconds,
    ztanWorkflowReplayDurationSeconds,
    ztanTaskQueueDepth,
    ztanWalThroughputBytes,
    ztanPartitionRingSize,
    ztanQuorumLatencySeconds,
    ztanTenantExecutionsTotal,
    ztanTenantStepExecutionsTotal,
    ztanDivergenceEventsTotal
} from '../../packages/observability/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class CustomPropagator {
    inject(context: any, carrier: any, setter: any) {
        setter.set(carrier, 'traceparent', '00-12345678901234567890123456789012-1234567890123456-01');
    }
    extract(context: any, carrier: any, getter: any) {
        return context;
    }
    fields() {
        return ['traceparent'];
    }
}

class MockSpan {
    private _spanContext = {
        traceId: '12345678901234567890123456789012',
        spanId: '1234567890123456',
        traceFlags: 1
    };
    spanContext() { return this._spanContext; }
    setAttribute() { return this; }
    setAttributes() { return this; }
    addEvent() { return this; }
    setStatus() { return this; }
    updateName() { return this; }
    end() {}
    isRecording() { return true; }
    recordException() {}
}

class MockTracer {
    startSpan() { return new MockSpan(); }
    startActiveSpan(name: string, arg2: any, arg3?: any, arg4?: any) {
        const callback = typeof arg2 === 'function' ? arg2 : arg3;
        const span = new MockSpan();
        const activeCtx = trace.setSpan(context.active(), span as any);
        return context.with(activeCtx, () => callback(span));
    }
}

class MockTracerProvider {
    getTracer() { return new MockTracer(); }
}

class TelemetryAnalyticsTester {
    private testDir = path.join(process.cwd(), 'scratch', 'test-telemetry-' + Math.random().toString(36).substr(2, 9));
    private apiPort = 49000 + Math.floor(Math.random() * 1000);

    private cleanDirectories() {
        if (fs.existsSync(this.testDir)) {
            try {
                fs.rmSync(this.testDir, { recursive: true, force: true });
            } catch (err: any) {
                logger.warn(`Failed to clean test dir ${this.testDir}: ${err.message}`);
            }
        }
    }

    async run() {
        logger.info('🏁 [TEST] Starting Phase W: Operational Telemetry, Tracing & Analytics Tests');
        let passed = 0;
        let total = 0;

        this.cleanDirectories();
        fs.mkdirSync(this.testDir, { recursive: true });

        // Set up global tracer provider and tracecontext propagator
        trace.setGlobalTracerProvider(new MockTracerProvider() as any);
        propagation.setGlobalPropagator(new CustomPropagator() as any);

        // Initialize WAL & Orchestrator
        const wal = new DurableSegmentedWal<any>({ walDir: path.join(this.testDir, 'wal') });
        const tenantManager = new TenantManager();
        tenantManager.registerNamespace({
            namespace: 'tenant-a',
            allowedWorkflows: ['test-flow'],
            maxConcurrentWorkflows: 5,
            rateLimitRequestsPerMin: 60
        });

        const partitionManager = new PartitionManager('node-1');
        const transport = new TcpReplicationTransport('node-1', this.apiPort - 1);
        const orchestrator = new WorkflowOrchestrator(
            'node-1',
            wal,
            1,
            partitionManager,
            undefined,
            transport,
            tenantManager
        );

        // Control Plane
        const controlPlane = new DiagnosticControlPlane('node-1', transport, wal, undefined, orchestrator);
        await controlPlane.startHttpServer(this.apiPort);

        // ─── Scenario 1: OpenTelemetry Trace Context Propagation over TCP ───
        total++;
        logger.info('🛰️ [Scenario 1] Verifying OpenTelemetry trace context propagation carrier serialization...');
        try {
            const mockTransport = new SimulatedReplicationTransport();
            const coordinator = new ReplicatedWalCoordinator('node-1', wal, mockTransport);
            coordinator.registerFollowers(['node-2']);

            let capturedMessage: any = null;
            mockTransport.registerNode('node-2', async (msg) => {
                capturedMessage = msg;
                return { type: 'APPEND_ENTRIES', senderId: 'node-2', epoch: 1, payload: { success: true } };
            });

            // Start an active trace span and append entries
            const testTracer = trace.getTracer('test-tracer');
            await testTracer.startActiveSpan('parent-span', async (span) => {
                await coordinator.appendReplicated({ data: 'telemetry-payload' });
                span.end();
            });

            assert(capturedMessage !== null, 'Message should have been replicated to node-2');
            assert(capturedMessage.traceContext !== undefined, 'traceContext should be defined on ReplicationMessage');
            assert(capturedMessage.traceContext.traceparent !== undefined, 'traceparent should be serialized in traceContext');
            logger.info('  ✅ PASS: OpenTelemetry context injected and propagated over TCP payload carrier');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 1');
            console.error(e);
        }

        // ─── Scenario 2: Real-time Prometheus Metrics Pipeline ───
        total++;
        logger.info('📊 [Scenario 2] Verifying Prometheus metrics logging...');
        try {
            // Update metrics manually/via execution triggers
            ztanWalThroughputBytes.inc(1024);
            ztanPartitionRingSize.set(3);
            ztanTenantExecutionsTotal.inc({ tenant_id: 'tenant-a', workflow_name: 'test-flow' });

            const metricsText = await registry.metrics();
            assert(metricsText.includes('ztan_wal_throughput_bytes_total'), 'Metrics should include WAL throughput');
            assert(metricsText.includes('ztan_partition_ring_size'), 'Metrics should include partition ring size');
            assert(metricsText.includes('ztan_tenant_executions_total'), 'Metrics should include tenant executions');
            assert(metricsText.includes('ztan_workflow_duration_seconds'), 'Metrics should include workflow duration histogram');
            
            logger.info('  ✅ PASS: Real-time metrics pipeline successfully updated in registry');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 2');
        }

        // ─── Scenario 3: visual DAG generation & stalled timer detection ───
        total++;
        logger.info('🌿 [Scenario 3] Fetching Visual Workflow Execution DAG via control plane...');
        try {
            // Register a mock running workflow instance with failed/compensation/stalled history
            const mockInstance = {
                workflowId: 'test-wf-123',
                name: 'order-saga',
                status: 'RUNNING' as const,
                input: { orderId: 'O-100' },
                activeEpoch: 1,
                ownerNodeId: 'node-1',
                history: [
                    {
                        type: 'WORKFLOW_STARTED' as const,
                        workflowId: 'test-wf-123',
                        timestamp: Date.now() - 5000,
                        payload: { name: 'order-saga', input: { orderId: 'O-100' } }
                    },
                    {
                        type: 'STEP_COMPLETED' as const,
                        workflowId: 'test-wf-123',
                        timestamp: Date.now() - 4000,
                        payload: { stepId: 'validate-0', result: { valid: true } }
                    },
                    {
                        type: 'STEP_FAILED' as const,
                        workflowId: 'test-wf-123',
                        timestamp: Date.now() - 3000,
                        payload: { stepId: 'charge-card-1', error: 'Insufficient funds' }
                    },
                    {
                        type: 'STEP_COMPLETED' as const,
                        workflowId: 'test-wf-123',
                        timestamp: Date.now() - 2500,
                        payload: { stepId: 'compensate-validate-2', result: { rolledBack: true } }
                    },
                    {
                        type: 'TIMER_STARTED' as const,
                        workflowId: 'test-wf-123',
                        timestamp: Date.now() - 2000,
                        payload: { timerId: 'timer-retry-3', name: 'retry-delay', delayMs: 60000, startTime: Date.now() - 2000 }
                    }
                ]
            };
            orchestrator['workflows'].set('test-wf-123', mockInstance);

            const res = await fetch(`http://127.0.0.1:${this.apiPort}/api/diagnostics/dag?workflowId=test-wf-123`);
            assert(res.ok, 'HTTP request should succeed');
            const data = await res.json() as any;

            assert(data.stalled === true, 'Workflow should be identified as stalled');
            assert(data.stalledReason.includes('Active timer'), 'Stalled reason should specify active timer');
            assert(Array.isArray(data.nodes), 'Response should contain nodes');
            assert(Array.isArray(data.edges), 'Response should contain edges');

            const startNode = data.nodes.find((n: any) => n.id === 'start');
            const stepNode = data.nodes.find((n: any) => n.id === 'validate-0');
            const failNode = data.nodes.find((n: any) => n.id === 'charge-card-1');
            const compNode = data.nodes.find((n: any) => n.id === 'compensate-validate-2');
            const timerNode = data.nodes.find((n: any) => n.id === 'timer-retry-3');

            assert(startNode && startNode.type === 'ingress', 'Start node type ingress');
            assert(stepNode && stepNode.details.status === 'COMPLETED', 'Validate step should be completed');
            assert(failNode && failNode.details.status === 'FAILED', 'Charge step should be failed');
            assert(compNode && compNode.details.isCompensation === true, 'Compensation node should be marked');
            assert(timerNode && timerNode.details.stalled === true, 'Timer node should be marked stalled');

            // Verify edges
            const causalEdge = data.edges.find((e: any) => e.from === 'charge-card-1' && e.to === 'compensate-validate-2');
            assert(causalEdge && causalEdge.type === 'causal', 'Causal edge should link failed step to compensation step');

            logger.info('  ✅ PASS: Workflow Execution DAG visual metrics, compensations, and stalled nodes verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 3');
            console.error(e);
        }

        // ─── Scenario 4: Divergence Hotspots Recording ───
        total++;
        logger.info('🔍 [Scenario 4] Verifying Replay Divergence Hotspots collection...');
        try {
            const baseline = [
                { type: 'side-effect' as const, id: 'eff-1', name: 'payment', details: { success: true }, order: 0 }
            ];
            const replay = [
                { type: 'side-effect' as const, id: 'eff-1', name: 'payment', details: { success: false }, order: 0 }
            ];

            const diffRes = await fetch(`http://127.0.0.1:${this.apiPort}/api/diagnostics/diff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseline, replay })
            });
            assert(diffRes.ok, 'POST diff endpoint should succeed');
            const diffData = await diffRes.json() as any;
            assert(diffData.diverged === true, 'timelines should diverge');

            // Query hotspots
            const hotspotsRes = await fetch(`http://127.0.0.1:${this.apiPort}/api/diagnostics/divergence/hotspots`);
            assert(hotspotsRes.ok, 'hotspots endpoint should succeed');
            const hotspotsData = await hotspotsRes.json() as any;
            assert(Array.isArray(hotspotsData.hotspots), 'Hotspots should be an array');
            assert(hotspotsData.hotspots.length > 0, 'Hotspots should have at least 1 item');
            assert(hotspotsData.hotspots[0].mismatchType === 'payload-mismatch', 'Recorded mismatch type matches');

            logger.info('  ✅ PASS: Divergence hotspots analytics recorded and queried successfully');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 4');
            console.error(e);
        }

        // ─── Scenario 5: Tenant Billing and Namespace Usage Limits ───
        total++;
        logger.info('💰 [Scenario 5] Verifying tenant usage metrics accounting endpoint...');
        try {
            // Set some active executions manually
            tenantManager.incrementActive('tenant-a');
            
            const usageRes = await fetch(`http://127.0.0.1:${this.apiPort}/api/diagnostics/tenant-usage`);
            assert(usageRes.ok, 'Tenant usage endpoint should succeed');
            const usageData = await usageRes.json() as any;

            assert(usageData.tenants !== undefined, 'Tenants key should exist');
            const tenantA = usageData.tenants['tenant-a'];
            assert(tenantA !== undefined, 'tenant-a should exist in results');
            assert(tenantA.activeCount === 1, 'activeCount should be 1');
            assert(tenantA.maxConcurrentWorkflows === 5, 'maxConcurrentWorkflows matches');
            assert(tenantA.rateLimitRequestsPerMin === 60, 'rateLimitRequestsPerMin matches');

            logger.info('  ✅ PASS: Tenant resource accounting metrics returned correctly');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 5');
            console.error(e);
        }

        // Cleanup
        await controlPlane.stopHttpServer();
        await transport.stop();
        wal.closeActiveSegment();
        this.cleanDirectories();

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Telemetry/Analytics Test Failed: only ${passed}/${total} passed.`);
        }
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(message);
    } else {
        console.log(`  PASSED: ${message}`);
    }
}

const tester = new TelemetryAnalyticsTester();
tester.run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal telemetry/analytics test failure:', err.message);
        process.exit(1);
    });
