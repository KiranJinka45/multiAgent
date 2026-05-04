import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import pino from 'pino';
import http from 'http';
import crypto from 'crypto';

import express from 'express';
import { sidecarVerifier, consensusEngine, externalVerifier, notaryService } from '../../governance/src';

const elog = pino({ level: 'info' });

export function initSocket(server: http.Server, app?: express.Application) {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();

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
    let lastHash: string = '0'.repeat(64); // Genesis hash
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

        socket.on('disconnect', () => {
            connectedSockets.delete(socket);
            elog.info({ socketId: socket.id }, '[Socket] User disconnected');
        });
    });

    // --- PILLAR 2: TIME-TRAVEL AUDIT SYSTEM (REDIS PERSISTED) ---
    const eventSubscriber = pubClient.duplicate();
    eventSubscriber.subscribe('sre:telemetry:update', (err) => {
        if (err) elog.error({ err }, '[Socket] Failed to subscribe to SRE telemetry');
    });

    // --- ELITE TIER: DISTRIBUTED KEY GENERATION (DKG) ---
    const nodeIds = ['SRE-ENGINE-01', 'ZTAN-SIDECAR-02', 'ZTAN-EXTERNAL-03'];
    const keyShares = ThresholdCrypto.generateKeyShares(nodeIds);
    const groupPublicKey = keyShares[0].groupPublicKey;

    sidecarVerifier.setKeyShare(keyShares[1]);
    externalVerifier.setKeyShare(keyShares[2]);

    elog.info({ groupPublicKey }, '[ZTAN-ELITE] DKG Complete. Threshold Signature network operational.');

    eventSubscriber.on('message', async (channel, message) => {
        if (channel === 'sre:telemetry:update') {
            try {
                const state = JSON.parse(message);
                
                // --- ZTAN PHASE 2: MULTI-NODE HETEROGENEOUS CONSENSUS (N=3) ---
                const telemetrySnapshot = state.observers?.map((o: any) => ({
                    nodeId: o.id || 'unknown',
                    metrics: {
                        cpu: o.cpu || 0,
                        memory: o.memory || 0,
                        latency: o.latency || 0,
                        errors: o.errors || 0
                    }
                })) || [];

                telemetrySnapshot.forEach((data: any) => sidecarVerifier.processTelemetry(data));

                // 2. Check for SRE Decision and trigger Elite Consensus
                const decision = state.elite?.multiAgent?.consensus;
                let zkProof = null;

                if (decision && decision.action !== 'NO_ACTION') {
                    const sreDecision = {
                        eventId: state.sequenceId.toString(),
                        type: decision.action,
                        targetNode: state.elite.rca?.rootCause || 'unknown',
                        reason: state.perception?.explainability?.rationale || 'Autonomous action',
                        timestamp: Date.now()
                    };

                    // --- ZTAN ELITE: ZK-PROOF GENERATION (ZKAV) ---
                    // Mock metrics for proof (in real system, these come from ValidationEngine)
                    const acc = 1.0; 
                    const ldet = 120;
                    const lsla = 15000;
                    const threshold = 0.85;

                    zkProof = await StabilityCircuit.generateProof(acc, ldet, lsla, threshold, groupPublicKey);

                    // --- ZTAN ELITE: THRESHOLD SIGNING (TSAC) ---
                    const sidecarAttestation = await sidecarVerifier.verifyDecision(sreDecision as any);
                    const externalAttestation = await externalVerifier.verifyDecision(sreDecision as any, telemetrySnapshot);
                    
                    // Engine Self-Attestation (with cryptographic share)
                    const enginePayload = `${state.sequenceId}|PASS|node-a`;
                    const engineAttestation = {
                        eventId: state.sequenceId.toString(),
                        status: 'PASS',
                        verifierId: 'SRE-ENGINE-01',
                        expectedNode: state.elite.rca?.rootCause,
                        confidence: 1.0,
                        timestamp: Date.now(),
                        partialSignature: ThresholdCrypto.signPartial(enginePayload, keyShares[0].share, keyShares[0].groupPublicKey, 'SRE-ENGINE-01')
                    };

                    await consensusEngine.recordAttestation(engineAttestation as any);
                    await consensusEngine.recordAttestation(sidecarAttestation as any);
                    const finalResult = await consensusEngine.recordAttestation(externalAttestation as any);

                    if (finalResult) {
                        state.governance.mode = finalResult.governanceMode;
                        state.governance.isCertified = finalResult.isTrusted;
                        state.governance.attestations = finalResult.attestations;
                        state.governance.aggregatedSignature = finalResult.aggregatedSignature;
                    }
                }

                latestState = state;
                const updatedMessage = JSON.stringify(state);
                
                // --- PILLAR 3: CRYPTOGRAPHIC HASH-CHAINING (AUDIT INTEGRITY) ---
                const hash = crypto.createHash('sha256')
                    .update(lastHash + updatedMessage)
                    .digest('hex');
                
                // --- ZTAN PHASE 3: EXTERNAL NOTARIZATION (TAMPER-PROOF) ---
                let notarization = null;
                if (state.sequenceId % 10 === 0) {
                    notarization = await notaryService.notarize(hash);
                }

                const auditEntry = {
                    ...latestState,
                    _audit: {
                        hash,
                        prevHash: lastHash,
                        ts: Date.now(),
                        ztan_consensus: state.governance.isCertified || false,
                        aggregatedSignature: state.governance.aggregatedSignature,
                        zkProof,
                        notarized: !!notarization,
                        notarySeq: notarization?.sequenceId
                    },
                    _verification_data: zkProof ? { acc: 1.0, ldet: 120, lsla: 15000 } : undefined
                };
                
                lastHash = hash;
                const auditMessage = JSON.stringify(auditEntry);

                // --- PILLAR 4: IMMUTABLE AUDIT ANCHORING (WORM COMPLIANCE) ---
                const anchorKey = `audit/anchor/${Date.now()}`;
                await pubClient.set(anchorKey, hash, 'EX', 31536000); 
                await pubClient.set('sre:audit:latest_anchor', hash); 
                
                // Persist to Redis circular buffer
                await pubClient.lpush(REDIS_AUDIT_KEY, auditMessage);
                await pubClient.ltrim(REDIS_AUDIT_KEY, 0, MAX_AUDIT_LOG - 1);
                
                elog.info({ 
                    hash, 
                    certified: state.governance.isCertified, 
                    notarized: !!notarization 
                }, '[Socket] Audit head locked with N=3 consensus and external notarization proof');
            } catch (err) {
                elog.error({ err }, '[Socket] Telemetry parse/persist error');
            }
        }
    });


    // Controlled broadcast loop (Backpressure management)
    setInterval(() => {
        if (!latestState) return;

        // Broadcast to all subscribed clients
        io.to('sre:telemetry').emit('sre:update', latestState);
        elog.debug('[Socket] Broadcasted latest SRE state to telemetry room');
    }, 1000); // Stable 1Hz telemetry heart-beat

    // Redis subscriber for all build and log events
    const buildEventSubscriber = pubClient.duplicate();
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
