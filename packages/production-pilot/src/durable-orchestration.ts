import { 
    logger,
    tracer, 
    ztanWorkflowDurationSeconds, 
    ztanWorkflowReplayDurationSeconds, 
    ztanTaskQueueDepth, 
    ztanTenantExecutionsTotal, 
    ztanTenantStepExecutionsTotal 
} from '@packages/observability';
import { context, trace, propagation } from '@opentelemetry/api';
import crypto from 'node:crypto';
import type { DurableSegmentedWal } from './durable-wal.js';
import type { EventBlock } from './event-store.js';
import { TenantManager, ClusterAuthManager, SecureWorkflowPackager } from './multi-tenant-security.js';
import type { SecurityContext, SignedWorkflowPackage } from './multi-tenant-security.js';
import { VersionedWorkflowRegistry, MigrationHookRegistry } from './version-migration.js';

export interface WorkflowEvent {
    type: 'WORKFLOW_STARTED' | 'STEP_COMPLETED' | 'STEP_FAILED' | 'TIMER_STARTED' | 'TIMER_FIRED' | 'TASK_ENQUEUED' | 'TASK_COMPLETED' | 'TASK_FAILED' | 'LEASE_ACQUIRED' | 'WORKFLOW_COMPLETED' | 'WORKFLOW_FAILED';
    workflowId: string;
    timestamp: number;
    payload: any;
}

export interface WorkflowInstance {
    workflowId: string;
    name: string;
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SUSPENDED';
    input: any;
    result?: any;
    error?: string;
    activeEpoch: number;
    ownerNodeId: string;
    history: WorkflowEvent[];
}

export class DurableWorkflowContext {
    private stepIndex = 0;
    private historyMap = new Map<string, { status: 'completed' | 'failed'; data: any }>();

    constructor(
        public readonly workflowId: string,
        public readonly orchestrator: WorkflowOrchestrator,
        public readonly epoch: number,
        history: WorkflowEvent[]
    ) {
        // Pre-populate history map for fast replay lookups
        for (const ev of history) {
            if (ev.type === 'STEP_COMPLETED') {
                this.historyMap.set(ev.payload.stepId, { status: 'completed', data: ev.payload.result });
            } else if (ev.type === 'STEP_FAILED') {
                this.historyMap.set(ev.payload.stepId, { status: 'failed', data: new Error(ev.payload.error) });
            } else if (ev.type === 'TIMER_FIRED') {
                this.historyMap.set(ev.payload.timerId, { status: 'completed', data: null });
            } else if (ev.type === 'TASK_COMPLETED') {
                this.historyMap.set(ev.payload.taskId, { status: 'completed', data: ev.payload.result });
            } else if (ev.type === 'TASK_FAILED') {
                this.historyMap.set(ev.payload.taskId, { status: 'failed', data: new Error(ev.payload.error) });
            }
        }
    }

    public async step<T>(name: string, stepFn: () => Promise<T>): Promise<T> {
        const stepId = `${name}-${this.stepIndex++}`;
        const historical = this.historyMap.get(stepId);

        if (historical) {
            if (historical.status === 'completed') {
                return historical.data;
            } else {
                throw historical.data;
            }
        }

        const parts = this.workflowId.split('/');
        const tenantId = parts.length > 1 ? parts[0] : 'default';
        const wf = this.orchestrator.getWorkflow(this.workflowId);
        const workflowName = wf ? wf.name : 'unknown';
        ztanTenantStepExecutionsTotal.inc({ tenant_id: tenantId, workflow_name: workflowName, step_name: name });

        const span = tracer.startSpan(`step:${name}`, {
            attributes: {
                'ztan.step_id': stepId,
                'ztan.workflow_id': this.workflowId,
                'ztan.tenant_id': tenantId,
                'ztan.step_name': name
            }
        });

        try {
            const result = await context.with(trace.setSpan(context.active(), span), () => stepFn());
            this.orchestrator.logEvent({
                type: 'STEP_COMPLETED',
                workflowId: this.workflowId,
                timestamp: Date.now(),
                payload: { stepId, result }
            });
            span.setStatus({ code: 1 });
            span.end();
            return result;
        } catch (err: any) {
            this.orchestrator.logEvent({
                type: 'STEP_FAILED',
                workflowId: this.workflowId,
                timestamp: Date.now(),
                payload: { stepId, error: err.message }
            });
            span.setStatus({ code: 2, message: err.message });
            span.recordException(err);
            span.end();
            throw err;
        }
    }

