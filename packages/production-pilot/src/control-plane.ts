import * as http from 'node:http';
import * as url from 'node:url';
import * as net from 'node:net';
import type { VectorClock } from './vector-clock.js';
import type { TcpReplicationTransport } from './tcp-transport.js';
import type { DurableSegmentedWal } from './durable-wal.js';
import type { TimelineEvent, TraceComparisonResult } from './replay-diagnostics.js';
import { DeterminismDiffEngine } from './replay-diagnostics.js';

export interface DAGNode {
    id: string;
    label: string;
    type: 'block' | 'step' | 'ingress' | 'side-effect';
    details?: any;
}

export interface DAGEdge {
    from: string;
    to: string;
    type: 'causal' | 'sequence' | 'parent-child';
}

export interface LineageDAG {
    nodes: DAGNode[];
    edges: DAGEdge[];
}

export interface ClusterNodeStatus {
    nodeId: string;
    host: string;
    port: number;
    status: 'ONLINE' | 'OFFLINE';
    activeConnectionsOut: string[];
    incomingConnectionCount: number;
    lastSequence?: number;
}

export class DiagnosticControlPlane {
    private server: http.Server | null = null;
    public static divergenceHotspots: any[] = [];
    
    constructor(
        private readonly nodeId: string,
        private readonly transport?: TcpReplicationTransport,
        private readonly wal?: DurableSegmentedWal,
        private readonly vectorClock?: VectorClock,
        private readonly orchestrator?: any
    ) {}

    public queryVectorClocks(): Record<string, number> {
        if (this.vectorClock) {
            return this.vectorClock.getClock();
        }
        // Fallback for standalone/mock if not initialized
        return { [this.nodeId]: 0 };
    }

    public getLineageDAG(taskId: string): LineageDAG {
        const nodes: DAGNode[] = [];
        const edges: DAGEdge[] = [];

        // Try to read from WAL or event store to reconstruct DAG
        if (this.wal) {
            const blocks = this.wal.recoverLedger();
            // Filter blocks related to this taskId, or build causal graph based on sequence
            for (const block of blocks) {
                const blockId = `block-${block.sequence}`;
                nodes.push({
                    id: blockId,
                    label: `Block ${block.sequence}`,
                    type: 'block',
                    details: {
                        timestamp: block.timestamp,
                        hash: block.hash.substring(0, 8)
                    }
                });

                if (block.sequence > 1) {
                    edges.push({
                        from: `block-${block.sequence - 1}`,
                        to: blockId,
                        type: 'sequence'
                    });
                }

                const payload = block.payload as any;
                if (payload && typeof payload === 'object') {
                    // Extract step information if present
                    const stepId = payload.stepId || payload.name || `step-${block.sequence}`;
                    nodes.push({
                        id: String(stepId),
                        label: payload.name || 'Workflow Step',
                        type: 'step',
                        details: payload
                    });
                    
                    edges.push({
                        from: blockId,
                        to: String(stepId),
                        type: 'parent-child'
                    });

                    // Trace causal logic if vector clocks are present in the block payload
                    if (payload.vectorClock) {
                        nodes.push({
                            id: `clock-${block.sequence}`,
                            label: `Clock: ${JSON.stringify(payload.vectorClock)}`,
                            type: 'side-effect',
                            details: payload.vectorClock
                        });
                        edges.push({
                            from: String(stepId),
                            to: `clock-${block.sequence}`,
                            type: 'causal'
                        });
                    }
                }
            }
        }

        // Standard stub/mock if nodes list is empty
        if (nodes.length === 0) {
            nodes.push(
                { id: 'start', label: 'Workflow Init', type: 'ingress', details: { taskId } },
                { id: 'step-1', label: 'Verify Balance', type: 'step' },
                { id: 'step-2', label: 'Debit Account', type: 'step' },
                { id: 'effect-1', label: 'External Gateway Post', type: 'side-effect' },
                { id: 'end', label: 'Workflow Complete', type: 'step' }
            );
            edges.push(
                { from: 'start', to: 'step-1', type: 'sequence' },
                { from: 'step-1', to: 'step-2', type: 'causal' },
                { from: 'step-2', to: 'effect-1', type: 'parent-child' },
                { from: 'effect-1', to: 'end', type: 'causal' }
            );
        }

        return { nodes, edges };
    }

