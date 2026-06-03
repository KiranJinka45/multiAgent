import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import pino from 'pino';
import http from 'http';
import crypto from 'crypto';

import express from 'express';
import { sidecarVerifier, consensusEngine, externalVerifier, notaryService, ThresholdCrypto, StabilityCircuit, TrustAttestation, SreDecision, DEFAULT_THRESHOLD, DEFAULT_NODE_IDS, ZKProof, NotarizationAnchor } from '@packages/governance-core';

const elog = pino({ level: 'info' });

export async function initSocket(server: http.Server, app?: express.Application): Promise<any> {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisOptions = {
        maxRetriesPerRequest: null,
        retryStrategy(times: number) {
            const delay = Math.min(times * 200, 10000);
            const jitter = delay * 0.2 * (Math.random() - 0.5); // +-10% randomized jitter
            return Math.round(delay + jitter);
        }
    };
    const pubClient = new Redis(REDIS_URL, redisOptions);
    pubClient.on('error', (err: any) => elog.error({ err: err.message }, '[Socket] Redis pubClient connection error'));
    pubClient.on('connect', () => elog.info('[Socket] Redis pubClient connected successfully'));

    const subClient = pubClient.duplicate();
    subClient.on('error', (err: any) => elog.error({ err: err.message }, '[Socket] Redis subClient connection error'));
    subClient.on('connect', () => elog.info('[Socket] Redis subClient connected successfully'));

    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling'], // Standardize for reliability (polling fallback)
        pingInterval: 10000,
        pingTimeout: 5000
    });

    io.adapter(createAdapter(pubClient, subClient));

    // --- PILLAR 1: BACKPRESSURE-AWARE STREAMING ---
    const connectedSockets = new Set<any>();
    let latestState: any = null;
    const REDIS_AUDIT_KEY = 'sre:audit:log';
    const MAX_AUDIT_LOG = 1000;

    if (app) {
        app.get('/api/v1/replay', async (req, res) => {
            try {
                const logs = await pubClient.lrange(REDIS_AUDIT_KEY, 0, -1);
                const events = logs.map(l => JSON.parse(l));
                res.json({
                    success: true,
                    count: events.length,
                    events
                });
            } catch (err) {
                elog.error({ err }, '[Socket] Replay API failed');
                res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
            }
        });
        elog.info('[Socket] Persistent Replay API registered at /api/v1/replay');
    }

    io.on('connection', (socket) => {
        connectedSockets.add(socket);
        elog.info({ socketId: socket.id }, '[Socket] User connected');

        // Send latest state immediately upon connection (Fast Start)
        if (latestState) {
            socket.emit('sre:update', latestState);
        }

        socket.on('subscribe', (buildId: string) => {
            elog.info({ socketId: socket.id, buildId }, '[Socket] Subscribing to build room');
            socket.join(`build:${buildId}`);
            socket.emit('subscribed', { room: `build:${buildId}`, ts: Date.now() });
        });

        socket.on('sre:subscribe', () => {
            elog.info({ socketId: socket.id }, '[Socket] Subscribing to SRE Telemetry');
            socket.join('sre:telemetry');
        });

        // --- NEW: REPLAY EXPLORER HANDLERS ---
        socket.on('sre:archaeology:load_chain', async (data: { incidentId: string }) => {
            try {
                const { EvidenceLedgerService } = await import('@packages/ztan-witness');
                const chain = await EvidenceLedgerService.getChain(data.incidentId);
                socket.emit('sre:archaeology:chain_loaded', chain);
                elog.info({ socketId: socket.id, incidentId: data.incidentId }, '[Socket] Forensic chain loaded and sent to operator');
            } catch (err) {
                elog.error({ err }, '[Socket] Failed to load forensic chain');
                socket.emit('sre:error', { message: 'Forensic retrieval failure' });
            }
        });

        socket.on('sre:archaeology:stress_pump', (data: { count: number; byzantineType?: 'skew' | 'collision' | 'hash_mismatch' | 'gaps' }) => {
            const count = data.count || 50000;
            const byz = data.byzantineType;
            elog.info({ socketId: socket.id, count, byzantineType: byz }, '⚡ [Socket] Stress pump triggered. Synthesizing evidence chain.');
            
            const batchSize = 5000;
            let sequence = 20000;
            const types = ['GOVERNANCE', 'REPLAY', 'IDENTITY', 'TELEMETRY', 'POLICY'];
            
            const sendBatch = () => {
                if (sequence >= 20000 + count) {
                    elog.info('[Socket] Stress pump completed successfully.');
                    return;
                }
                
                const batch: any[] = [];
                const currentBatchSize = Math.min(batchSize, (20000 + count) - sequence);
                
                for (let i = 0; i < currentBatchSize; i++) {
                    let id = sequence++;
                    
                    // Byzantine Type: Gaps (skip sequence numbers)
                    if (byz === 'gaps' && i > 0 && i % 1000 === 0) {
                        id += 10;
                        sequence += 10;
                    }

                    // Byzantine Type: Clock Skew (timestamp goes backward or leaps)
                    let timestamp = new Date().toISOString();
                    if (byz === 'skew' && i > 0 && i % 1000 === 0) {
                        timestamp = new Date(Date.now() - 1200000).toISOString();
                    }

                    // Byzantine Type: Hash Mismatch
                    let payload = `[Forensic Pipeline Stress Event #${id}] System telemetry verified.`;
                    if (byz === 'hash_mismatch' && i > 0 && i % 500 === 0) {
                        payload += ' [BYZANTINE_HASH_MISMATCH] corrupt hash pointer.';
                    }

                    const ev = {
                        sequenceId: id,
                        timestamp,
                        type: types[id % types.length],
                        payload,
                        evidence: {
                          hash: crypto.randomBytes(8).toString('hex'),
                          prevHash: crypto.randomBytes(8).toString('hex'),
                          signature: 'ZTAN_SIG_' + crypto.randomBytes(3).toString('hex').toUpperCase(),
                          epoch: '102',
                          verdict: 'VERIFIED'
                        }
                    };

                    batch.push(ev);

                    // Byzantine Type: Collision (inject duplicate sequenceId with different payload)
                    if (byz === 'collision' && i > 0 && i % 500 === 0) {
                        batch.push({
                            ...ev,
                            payload: `[BYZANTINE_COLLISION] Malicious double-spending payload attempt at sequence #${id}.`,
                            evidence: {
                                ...ev.evidence,
                                hash: crypto.randomBytes(8).toString('hex')
                            }
                        });
                    }
                }
                
                io.to('sre:telemetry').emit('sre:archaeology:chain_loaded', batch);
                setTimeout(sendBatch, 50);
            };
            
            sendBatch();
        });

        socket.on('disconnect', () => {
            connectedSockets.delete(socket);
            elog.info({ socketId: socket.id }, '[Socket] User disconnected');
        });
    });

    // --- PILLAR 2: TIME-TRAVEL AUDIT SYSTEM (REDIS PERSISTED) ---
    const eventSubscriber = pubClient.duplicate();
    eventSubscriber.on('error', (err: any) => elog.error({ err: err.message }, '[Socket] Redis eventSubscriber connection error'));
    eventSubscriber.on('connect', () => elog.info('[Socket] Redis eventSubscriber connected successfully'));
    eventSubscriber.subscribe('sre:telemetry:update', (err) => {
        if (err) elog.error({ err }, '[Socket] Failed to subscribe to SRE telemetry');
    });

    // --- ELITE TIER: DISTRIBUTED KEY GENERATION (DKG) ---
    const nodeIds = ['SRE-ENGINE-01', 'ZTAN-SIDECAR-02', 'ZTAN-EXTERNAL-03'];
    const keyShares = await ThresholdCrypto.performDKG(nodeIds, DEFAULT_THRESHOLD);
    const groupPublicKey = keyShares[0].groupPublicKey;

    sidecarVerifier.setKeyShare(keyShares[1]);
    externalVerifier.setKeyShare(keyShares[2]);

    elog.info({ groupPublicKey }, '[ZTAN-ELITE] DKG Complete. Threshold Signature network operational.');

    eventSubscriber.on('message', async (channel, message) => {
        if (channel === 'sre:telemetry:update') {
            try {
                const state = JSON.parse(message);
                const { EvidenceLedgerService } = await import('@packages/ztan-witness');
                const { EventCategory } = await import('@packages/contracts');
                
                // --- PILLAR 3: CENTRALIZED EVIDENCE LEDGER INGESTION ---
                // We use the sequenceId/correlationId from telemetry as the primary anchor
                const evidenceEntry = await EvidenceLedgerService.append({
                    category: EventCategory.OBSERVATION,
                    source: { service: 'gateway', node: 'ztan-gateway-01', version: '2026-LTS.1' },
                    payload: state,
                    correlationId: state.evidenceChainId || 'default-operational-stream',
                    parentEventId: state.lastAction?.id,
                    signerId: 'ztan-gateway-01' // Attributing to the gateway node
                });

                // Attach forensic metadata back to the state for the UI
                state.evidenceChainId = evidenceEntry.correlationId;
                state.evidenceId = evidenceEntry.id;
                
                latestState = state;
                
                elog.info({ 
                    evidenceId: evidenceEntry.id, 
                    sequence: evidenceEntry.sequence,
                    hash: evidenceEntry.integrity.hash
                }, '[Socket] Forensic evidence anchored and chained');
            } catch (err) {
                elog.error({ err }, '[Socket] Telemetry parse/persist error');
            }
        }
    });



    // Controlled broadcast loop (Backpressure management & Budget limits)
    setInterval(() => {
        if (!latestState) return;

        try {
            // Measure Serialization Latency (Observability Risk 2)
            const startSer = performance.now();
            const serializedPayload = JSON.stringify(latestState);
            const serLatency = (performance.now() - startSer) / 1000;
            
            import('@packages/observability').then(obs => {
                if (obs && obs.websocketSerializationLatency) {
                    obs.websocketSerializationLatency.observe(serLatency);
                }
            }).catch(() => {});

            // Enforce Telemetry Budgets (Observability Risk 7)
            // Ceiling 1: Max websocket telemetry throughput = 50 KB
            const payloadSizeKb = Buffer.byteLength(serializedPayload, 'utf8') / 1024;
            
            let finalPayload = latestState;
            if (payloadSizeKb > 50) {
                elog.warn({ payloadSizeKb }, '⚠️  [Socket] Telemetry payload exceeds 50KB budget. Down-sampling payload to preserve network health.');
                // Down-sampling / load-shedding: strip verbose fields (like full incident logs)
                finalPayload = {
                    ...latestState,
                    activeIncidents: latestState.activeIncidents?.map((inc: any) => ({
                        id: inc.id,
                        type: inc.type,
                        severity: inc.severity,
                        title: inc.title,
                        timestamp: inc.timestamp
                    })) ?? [],
                    governanceProposals: latestState.governanceProposals?.map((p: any) => ({
                        id: p.id,
                        title: p.title,
                        riskLevel: p.riskLevel,
                        status: p.status
                    })) ?? []
                };
            }

            // Track WebSocket Outbound Queue Depth (Observability Risk 2)
            let totalQueueDepth = 0;
            io.sockets.sockets.forEach((s: any) => {
                if (s.conn && s.conn.writeBuffer) {
                    totalQueueDepth += s.conn.writeBuffer.length;
                }
            });
            
            import('@packages/observability').then(obs => {
                if (obs && obs.websocketOutboundQueueDepth) {
                    obs.websocketOutboundQueueDepth.set(totalQueueDepth);
                }
            }).catch(() => {});

            // Broadcast to all subscribed clients
            io.to('sre:telemetry').emit('sre:update', finalPayload);
            elog.debug('[Socket] Broadcasted latest SRE state to telemetry room');
        } catch (e) {
            elog.error({ err: e }, '[Socket] Telemetry broadcast error');
        }
    }, 1000); // Stable 1Hz telemetry heart-beat

    // Redis subscriber for all build and log events
    const buildEventSubscriber = pubClient.duplicate();
    buildEventSubscriber.on('error', (err: any) => elog.error({ err: err.message }, '[Socket] Redis buildEventSubscriber connection error'));
    buildEventSubscriber.on('connect', () => elog.info('[Socket] Redis buildEventSubscriber connected successfully'));
    buildEventSubscriber.subscribe('build-events', 'log-events', (err) => {
        if (err) elog.error({ err }, '[Socket] Redis subscribe error');
    });

    buildEventSubscriber.on('message', (channel, message) => {
        try {
            const event = JSON.parse(message);
            
            if (channel === 'build-events') {
                const { executionId, type } = event;
                if (!executionId || !type) return;
                // Broadcast to build room (Mission Steps)
                io.to(`build:${executionId}`).emit(type, event);
                elog.debug({ executionId, type }, '[Socket] Broadcasted build event');
            } 
            
            else if (channel === 'log-events') {
                const { missionId, type } = event;
                // Broadcast to mission or global log room
                const room = missionId ? `logs:${missionId}` : 'logs:global';
                io.to(room).emit('log-update', event);
                elog.debug({ room }, '[Socket] Broadcasted log event');
            }
        } catch (err) {
            elog.error({ err }, '[Socket] Failed to parse or broadcast message');
        }
    });

    return io;
}