    public async sleep(name: string, delayMs: number): Promise<void> {
        const timerId = `timer-${name}-${this.stepIndex++}`;
        const historical = this.historyMap.get(timerId);

        if (historical) {
            return;
        }

        if (this.orchestrator.scheduler.hasFired(this.workflowId, timerId)) {
            this.orchestrator.scheduler.clearFired(this.workflowId, timerId);
            return;
        }

        const span = tracer.startSpan(`sleep:${name}`, {
            attributes: {
                'ztan.timer_id': timerId,
                'ztan.workflow_id': this.workflowId,
                'ztan.delay_ms': delayMs
            }
        });

        const recoveredTimer = this.orchestrator.scheduler.getTimer(this.workflowId, timerId);
        if (recoveredTimer) {
            return new Promise<void>((resolve) => {
                recoveredTimer.callback = async () => {
                    span.end();
                    resolve();
                };
            });
        }

        this.orchestrator.logEvent({
            type: 'TIMER_STARTED',
            workflowId: this.workflowId,
            timestamp: Date.now(),
            payload: { timerId, name, delayMs, startTime: Date.now() }
        });

        return new Promise<void>((resolve) => {
            this.orchestrator.scheduler.registerTimer(this.workflowId, timerId, delayMs, async () => {
                span.end();
                resolve();
            });
        });
    }

    public async executeTask<T>(name: string, taskFn: () => Promise<T>): Promise<T> {
        const taskId = `task-${name}-${this.stepIndex++}`;
        const historical = this.historyMap.get(taskId);

        if (historical) {
            if (historical.status === 'completed') {
                return historical.data;
            } else {
                throw historical.data;
            }
        }

        const span = tracer.startSpan(`task:${name}`, {
            attributes: {
                'ztan.task_id': taskId,
                'ztan.workflow_id': this.workflowId
            }
        });

        this.orchestrator.logEvent({
            type: 'TASK_ENQUEUED',
            workflowId: this.workflowId,
            timestamp: Date.now(),
            payload: { taskId, name }
        });

        ztanTaskQueueDepth.inc({ workflow_id: this.workflowId });

        return new Promise<T>((resolve, reject) => {
            this.orchestrator.taskQueue.enqueue(this.workflowId, taskId, async () => {
                try {
                    const res = await context.with(trace.setSpan(context.active(), span), () => taskFn());
                    this.orchestrator.logEvent({
                        type: 'TASK_COMPLETED',
                        workflowId: this.workflowId,
                        timestamp: Date.now(),
                        payload: { taskId, result: res }
                    });
                    ztanTaskQueueDepth.dec({ workflow_id: this.workflowId });
                    span.setStatus({ code: 1 });
                    span.end();
                    resolve(res);
                } catch (err: any) {
                    this.orchestrator.logEvent({
                        type: 'TASK_FAILED',
                        workflowId: this.workflowId,
                        timestamp: Date.now(),
                        payload: { taskId, error: err.message }
                    });
                    ztanTaskQueueDepth.dec({ workflow_id: this.workflowId });
                    span.setStatus({ code: 2, message: err.message });
                    span.recordException(err);
                    span.end();
                    reject(err);
                }
            });
        });
    }
}

export class DurableWorkflowScheduler {
    private activeTimers = new Map<string, {
        timerId: string;
        workflowId: string;
        delayMs: number;
        startTime: number;
        callback?: () => Promise<void>;
        timeoutId?: NodeJS.Timeout;
    }>();
    private firedTimers = new Set<string>();

    constructor(private readonly orchestrator: WorkflowOrchestrator) {}

    public registerTimer(workflowId: string, timerId: string, delayMs: number, callback: () => Promise<void>): void {
        const record = {
            timerId,
            workflowId,
            delayMs,
            startTime: Date.now(),
            callback
        };
        const key = `${workflowId}:${timerId}`;
        this.activeTimers.set(key, record);
        this.scheduleTimeout(key, delayMs);
    }