    public getWorkflowDAG(workflowId: string): any {
        const nodes: DAGNode[] = [];
        const edges: DAGEdge[] = [];
        let stalled = false;
        let stalledReason = '';

        if (this.orchestrator) {
            const instance = this.orchestrator.getWorkflow(workflowId);
            if (instance) {
                // Add start node
                nodes.push({
                    id: 'start',
                    label: `Start: ${instance.name}`,
                    type: 'ingress',
                    details: { input: instance.input, status: instance.status }
                });

                let lastNodeId = 'start';
                
                // Track active timers and pending tasks to check for stalls
                const startedTimers = new Map<string, any>(); // timerId -> event
                const firedTimers = new Set<string>();
                const enqueuedTasks = new Map<string, any>(); // taskId -> event
                const completedTasks = new Set<string>();

                for (const ev of instance.history) {
                    if (ev.type === 'TIMER_STARTED') {
                        startedTimers.set(ev.payload.timerId, ev);
                    } else if (ev.type === 'TIMER_FIRED') {
                        firedTimers.add(ev.payload.timerId);
                    } else if (ev.type === 'TASK_ENQUEUED') {
                        enqueuedTasks.set(ev.payload.taskId, ev);
                    } else if (ev.type === 'TASK_COMPLETED' || ev.type === 'TASK_FAILED') {
                        completedTasks.add(ev.payload.taskId);
                    }
                }

                // Identify if stalled
                if (instance.status === 'RUNNING' || instance.status === 'SUSPENDED') {
                    for (const [tId, ev] of startedTimers.entries()) {
                        if (!firedTimers.has(tId)) {
                            stalled = true;
                            stalledReason = `Active timer without fire log: ${ev.payload.name} (${tId})`;
                            break;
                        }
                    }
                    if (!stalled) {
                        for (const [tId, ev] of enqueuedTasks.entries()) {
                            if (!completedTasks.has(tId)) {
                                stalled = true;
                                stalledReason = `Pending task without completion log: ${ev.payload.name} (${tId})`;
                                break;
                            }
                        }
                    }
                }

                // Construct nodes and edges in sequence
                let lastFailedNodeId: string | null = null;

                for (const ev of instance.history) {
                    if (ev.type === 'STEP_COMPLETED' || ev.type === 'STEP_FAILED') {
                        const stepId = ev.payload.stepId;
                        const label = ev.payload.stepId || 'Step';
                        const isComp = stepId.toLowerCase().includes('compensate') || 
                                       stepId.toLowerCase().includes('rollback') || 
                                       stepId.toLowerCase().includes('refund') || 
                                       stepId.toLowerCase().includes('cancel');

                        nodes.push({
                            id: stepId,
                            label: `${isComp ? 'Compensation: ' : 'Step: '}${label}`,
                            type: 'step',
                            details: {
                                status: ev.type === 'STEP_COMPLETED' ? 'COMPLETED' : 'FAILED',
                                result: ev.payload.result,
                                error: ev.payload.error,
                                isCompensation: isComp
                            }
                        });

                        if (isComp && lastFailedNodeId) {
                            edges.push({
                                from: lastFailedNodeId,
                                to: stepId,
                                type: 'causal'
                            });
                        } else {
                            edges.push({
                                from: lastNodeId,
                                to: stepId,
                                type: 'sequence'
                            });
                        }

                        if (ev.type === 'STEP_FAILED') {
                            lastFailedNodeId = stepId;
                        }
                        lastNodeId = stepId;

                    } else if (ev.type === 'TIMER_STARTED') {
                        const timerId = ev.payload.timerId;
                        const isFired = firedTimers.has(timerId);
                        const isStalled = !isFired && (instance.status === 'RUNNING' || instance.status === 'SUSPENDED');

                        nodes.push({
                            id: timerId,
                            label: `Timer: ${ev.payload.name} (${ev.payload.delayMs}ms)`,
                            type: 'side-effect',
                            details: {
                                status: isFired ? 'FIRED' : 'ACTIVE',
                                delayMs: ev.payload.delayMs,
                                startTime: ev.payload.startTime,
                                stalled: isStalled
                            }
                        });

                        edges.push({
                            from: lastNodeId,
                            to: timerId,
                            type: 'parent-child'
                        });

                        lastNodeId = timerId;

                    } else if (ev.type === 'TASK_ENQUEUED') {
                        const taskId = ev.payload.taskId;
                        const isComp = taskId.toLowerCase().includes('compensate') || 
                                       taskId.toLowerCase().includes('rollback') || 
                                       taskId.toLowerCase().includes('refund') || 
                                       taskId.toLowerCase().includes('cancel');

                        const compEv = instance.history.find((e: any) => (e.type === 'TASK_COMPLETED' || e.type === 'TASK_FAILED') && e.payload.taskId === taskId);
                        const status = compEv ? (compEv.type === 'TASK_COMPLETED' ? 'COMPLETED' : 'FAILED') : 'PENDING';
                        const isStalled = status === 'PENDING' && (instance.status === 'RUNNING' || instance.status === 'SUSPENDED');

                        nodes.push({
                            id: taskId,
                            label: `${isComp ? 'Compensation Task: ' : 'Task: '}${ev.payload.name}`,
                            type: 'side-effect',
                            details: {
                                status,
                                error: compEv?.payload?.error,
                                result: compEv?.payload?.result,
                                stalled: isStalled,
                                isCompensation: isComp
                            }
                        });

                        if (isComp && lastFailedNodeId) {
                            edges.push({
                                from: lastFailedNodeId,
                                to: taskId,
                                type: 'causal'
                            });
                        } else {
                            edges.push({
                                from: lastNodeId,
                                to: taskId,
                                type: 'parent-child'
                            });
                        }

                        if (status === 'FAILED') {
                            lastFailedNodeId = taskId;
                        }
                        lastNodeId = taskId;

                    } else if (ev.type === 'WORKFLOW_COMPLETED') {
                        nodes.push({
                            id: 'completed',
                            label: 'Workflow Completed',
                            type: 'step',
                            details: { result: ev.payload.result }
                        });
                        edges.push({
                            from: lastNodeId,
                            to: 'completed',
                            type: 'sequence'
                        });
                    } else if (ev.type === 'WORKFLOW_FAILED') {
                        nodes.push({
                            id: 'failed',
                            label: `Workflow Failed: ${ev.payload.error}`,
                            type: 'step',
                            details: { error: ev.payload.error }
                        });
                        edges.push({
                            from: lastNodeId,
                            to: 'failed',
                            type: 'sequence'
                        });
                    }
                }
            }
        }

        // Return a mock / default DAG if no nodes are found (fallback)
        if (nodes.length === 0) {
            nodes.push(
                { id: 'start', label: `Start: ${workflowId}`, type: 'ingress' },
                { id: 'step-1', label: 'Step 1', type: 'step' },
                { id: 'step-2', label: 'Step 2', type: 'step' }
            );
            edges.push(
                { from: 'start', to: 'step-1', type: 'sequence' },
                { from: 'step-1', to: 'step-2', type: 'sequence' }
            );
        }

        return { stalled, stalledReason, nodes, edges };
    }

