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
            return Math.min(times * 200, 10000);
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



    // Controlled broadcast loop (Backpressure management)
    setInterval(() => {
        if (!latestState) return;

        // Broadcast to all subscribed clients
        io.to('sre:telemetry').emit('sre:update', latestState);
        elog.debug('[Socket] Broadcasted latest SRE state to telemetry room');
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