    public recoverTimer(workflowId: string, timerId: string, delayMs: number, startTime: number, callback?: () => Promise<void>): void {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, delayMs - elapsed);
        
        const record = {
            timerId,
            workflowId,
            delayMs,
            startTime,
            callback
        };
        const key = `${workflowId}:${timerId}`;
        this.activeTimers.set(key, record);
        this.scheduleTimeout(key, remaining);
    }

    private scheduleTimeout(key: string, delayMs: number): void {
        const record = this.activeTimers.get(key);
        if (!record) return;

        const timeoutId = setTimeout(async () => {
            this.activeTimers.delete(key);
            this.orchestrator.logEvent({
                type: 'TIMER_FIRED',
                workflowId: record.workflowId,
                timestamp: Date.now(),
                payload: { timerId: record.timerId }
            });
            if (record.callback) {
                await record.callback();
            } else {
                this.firedTimers.add(key);
            }
        }, delayMs);

        record.timeoutId = timeoutId;
    }

    public cancelTimer(workflowIdOrTimerId: string, timerId?: string): void {
        let keyToCancel: string | undefined;
        if (timerId) {
            keyToCancel = `${workflowIdOrTimerId}:${timerId}`;
        } else {
            for (const [k, record] of this.activeTimers.entries()) {
                if (record.timerId === workflowIdOrTimerId) {
                    keyToCancel = k;
                    break;
                }
            }
        }
        if (keyToCancel) {
            const record = this.activeTimers.get(keyToCancel);
            if (record) {
                if (record.timeoutId) {
                    clearTimeout(record.timeoutId);
                }
                this.activeTimers.delete(keyToCancel);
            }
        }
    }

    public getTimer(workflowIdOrTimerId: string, timerId?: string) {
        if (timerId) {
            return this.activeTimers.get(`${workflowIdOrTimerId}:${timerId}`);
        }
        for (const record of this.activeTimers.values()) {
            if (record.timerId === workflowIdOrTimerId) {
                return record;
            }
        }
        return undefined;
    }

    public hasFired(workflowIdOrTimerId: string, timerId?: string): boolean {
        if (timerId) {
            return this.firedTimers.has(`${workflowIdOrTimerId}:${timerId}`);
        }
        for (const key of this.firedTimers) {
            if (key === workflowIdOrTimerId || key.endsWith(`:${workflowIdOrTimerId}`)) {
                return true;
            }
        }
        return false;
    }

    public clearFired(workflowIdOrTimerId: string, timerId?: string): void {
        if (timerId) {
            this.firedTimers.delete(`${workflowIdOrTimerId}:${timerId}`);
        } else {
            const toDelete: string[] = [];
            for (const key of this.firedTimers) {
                if (key === workflowIdOrTimerId || key.endsWith(`:${workflowIdOrTimerId}`)) {
                    toDelete.push(key);
                }
            }
            for (const key of toDelete) {
                this.firedTimers.delete(key);
            }
        }
    }

    public getActiveTimers() {
        return Array.from(this.activeTimers.values());
    }
}

export class DurableTaskQueue {
    private queue: Array<{
        workflowId: string;
        taskId: string;
        execute: () => Promise<void>;
    }> = [];
    private running = false;

    constructor() {}

    public enqueue(workflowId: string, taskId: string, execute: () => Promise<void>): void {
        this.queue.push({ workflowId, taskId, execute });
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.running || this.queue.length === 0) return;
        this.running = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift()!;
            try {
                await task.execute();
            } catch (err: any) {
                logger.error(`[TASK_QUEUE] Task ${task.taskId} failed: ${err.message}`);
            }
        }

        this.running = false;
    }

    public getPendingTasksCount(): number {
        return this.queue.length;
    }
}

export class WorkflowRecoveryEngine {
    constructor(private readonly orchestrator: WorkflowOrchestrator) {}