    public diffReplayDivergence(baseline: TimelineEvent[], replay: TimelineEvent[]): TraceComparisonResult {
        const result = DeterminismDiffEngine.compareTraces(baseline, replay);
        if (result.diverged) {
            DiagnosticControlPlane.divergenceHotspots.push({
                timestamp: Date.now(),
                workflowName: 'unknown',
                mismatchType: result.mismatchType || 'unknown',
                details: result.details || ''
            });
        }
        return result;
    }

    public async getClusterHealth(): Promise<ClusterNodeStatus[]> {
        const statuses: ClusterNodeStatus[] = [];
        
        if (this.transport) {
            const transportAny = this.transport as any;
            const peersMap = transportAny.peers as Map<string, any>;
            const activeSockets = transportAny.activeSockets as Map<string, any>;
            const incomingSockets = transportAny.incomingSockets as Set<any>;
            
            statuses.push({
                nodeId: this.nodeId,
                host: '127.0.0.1',
                port: transportAny.port,
                status: 'ONLINE',
                activeConnectionsOut: Array.from(activeSockets.keys()),
                incomingConnectionCount: incomingSockets.size,
                lastSequence: this.wal ? this.wal.recoverLedger().length : 0
            });

            for (const [peerId, peer] of peersMap.entries()) {
                let status: 'ONLINE' | 'OFFLINE' = 'OFFLINE';
                
                try {
                    await new Promise<void>((resolve, reject) => {
                        const socket = new net.Socket();
                        socket.setTimeout(200);
                        socket.connect(peer.port, peer.host, () => {
                            status = 'ONLINE';
                            socket.destroy();
                            resolve();
                        });
                        socket.on('error', () => {
                            reject();
                        });
                        socket.on('timeout', () => {
                            socket.destroy();
                            reject();
                        });
                    });
                } catch {
                    status = 'OFFLINE';
                }

                statuses.push({
                    nodeId: peerId,
                    host: peer.host,
                    port: peer.port,
                    status,
                    activeConnectionsOut: [],
                    incomingConnectionCount: 0
                });
            }
        } else {
            // Standalone mock health for CLI fallback
            statuses.push(
                { nodeId: this.nodeId, host: '127.0.0.1', port: 40001, status: 'ONLINE', activeConnectionsOut: ['node-2'], incomingConnectionCount: 1, lastSequence: 52 },
                { nodeId: 'node-2', host: '127.0.0.1', port: 40002, status: 'ONLINE', activeConnectionsOut: [], incomingConnectionCount: 1, lastSequence: 52 },
                { nodeId: 'node-3', host: '127.0.0.1', port: 40003, status: 'OFFLINE', activeConnectionsOut: [], incomingConnectionCount: 0, lastSequence: 50 }
            );
        }

        return statuses;
    }

