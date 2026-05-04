import { Server, Socket } from 'socket.io';
import { logger } from '@packages/observability';
import { sreEngine } from './sre-engine';
import { SRETuningParams } from '@packages/contracts';
import { chaosOrchestrator, ChaosScenario } from './chaos-orchestrator';
import { validationEngine } from './validation-engine';
import { soakTester } from './soak-tester';
import { SreAnalyticsService } from './governance/sre-analytics';

export class SreStreamingService {
    private io: Server;
    private lastBroadcastState: any = null;
    private lastFullBroadcastTime: number = 0;

    constructor(io: Server) {
        this.io = io;
        this.setupSubscriptions();
        this.setupEventListeners();
        this.startTelemetryBroadcast();
    }

    private setupEventListeners() {
        // Immediate broadcast on state transition (captures jitter)
        sreEngine.on('stateChange', async (state) => {
            logger.debug('[SRE] State transition detected - broadcasting immediately');
            await this.broadcast(state);
        });

        // Analytics stream
        SreAnalyticsService.setOnEventListener((event) => {
            this.io.to('sre:analytics').emit('sre:analytics:event', event);
        });
    }

    private setupSubscriptions() {
        this.io.on('connection', (socket: Socket) => {
            // Subscribe to SRE Telemetry
            socket.on('sre:subscribe', () => {
                logger.info({ socketId: socket.id }, '[SRE] Client subscribed to SRE telemetry');
                socket.join('sre:telemetry');
                
                // Send current state immediately
                sreEngine.getCurrentStateAsync().then(state => {
                    socket.emit('sre:update', state);
                });
            });

            // Subscribe to Analytics
            socket.on('sre:analytics:subscribe', async () => {
                logger.info({ socketId: socket.id }, '[SRE] Client subscribed to SRE analytics');
                socket.join('sre:analytics');
                const events = await SreAnalyticsService.getRecentEvents(50);
                socket.emit('sre:analytics:init', events);
            });

            // Update Tuning Parameters
            socket.on('sre:tune', async (params: Partial<SRETuningParams>) => {
                logger.warn({ socketId: socket.id, params }, '[SRE] Tuning update requested');
                try {
                    await sreEngine.updateTuning(params);
                    // Broadcast update immediately after tuning
                    const state = await sreEngine.getCurrentStateAsync();
                    await this.broadcast(state);
                } catch (err: any) {
                    logger.error({ err, socketId: socket.id }, '[SRE] Tuning rejected due to safety violation');
                    socket.emit('sre:error', { message: err.message });
                }
            });

            // Mock Signal Injection (for field validation testing)
            socket.on('sre:inject_signal', (signal: any) => {
                logger.info({ socketId: socket.id, signal }, '[SRE] Manual signal injected');
                sreEngine.registerObserverSignal(signal);
            });

            // Network Disorder Feedback Loop
            socket.on('sre:network_disorder', (data: { sequenceId: number, lastSequenceId: number, totalDisordered: number }) => {
                logger.warn({ data }, '[SRE] Client reported network disorder / sequence inversion');
                sreEngine.reportNetworkDisorder(data.totalDisordered);
            });

            // Production Validation Hooks (Chaos Engineering)
            socket.on('sre:chaos_inject', (payload: { scenario: ChaosScenario, nodeId?: string }) => {
                validationEngine.onChaosStart();
                const scenario = typeof payload === 'string' ? payload : payload.scenario;
                const nodeId = (payload as any).nodeId || 'api-service';
                chaosOrchestrator.inject(scenario as ChaosScenario, nodeId);
                this.broadcastImmediate();
            });

            socket.on('sre:chaos_clear', () => {
                // We don't know if it was detected until we check the current state
                // But for simplicity, we'll assume the engine handles it.
                // Better: Check if any anomalies were detected during chaos.
                chaosOrchestrator.clear();
                this.broadcastImmediate();
            });

            socket.on('sre:validation_reset', () => {
                validationEngine.reset();
                this.broadcastImmediate();
            });

            socket.on('sre:soak_start', () => {
                soakTester.start();
                this.broadcastImmediate();
            });

            socket.on('sre:soak_stop', () => {
                soakTester.stop();
                this.broadcastImmediate();
            });

            socket.on('sre:approve', async (data: { requestId: string, rationale: string }) => {
                logger.info({ requestId: data.requestId }, '[SRE] Operator APPROVED action');
                await sreEngine.handleApproval(data.requestId, 'APPROVED', data.rationale);
                this.broadcastImmediate();
            });

            socket.on('sre:reject', async (data: { requestId: string, rationale: string }) => {
                logger.info({ requestId: data.requestId }, '[SRE] Operator REJECTED action');
                await sreEngine.handleApproval(data.requestId, 'REJECTED', data.rationale);
                this.broadcastImmediate();
            });
        });
    }

    private startTelemetryBroadcast() {
        // Broadcast SRE state every 2 seconds to all subscribers
        setInterval(async () => {
            const state = await sreEngine.getCurrentStateAsync();
            if (this.io.sockets.adapter.rooms.has('sre:telemetry')) {
                logger.debug('[SRE STREAM] Broadcasting state to subscribers');
            }
            await this.broadcast(state);
        }, 2000);
    }

    private async broadcast(state: any) {
        const now = Date.now();
        const needsFullUpdate = now - this.lastFullBroadcastTime > 5000 || this.hasSignificantChange(state);

        const payload = needsFullUpdate ? state : this.computeDelta(state);

        this.io.to('sre:telemetry').emit('sre:update', payload);

        if (needsFullUpdate) {
            this.lastFullBroadcastTime = now;
            this.lastBroadcastState = JSON.parse(JSON.stringify(state));
        }
    }

    private hasSignificantChange(current: any): boolean {
        if (!this.lastBroadcastState) return true;
        if (current.governance.mode !== this.lastBroadcastState.governance.mode) return true;
        if (current.governance.reasonType !== this.lastBroadcastState.governance.reasonType) return true;
        
        const consensusDelta = Math.abs(current.perception.consensus - this.lastBroadcastState.perception.consensus);
        if (consensusDelta > 0.05) return true;

        const trustDelta = Math.abs((current.trust?.score || 0) - (this.lastBroadcastState.trust?.score || 0));
        if (trustDelta > 0.05) return true;

        return false;
    }

    private computeDelta(current: any): any {
        return {
            sequenceId: current.sequenceId,
            timestamp: current.timestamp,
            isDelta: true,
            governance: {
                mode: current.governance.mode,
                reasonType: current.governance.reasonType,
                reason: current.governance.reason,
                reasoningDecomposition: current.governance.reasoningDecomposition,
                approvalRequestId: current.governance.approvalRequestId
            },
            trust: current.trust,
            elite: (current as any).elite,
            perception: {
                consensus: current.perception.consensus,
                signalIntegrityState: current.perception.signalIntegrityState,
                anomalyHypothesis: current.perception.anomalyHypothesis,
                brierScore: current.perception.brierScore,
                wassersteinDistance: current.perception.wassersteinDistance
            },
            validation: {
                ...current.validation,
                history: validationEngine.getHistory()
            },
            audit: current.audit,
            topology: current.topology,
            soak: soakTester.getStatus()
        };
    }

    private async broadcastImmediate() {
        const state = await sreEngine.getCurrentState();
        await this.broadcast(state);
    }
}