    public recoverFromWal(wal: DurableSegmentedWal): Map<string, WorkflowInstance> {
        const recovered = new Map<string, WorkflowInstance>();
        let blocks: EventBlock<any>[];

        try {
            blocks = wal.recoverLedger();
        } catch (err: any) {
            console.error('[RECOVERY_ENGINE] Failed to recover ledger:', err);
            blocks = [];
        }

        for (const block of blocks) {
            const payload = block.payload;
            if (payload && typeof payload.workflowId === 'string' && typeof payload.type === 'string') {
                const event = payload as WorkflowEvent;
                const wId = event.workflowId;

                let instance = recovered.get(wId);

                if (event.type === 'WORKFLOW_STARTED') {
                    instance = {
                        workflowId: wId,
                        name: event.payload.name,
                        status: 'RUNNING',
                        input: event.payload.input,
                        activeEpoch: 0,
                        ownerNodeId: '',
                        history: []
                    };
                    recovered.set(wId, instance);
                }

                if (instance) {
                    instance.history.push(event);

                    if (event.type === 'LEASE_ACQUIRED') {
                        instance.activeEpoch = event.payload.epoch;
                        instance.ownerNodeId = event.payload.ownerNodeId;
                    } else if (event.type === 'WORKFLOW_COMPLETED') {
                        instance.status = 'COMPLETED';
                        instance.result = event.payload.result;
                    } else if (event.type === 'WORKFLOW_FAILED') {
                        instance.status = 'FAILED';
                        instance.error = event.payload.error;
                    }
                }
            }
        }

        return recovered;
    }
}

export class WorkflowOrchestrator {
    public scheduler: DurableWorkflowScheduler;
    public taskQueue: DurableTaskQueue;
    public recoveryEngine: WorkflowRecoveryEngine;
    private workflows = new Map<string, WorkflowInstance>();
    private definitions = new Map<string, (ctx: DurableWorkflowContext, ...args: any[]) => Promise<any>>();
    private activePromises = new Map<string, Promise<any>>();

    constructor(
        private readonly nodeId: string,
        private readonly wal: DurableSegmentedWal,
        private currentEpoch = 1,
        public readonly partitionManager?: any,
        public readonly historyService?: any,
        public readonly transport?: any,
        public readonly tenantManager?: TenantManager,
        public readonly clusterAuthManager?: ClusterAuthManager,
        public readonly versionedRegistry?: VersionedWorkflowRegistry,
        public readonly migrationHookRegistry?: MigrationHookRegistry
    ) {
        this.scheduler = new DurableWorkflowScheduler(this);
        this.taskQueue = new DurableTaskQueue();
        this.recoveryEngine = new WorkflowRecoveryEngine(this);
    }

    public defineWorkflow(name: string, fn: (ctx: DurableWorkflowContext, ...args: any[]) => Promise<any>): void {
        this.definitions.set(name, fn);
    }

    public setEpoch(epoch: number): void {
        this.currentEpoch = epoch;
    }

    public logEvent(event: WorkflowEvent): void {
        const sanitized = JSON.parse(JSON.stringify(event)) as WorkflowEvent;
        this.wal.append(sanitized);
        
        const instance = this.workflows.get(sanitized.workflowId);
        if (instance) {
            instance.history.push(sanitized);
            if (sanitized.type === 'WORKFLOW_COMPLETED') {
                instance.status = 'COMPLETED';
                instance.result = sanitized.payload.result;
                this.archiveAndCompact(sanitized.workflowId, 'COMPLETED');
            } else if (sanitized.type === 'WORKFLOW_FAILED') {
                instance.status = 'FAILED';
                instance.error = sanitized.payload.error;
                this.archiveAndCompact(sanitized.workflowId, 'FAILED');
            }
        }

        if (this.tenantManager && (sanitized.type === 'WORKFLOW_COMPLETED' || sanitized.type === 'WORKFLOW_FAILED')) {
            const parts = sanitized.workflowId.split('/');
            const namespace = parts.length > 1 ? parts[0] : 'default';
            this.tenantManager.decrementActive(namespace);
        }
    }