    public async startHttpServer(port: number): Promise<http.Server> {
        if (this.server) {
            return this.server;
        }
        
        this.server = http.createServer(async (req, res) => {
            const parsedUrl = url.parse(req.url || '', true);
            const path = parsedUrl.pathname;
            const method = req.method;

            res.setHeader('Content-Type', 'application/json');

            try {
                if (path === '/api/diagnostics/vector-clocks' && method === 'GET') {
                    res.writeHead(200);
                    res.end(JSON.stringify({ clocks: this.queryVectorClocks() }));
                } else if (path === '/api/diagnostics/dag' && method === 'GET') {
                    const workflowId = String(parsedUrl.query.workflowId || 'default');
                    res.writeHead(200);
                    res.end(JSON.stringify(this.getWorkflowDAG(workflowId)));
                } else if ((path === '/api/diagnostics/divergence/hotspots' || path === '/api/diagnostics/divergence-hotspots') && method === 'GET') {
                    res.writeHead(200);
                    res.end(JSON.stringify({ hotspots: DiagnosticControlPlane.divergenceHotspots }));
                } else if ((path === '/api/diagnostics/tenant-usage' || path === '/api/diagnostics/tenant/usage') && method === 'GET') {
                    let usage = {};
                    if (this.orchestrator && this.orchestrator.tenantManager) {
                        usage = this.orchestrator.tenantManager.getTenantUsage();
                    } else {
                        usage = {
                            "default": {
                                "activeCount": 0,
                                "maxConcurrentWorkflows": 100,
                                "rateLimitRequestsPerMin": 1000
                            }
                        };
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify({ tenants: usage }));
                } else if (path === '/api/diagnostics/lineage' && method === 'GET') {
                    const taskId = String(parsedUrl.query.taskId || 'default');
                    res.writeHead(200);
                    res.end(JSON.stringify(this.getLineageDAG(taskId)));
                } else if (path === '/api/diagnostics/diff' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk; });
                    req.on('end', () => {
                        try {
                            const parsed = JSON.parse(body);
                            const diffResult = this.diffReplayDivergence(parsed.baseline, parsed.replay);
                            res.writeHead(200);
                            res.end(JSON.stringify(diffResult));
                        } catch (err: any) {
                            res.writeHead(400);
                            res.end(JSON.stringify({ error: 'Invalid JSON payload: ' + err.message }));
                        }
                    });
                } else if (path === '/api/diagnostics/health' && method === 'GET') {
                    const nodes = await this.getClusterHealth();
                    const onlineCount = nodes.filter(n => n.status === 'ONLINE').length;
                    const totalCount = nodes.length;
                    const quorum = onlineCount >= Math.floor(totalCount / 2) + 1;
                    
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        status: quorum ? 'OPTIMAL' : 'DEGRADED',
                        nodes,
                        quorum
                    }));
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Route not found' }));
                }
            } catch (err: any) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });

        return new Promise((resolve) => {
            this.server!.listen(port, '127.0.0.1', () => {
                console.log(`[Diagnostic API Server ${this.nodeId}] Listening on port ${port}`);
                resolve(this.server!);
            });
        });
    }

    public async stopHttpServer(): Promise<void> {
        if (this.server) {
            return new Promise((resolve) => {
                this.server!.close(() => {
                    this.server = null;
                    resolve();
                });
            });
        }
    }
}