    private archiveAndCompact(workflowId: string, status: 'COMPLETED' | 'FAILED'): void {
        const instance = this.workflows.get(workflowId);
        if (instance && this.historyService) {
            const record = {
                workflowId: instance.workflowId,
                name: instance.name,
                status: status,
                createdAt: instance.history[0]?.timestamp || Date.now(),
                updatedAt: Date.now(),
                ownerNodeId: instance.ownerNodeId,
                epoch: instance.activeEpoch,
                history: instance.history,
                retryCount: 0
            };
            this.historyService.saveWorkflowHistory(record);
            this.workflows.delete(workflowId);
            this.activePromises.delete(workflowId);
        }
    }

    public async startWorkflow(
        workflowId: string,
        name: string,
        input: any,
        securityContext?: SecurityContext,
        signedPackage?: SignedWorkflowPackage,
        publicKeyPem?: string,
        version?: string
    ): Promise<Promise<any>> {
        const parts = workflowId.split('/');
        const namespace = parts.length > 1 ? parts[0] : 'default';

        if (this.partitionManager && !this.partitionManager.isLocal(workflowId)) {
            const owner = this.partitionManager.getOwner(workflowId);
            if (!owner) {
                throw new Error(`[ORCHESTRATOR ${this.nodeId}] Owner node not found for workflowId: ${workflowId}`);
            }
            if (!this.transport) {
                throw new Error(`[ORCHESTRATOR ${this.nodeId}] Transport not available to route workflow: ${workflowId}`);
            }
            logger.info(`[ORCHESTRATOR ${this.nodeId}] Routing startWorkflow request for ${workflowId} to owner node ${owner}`);

            const traceContext: Record<string, string> = {};
            propagation.inject(context.active(), traceContext);

            const response = await this.transport.send(owner, {
                type: 'ROUTE_WORKFLOW',
                senderId: this.nodeId,
                epoch: this.currentEpoch,
                traceContext,
                payload: {
                    action: 'start',
                    workflowId,
                    name,
                    input,
                    securityContext,
                    signedPackage,
                    publicKeyPem,
                    version,
                    token: this.clusterAuthManager ? this.clusterAuthManager.generateToken() : undefined
                }
            });
            if (response.payload?.error) {
                throw new Error(response.payload.error);
            }
            return Promise.resolve(response.payload?.result);
        }

        // Apply tenant and quota checks locally
        if (this.tenantManager) {
            if (!securityContext) {
                throw new Error('[SECURITY] SecurityContext is required for multi-tenant execution');
            }
            this.tenantManager.checkQuotaAndRateLimit(namespace, name, securityContext);
        }

        // Verify signed package if provided
        if (signedPackage && publicKeyPem) {
            const wasmBytes = input && (input.wasmBytes || input.code);
            if (!wasmBytes || !(wasmBytes instanceof Uint8Array)) {
                throw new Error('[SECURITY] Package verification failed: WASM bytes not found in input');
            }
            if (!SecureWorkflowPackager.verifyPackage(signedPackage, wasmBytes, publicKeyPem)) {
                throw new Error('[SECURITY] Cryptographic package signature verification failed');
            }
        }

        let definition: ((ctx: DurableWorkflowContext, ...args: any[]) => Promise<any>) | undefined;
        let resolvedVersion = version;

        if (this.versionedRegistry) {
            if (!resolvedVersion) {
                resolvedVersion = this.versionedRegistry.getLatestVersion(name) || '1.0.0';
            }
            definition = this.versionedRegistry.get(name, resolvedVersion);
        }

        if (!definition) {
            definition = this.definitions.get(name);
        }

        if (!definition) {
            throw new Error(`[ORCHESTRATOR] Workflow definition ${name} (version: ${resolvedVersion || 'unspecified'}) not found`);
        }

        // Increment active count for namespace
        if (this.tenantManager) {
            this.tenantManager.incrementActive(namespace);
        }

        ztanTenantExecutionsTotal.inc({ tenant_id: namespace, workflow_name: name });

        const span = tracer.startSpan(`workflow:${name}`, {
            attributes: {
                'ztan.workflow_id': workflowId,
                'ztan.workflow_name': name,
                'ztan.tenant_id': namespace,
                'ztan.epoch': this.currentEpoch,
                'ztan.version': resolvedVersion || 'unknown',
                'ztan.replay': false
            }
        });

        // Initialize instance
        const instance: WorkflowInstance = {
            workflowId,
            name,
            status: 'RUNNING',
            input,
            activeEpoch: this.currentEpoch,
            ownerNodeId: this.nodeId,
            history: []
        };
        this.workflows.set(workflowId, instance);

        // Append events
        this.logEvent({
            type: 'WORKFLOW_STARTED',
            workflowId,
            timestamp: Date.now(),
            payload: { name, input, version: resolvedVersion }
        });

        this.logEvent({
            type: 'LEASE_ACQUIRED',
            workflowId,
            timestamp: Date.now(),
            payload: { epoch: this.currentEpoch, ownerNodeId: this.nodeId }
        });

        const ctx = new DurableWorkflowContext(workflowId, this, this.currentEpoch, []);
        const promise = context.with(trace.setSpan(context.active(), span), () => {
            return this.runWorkflowInstance(definition, ctx, input, span);
        });
        this.activePromises.set(workflowId, promise);
        return promise;
    }

    private async runWorkflowInstance(
        definition: (ctx: DurableWorkflowContext, ...args: any[]) => Promise<any>,
        ctx: DurableWorkflowContext,
        input: any,
        span?: any
    ): Promise<any> {
        const startTime = Date.now();
        try {
            const result = await definition(ctx, input);
            this.logEvent({
                type: 'WORKFLOW_COMPLETED',
                workflowId: ctx.workflowId,
                timestamp: Date.now(),
                payload: { result }
            });

            const duration = (Date.now() - startTime) / 1000;
            const wf = this.getWorkflow(ctx.workflowId);
            const wfName = wf ? wf.name : 'unknown';
            ztanWorkflowDurationSeconds.observe({ workflow_name: wfName, status: 'COMPLETED' }, duration);

            if (span) {
                span.setStatus({ code: 1 });
                span.end();
            }
            return result;
        } catch (err: any) {
            this.logEvent({
                type: 'WORKFLOW_FAILED',
                workflowId: ctx.workflowId,
                timestamp: Date.now(),
                payload: { error: err.message }
            });

            const duration = (Date.now() - startTime) / 1000;
            const wf = this.getWorkflow(ctx.workflowId);
            const wfName = wf ? wf.name : 'unknown';
            ztanWorkflowDurationSeconds.observe({ workflow_name: wfName, status: 'FAILED' }, duration);

            if (span) {
                span.setStatus({ code: 2, message: err.message });
                span.recordException(err);
                span.end();
            }
            throw err;
        }
    }

    public recoverAndResume(): void {
        const recoveredWorkflows = this.recoveryEngine.recoverFromWal(this.wal);

        for (const [wId, instance] of recoveredWorkflows.entries()) {
            const startedEvent = instance.history.find(e => e.type === 'WORKFLOW_STARTED');
            const instVersion = startedEvent?.payload?.version;

            let replayedHistory = [...instance.history];
            let currentVersion = instVersion || '1.0.0';
            const targetVersion = this.versionedRegistry?.getLatestVersion(instance.name);
            const isUpgraded = this.migrationHookRegistry && targetVersion && currentVersion !== targetVersion;

            if (isUpgraded) {
                const hook = this.migrationHookRegistry.getHook(instance.name, currentVersion, targetVersion);
                if (hook) {
                    replayedHistory = instance.history
                        .filter(ev => ev.type !== 'WORKFLOW_COMPLETED' && ev.type !== 'WORKFLOW_FAILED')
                        .map(ev => this.migrationHookRegistry!.migrateEvent(instance.name, currentVersion, targetVersion, ev));
                    currentVersion = targetVersion;

                    const startedEv = replayedHistory.find(ev => ev.type === 'WORKFLOW_STARTED');
                    if (startedEv && startedEv.payload && startedEv.payload.input) {
                        instance.input = startedEv.payload.input;
                    }
                }
            }

            if (isUpgraded && instance.status === 'COMPLETED') {
                const origCompletedEv = instance.history.find(ev => ev.type === 'WORKFLOW_COMPLETED');
                if (origCompletedEv && origCompletedEv.payload) {
                    const origResult = origCompletedEv.payload.result;
                    const origResultStr = JSON.stringify(origResult);

                    let matchedMigratedResult: any = null;
                    for (let i = 0; i < instance.history.length; i++) {
                        const ev = instance.history[i];
                        if (ev.type === 'STEP_COMPLETED' && ev.payload && JSON.stringify(ev.payload.result) === origResultStr) {
                            const migratedEv = replayedHistory[i];
                            if (migratedEv && migratedEv.payload) {
                                matchedMigratedResult = migratedEv.payload.result;
                                break;
                            }
                        }
                    }

                    if (!matchedMigratedResult) {
                        const stepEvents = replayedHistory.filter(ev => ev.type === 'STEP_COMPLETED');
                        if (stepEvents.length > 0) {
                            matchedMigratedResult = stepEvents[stepEvents.length - 1].payload?.result;
                        }
                    }

                    if (matchedMigratedResult) {
                        instance.result = matchedMigratedResult;
                        replayedHistory.push({
                            type: 'WORKFLOW_COMPLETED',
                            workflowId: wId,
                            timestamp: Date.now(),
                            payload: { result: matchedMigratedResult }
                        });
                    }
                }
                instance.history = replayedHistory;
                continue;
            }

            if (isUpgraded && instance.status === 'FAILED') {
                const origFailedEv = instance.history.find(ev => ev.type === 'WORKFLOW_FAILED');
                if (origFailedEv && origFailedEv.payload) {
                    instance.error = origFailedEv.payload.error;
                    replayedHistory.push({
                        type: 'WORKFLOW_FAILED',
                        workflowId: wId,
                        timestamp: Date.now(),
                        payload: { error: origFailedEv.payload.error }
                    });
                }
                instance.history = replayedHistory;
                continue;
            }

            if (instance.status !== 'RUNNING' && !isUpgraded) {
                continue;
            }

            // Verify lease ownership matches current epoch and node ID
            if (instance.ownerNodeId !== this.nodeId || instance.activeEpoch !== this.currentEpoch) {
                // Not owned by this node in this epoch - ignore or skip
                continue;
            }

            let definition: ((ctx: DurableWorkflowContext, ...args: any[]) => Promise<any>) | undefined;
            if (this.versionedRegistry) {
                definition = this.versionedRegistry.get(instance.name, currentVersion);
            }
            if (!definition) {
                definition = this.definitions.get(instance.name);
            }

            if (!definition) {
                logger.error(`[ORCHESTRATOR] Definition for workflow ${instance.name} (version: ${currentVersion}) not found during recovery`);
                continue;
            }

            logger.info(`[ORCHESTRATOR] Recovering and resuming workflow ${instance.name} (${wId}) at version ${currentVersion}...`);

            if (this.tenantManager) {
                const parts = wId.split('/');
                const namespace = parts.length > 1 ? parts[0] : 'default';
                this.tenantManager.incrementActive(namespace);
            }

            // Reconstruct active timers and task queues before re-running definition
            const activeTimersMap = new Map<string, WorkflowEvent>();
            const activeTasksMap = new Map<string, WorkflowEvent>();

            for (const ev of replayedHistory) {
                if (ev.type === 'TIMER_STARTED') {
                    activeTimersMap.set(ev.payload.timerId, ev);
                } else if (ev.type === 'TIMER_FIRED') {
                    activeTimersMap.delete(ev.payload.timerId);
                } else if (ev.type === 'TASK_ENQUEUED') {
                    activeTasksMap.set(ev.payload.taskId, ev);
                } else if (ev.type === 'TASK_COMPLETED' || ev.type === 'TASK_FAILED') {
                    activeTasksMap.delete(ev.payload.taskId);
                }
            }

            const ctx = new DurableWorkflowContext(wId, this, this.currentEpoch, replayedHistory);

            // Re-register outstanding active timers in our scheduler
            for (const timerEvent of activeTimersMap.values()) {
                const payload = timerEvent.payload;
                this.scheduler.recoverTimer(
                    wId,
                    payload.timerId,
                    payload.delayMs,
                    payload.startTime,
                    async () => {
                        // Resumed execution is triggered when timer completes during re-run
                    }
                );
            }

            const replayStartTime = Date.now();
            const parts = wId.split('/');
            const namespace = parts.length > 1 ? parts[0] : 'default';

            const span = tracer.startSpan(`replay:${instance.name}`, {
                attributes: {
                    'ztan.workflow_id': wId,
                    'ztan.workflow_name': instance.name,
                    'ztan.tenant_id': namespace,
                    'ztan.epoch': this.currentEpoch,
                    'ztan.replay': true
                }
            });

            // Re-run execution
            const promise = context.with(trace.setSpan(context.active(), span), async () => {
                try {
                    const result = await this.runWorkflowInstance(definition, ctx, instance.input, span);
                    const replayDuration = (Date.now() - replayStartTime) / 1000;
                    ztanWorkflowReplayDurationSeconds.observe({ workflow_name: instance.name }, replayDuration);
                    return result;
                } catch (err: any) {
                    const replayDuration = (Date.now() - replayStartTime) / 1000;
                    ztanWorkflowReplayDurationSeconds.observe({ workflow_name: instance.name }, replayDuration);
                    throw err;
                }
            });
            this.activePromises.set(wId, promise);
        }

        this.workflows = recoveredWorkflows;
    }

    public getWorkflow(workflowId: string): WorkflowInstance | undefined {
        if (this.partitionManager && !this.partitionManager.isLocal(workflowId)) {
            if (this.historyService) {
                const record = this.historyService.getWorkflowHistory(workflowId);
                if (record) {
                    return {
                        workflowId: record.workflowId,
                        name: record.name,
                        status: record.status,
                        input: null,
                        result: record.status === 'COMPLETED' ? record.history[record.history.length - 1]?.payload?.result : undefined,
                        activeEpoch: record.epoch,
                        ownerNodeId: record.ownerNodeId,
                        history: record.history
                    };
                }
            }
            return undefined;
        }

        const localInst = this.workflows.get(workflowId);
        if (localInst) {
            return localInst;
        }

        if (this.historyService) {
            const record = this.historyService.getWorkflowHistory(workflowId);
            if (record) {
                return {
                    workflowId: record.workflowId,
                    name: record.name,
                    status: record.status,
                    input: null,
                    result: record.status === 'COMPLETED' ? record.history[record.history.length - 1]?.payload?.result : undefined,
                    activeEpoch: record.epoch,
                    ownerNodeId: record.ownerNodeId,
                    history: record.history
                };
            }
        }

        return undefined;
    }

    public getActivePromise(workflowId: string): Promise<any> | undefined {
        return this.activePromises.get(workflowId);
    }

    public async handleRouteWorkflow(msg: any): Promise<any> {
        if (msg.type !== 'ROUTE_WORKFLOW') {
            throw new Error(`[ORCHESTRATOR] Unsupported message type: ${msg.type}`);
        }
        const { action, workflowId, name, input, securityContext, signedPackage, publicKeyPem, token } = msg.payload || {};
        
        try {
            if (this.clusterAuthManager) {
                if (!token || !this.clusterAuthManager.authenticateNode(token)) {
                    throw new Error('[SECURITY] Peer authentication failed: invalid cluster token');
                }
            }
            if (action === 'start') {
                const promise = await this.startWorkflow(workflowId, name, input, securityContext, signedPackage, publicKeyPem);
                const result = await promise;
                return {
                    type: 'ROUTE_WORKFLOW',
                    senderId: this.nodeId,
                    epoch: msg.epoch,
                    payload: { result }
                };
            }
            throw new Error(`[ORCHESTRATOR] Unsupported action: ${action}`);
        } catch (err: any) {
            return {
                type: 'ROUTE_WORKFLOW',
                senderId: this.nodeId,
                epoch: msg.epoch,
                payload: { error: err.message }
            };
        }
    }

    public async teardown(): Promise<void> {
        this.wal.closeActiveSegment();
        if (this.historyService) {
            this.historyService.close();
        }
        for (const timer of this.scheduler.getActiveTimers()) {
            this.scheduler.cancelTimer(timer.timerId);
        }
    }
}
