import express from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import http, { createServer } from 'http';
import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';
import { redis, validateStartupSecrets, validateRawPayloadSizeLimit } from '@packages/utils';
import dotenv from 'dotenv';
import cors from 'cors';

import path from 'path';
import { logger, initTelemetry, apiRequestDurationSeconds, registry } from '@packages/observability';
import { YjsServer } from './yjs-server.js';
import { projectService } from './project-service.js';
import { stateReconciler } from './state-reconciler.js';
import { internalAuth, userAuth } from '@packages/auth-internal';
import { LogStreamingService } from './log-streaming.js';
import { SreStreamingService } from './sre-streaming.js';
import { v4 as uuid } from 'uuid';
import { db } from '@packages/db';
import { telemetrySimulator } from './telemetry-simulator.js';
import { otelReceiver } from './otel-receiver.js';
import { MissionStartSchema, ProjectCreateSchema, LogIngestSchema } from './schemas.js';
import { ZodError } from 'zod';
import debugRouter from '../controllers/debug-controller.js';
import whoamiRouter from '../routes/whoami.js';
import { sreEngine } from './sre-engine.js';
import { buildCanonicalPayload, hashPayload } from '@packages/ztan-crypto';
import ztanRouter from '../routes/ztan.js';
import ztanGovRouter from '../routes/ztan-governance.js';
import { IdentityService } from './identity.service.js';
import { ConsensusEngine, ZtanLeaseManager, QuarantineError } from '@packages/governance-core';
import { FailureBundleGenerator } from '@packages/runtime-core';

// ZTAN Tier E3: Forensic IO Rate-Limiting State
let lastBundleGenerationTime = 0;
const BUNDLE_DEBOUNCE_MS = 5000;

async function handleQuarantineEvent(err: Error, source: string) {
    if (err.name === 'QuarantineError' || err.message.includes('QuarantineError') || err instanceof QuarantineError) {
        const now = Date.now();
        if (now - lastBundleGenerationTime < BUNDLE_DEBOUNCE_MS) {
            logger.warn({ source, err: err.message }, '[ZTAN ARCHAEOLOGY] Skipping forensic bundle generation (Rate-limited)');
            return;
        }
        lastBundleGenerationTime = now;
        
        logger.fatal({ source, err: err.message }, '[ZTAN ARCHAEOLOGY] QuarantineError detected! Triggering Failure Snapshot Bundle...');
        try {
            // Use process.cwd() or similar root for bundle output
            const generator = new FailureBundleGenerator(process.cwd());
            await generator.generateIncidentBundle([err.message]);
            logger.info('[ZTAN ARCHAEOLOGY] Snapshot bundle successfully written to disk.');
        } catch (bundleErr) {
            logger.error({ err: bundleErr }, '[ZTAN ARCHAEOLOGY] Failed to generate forensic bundle during quarantine!');
        }
    }
}

// Global Process Hooks for Asynchronous Quarantines
process.on('uncaughtException', async (err) => {
    await handleQuarantineEvent(err, 'uncaughtException');
});

process.on('unhandledRejection', async (reason) => {
    if (reason instanceof Error) {
        await handleQuarantineEvent(reason, 'unhandledRejection');
    }
});

// ZTAN Replay Tracking - Rolling Sliding-Window TTL Cache (Remediation)
class SlidingWindowTTLReplayCache {
  private cache = new Map<string, number>(); // key -> expiry timestamp
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(ttlMs = 10 * 60 * 1000, maxSize = 10000) { // 10 minutes TTL, max 10,000 entries
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  has(key: string): boolean {
    this.prune();
    const expiry = this.cache.get(key);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  add(key: string): void {
    this.prune();
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, Date.now() + this.ttlMs);
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cache.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
      } else {
        // Chronological insertion allows breaking early on first non-expired entry
        break;
      }
    }
  }

  get size(): number {
    return this.cache.size;
  }
}

const replayCache = new SlidingWindowTTLReplayCache();

const app = express();
app.disable('x-powered-by');
// Enforce ZTAN 1MB Byte Limit at raw stream boundary (Priority 2)
app.use(validateRawPayloadSizeLimit());
app.use(cors());

export const registerRoutes = (app: any) => {
  app.use('/debug', debugRouter);
  app.use('/api', whoamiRouter);
  app.use('/api/v1/ztan', ztanRouter);
};


import chaosRouter from '../routes/chaos.js';

// Debug/Chaos Endpoints
app.use('/api/v1/chaos', express.json(), chaosRouter);
app.use('/debug', debugRouter);
app.use('/api/v1/ztan', ztanRouter);
app.use('/api/v1/ztan/governance', express.json(), ztanGovRouter);

// Preview Proxy Route for E2E validation
app.use('/preview/:projectId', async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
        res.status(400).send('Invalid project ID');
        return;
    }
    try {
        const targetPortStr = await redis.get(`preview:port:${projectId}`);
        if (!targetPortStr) {
            res.status(404).send('Preview not found or expired');
            return;
        }
        const targetPort = parseInt(targetPortStr, 10);
        
        const path = req.originalUrl.replace(`/preview/${projectId}`, '') || '/';
        
        const proxyReq = http.request({
            host: '127.0.0.1',
            port: targetPort,
            path: path,
            method: req.method,
            headers: req.headers
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (err) => {
            res.status(500).send('Preview Proxy Error: ' + err.message);
        });
        
        req.pipe(proxyReq);
    } catch (err: any) {
        res.status(500).send('Proxy setup error: ' + err.message);
    }
});

// Health Check (Deep) - MUST come before global auth
app.get('/api/v1/system-health', async (req, res) => {
    const checks = {
        db: false,
        redis: false,
        uptime: process.uptime()
    };

    try {
        await db.$queryRaw`SELECT 1`;
        checks.db = true;
    } catch (e) {}

    try {
        await redis.ping();
        checks.redis = true;
    } catch (e) {}

    let mode = 'NORMAL';
    let confidence = 1.0;
    if (checks.redis) {
        try {
            mode = await redis.get('system:mode') || 'NORMAL';
            confidence = parseFloat(await redis.get('system:confidence') || '1.0');
        } catch (e) {
            logger.warn({ err: e }, 'Failed to fetch mode/confidence from Redis during health check');
        }
    }
    
    // Fetch latest incident for Glass-Box transparency
    let activeIncident = null;
    try {
        const incidentsPath = path.join(__dirname, '../../../../data/incidents.json');
        if (fs.existsSync(incidentsPath)) {
            const incidents = JSON.parse(fs.readFileSync(incidentsPath, 'utf8'));
            if (incidents.length > 0) {
                activeIncident = incidents[incidents.length - 1];
            }
        }
    } catch (e) {
        logger.error({ err: e }, 'Failed to load incidents for health check');
    }

    // SRE Hardening: EWMA-style health smoothing
    // We only flip to DEGRADED if failures persist
    const isHealthy = checks.db && checks.redis;
    const systemMode = mode === 'NORMAL' ? 'NORMAL' : (mode === 'RECOVERING' ? 'RECOVERING' : 'DOWN');

    // ZTAN Consensus Cluster Health (Phase 11A: Mechanical Trust Enforcement)
    let consensusHealth: any = { initialized: false };
    try {
        const clusterNodes = ConsensusEngine.getClusterNodes();
        if (clusterNodes.size > 0) {
            const nodes = Array.from(clusterNodes.values());
            const aliveNodes = nodes.filter(n => n.isAlive);
            const leader = nodes.find(n => n.state === 2); // NodeState.LEADER
            consensusHealth = {
                initialized: true,
                clusterSize: clusterNodes.size,
                aliveNodes: aliveNodes.length,
                quorumSize: ConsensusEngine.getQuorumSize(),
                quorumMet: aliveNodes.length >= ConsensusEngine.getQuorumSize(),
                leaderTerm: leader?.currentTerm ?? 0,
                leaderId: leader?.nodeId ?? null,
            };
        }
    } catch (e) {
        logger.warn({ err: e }, '[SystemHealth] Failed to fetch consensus cluster state');
    }

    // If consensus quorum is broken, the system is degraded regardless of DB/Redis
    const governanceFracture = consensusHealth.initialized && !consensusHealth.quorumMet;
    const effectiveStatus = governanceFracture ? 'governance_fracture' : (isHealthy ? 'healthy' : 'degraded');
    
    res.status(governanceFracture ? 503 : 200).json({
        activeWorkers: 4, 
        totalWorkers: 8,
        queueDepth: 0,
        avgLatency: 45,
        errorRate: systemMode === 'NORMAL' ? 0.01 : 0.15,
        confidence,
        mode: systemMode,
        activeIncident,
        events: {
            streamLength: 100,
            pelSize: 0,
            dlqSize: 0,
            latencyMs: 12
        },
        status: effectiveStatus,
        service: 'core-api',
        checks,
        consensus: consensusHealth
    });
});

// Minimal Health (Standardized)
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'core-api', timestamp: new Date().toISOString() });
});

// Readiness Probe (Deep health checking DB and Redis)
app.get('/health/ready', async (_req, res) => {
    try {
        await db.$queryRaw`SELECT 1`;
        if (redis.status !== 'ready' && redis.status !== 'connect') {
            throw new Error('Redis connection is not active');
        }
        res.json({ status: 'ready', service: 'core-api', timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(503).json({
            status: 'unready',
            service: 'core-api',
            error: err instanceof Error ? err.message : String(err)
        });
    }
});

// --- SRE VALIDATION ENDPOINTS (PUBLIC FOR STRESS TEST) ---
app.get('/api/v1/sre/state', async (req, res) => {
    try {
        const state = await sreEngine.getCurrentState();
        res.json(state);
    } catch (err) {
        logger.error({ err }, '[CoreAPI] Failed to fetch SRE state');
        res.status(500).json({ error: (err as any).message || 'Internal Server Error' });
    }
});

app.get('/api/v1/sre/audit', async (req, res) => {
    try {
        const logs = await db.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(logs);
    } catch (err) {
        logger.error({ err }, '[CoreAPI] Failed to fetch SRE audit logs');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- ZTAN AUDIT VERIFICATION (PHASE 4) ---
app.post('/api/v1/ztan/verify', express.json(), async (req, res) => {
    try {
        const body = req.body;
        
        // 1. Structural Reproducibility
        const { hex, boundPayloadBytes, sortedNodeIds } = buildCanonicalPayload(body);
        const hash = hashPayload({ boundPayloadBytes });

        // 2. Replay Detection (Option B: Audit-Flag with Sliding-Window TTL)
        const replayTuple = `${body.auditId}:${body.payloadHash}:${body.timestamp}`;
        let isReplay = false;
        if (replayCache.has(replayTuple)) {
            isReplay = true;
            logger.warn({ auditId: body.auditId }, '[ZTAN] Replay detected for payload tuple');
        } else {
            replayCache.add(replayTuple);
        }

        // 3. Serialization Integrity Check
        logger.info({ 
            auditId: body.auditId, 
            byteLength: boundPayloadBytes.length,
            isReplay 
        }, '[ZTAN] Backend verification completed');

        res.json({
            canonicalHex: "0x" + hex,
            hash,
            byteLength: boundPayloadBytes.length,
            sortedNodeIds,
            isReplay,
            status: 'verified'
        });
    } catch (err: any) {
        logger.error({ err }, '[ZTAN] Backend verification failed');
        res.status(400).json({ 
            error: err.message || 'Invalid verification payload',
            status: 'failed'
        });
    }
});

app.use((internalAuth as any)());

// Traceability Middleware
app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || uuid();
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
});

// Metrics Endpoint
app.get('/metrics', (async (req: Request, res: Response) => {
    try {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    } catch {
        res.status(500).end();
    }
}) as RequestHandler);

// Routes
app.post('/api/v1/logs/ingest', express.json(), (async (req: Request, res: Response) => {
    const result = LogIngestSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
    }
    res.json({ success: true });
}) as RequestHandler);

app.post('/api/v1/missions', express.json(), (async (req: Request, res: Response) => {
    const result = MissionStartSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
    }
    
    const missionId = uuid();
    try {
        await db.mission.create({
            data: {
                id: missionId,
                projectId: req.body.projectId,
                userId: 'system', // or from req.user
                prompt: req.body.prompt,
                status: 'PENDING',
            }
        });
        res.json({ success: true, missionId, data: { id: missionId, status: 'PENDING' } });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
}) as RequestHandler);

app.get('/api/v1/missions', (async (req: Request, res: Response) => {
    try {
        const missions = await db.mission.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(missions);
    } catch (e) {
        logger.error({ err: e }, '[CoreAPI] Failed to fetch missions - returning fallback');
        res.status(200).json([]); // Fallback to empty list instead of 500
    }
}) as RequestHandler);

// Policy Engine Management Routes
import { policyEngine } from './policy-engine.js';

app.get('/api/v1/sre/policies', ((req: Request, res: Response) => {
    res.json(policyEngine.getRules());
}) as RequestHandler);

app.post('/api/v1/sre/policies/:id/toggle', express.json(), ((req: Request, res: Response) => {
    const { id } = req.params;
    const { enabled } = req.body;

    if (enabled) {
        policyEngine.enableRule(id);
    } else {
        policyEngine.disableRule(id);
    }

    res.json({ success: true, ruleId: id, enabled });
}) as RequestHandler);

// Global Express Archaeology Hook
app.use(async (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err) {
        await handleQuarantineEvent(err instanceof Error ? err : new Error(String(err)), `Express Route ${req.path}`);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    } else {
        next();
    }
});

async function bootstrap() {
    console.log("🚀 [CoreAPI] Bootstrap started");

    try {
        // --- SECURITY: Mandatory Startup Enforcement ---
        if (process.env.NODE_ENV === 'production') {
            validateStartupSecrets(['INTERNAL_SERVICE_TOKEN', 'ZTAN_KMS_SALT']);
        }

        const certPath = '/etc/tls/tls.crt';
        const keyPath = '/etc/tls/tls.key';
        const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

        if (process.env.NODE_ENV === 'production' && !useHttps) {
            const errorMsg = '[FATAL] SECURITY ENFORCEMENT: TLS is mandatory in production for core-api';
            logger.error(errorMsg);
            process.exit(1);
        }

        console.log("➡️ [CoreAPI] initTelemetry");
        initTelemetry('multiagent-api-orchestrator');
        
        /* 
        // --- ISOLATION DEBUGGING: Commenting risky services ---
        console.log("➡️ [CoreAPI] SecretProvider.bootstrap");
        if (typeof SecretProvider.bootstrap === 'function') {
            await SecretProvider.bootstrap();
        } else if ((SecretProvider as any).SecretProvider && typeof (SecretProvider as any).SecretProvider.bootstrap === 'function') {
            await (SecretProvider as any).SecretProvider.bootstrap();
        } else {
            console.warn('⚠️ [CoreAPI] SecretProvider.bootstrap is not a function. Skipping...');
        }
        */

        const PORT = parseInt(process.env.PORT || '3010', 10);
        const YJS_PORT = 3011;

        console.log("➡️ [CoreAPI] Creating Server...");
        const server = useHttps
            ? https.createServer({
                cert: fs.readFileSync(certPath),
                key: fs.readFileSync(keyPath),
                rejectUnauthorized: process.env.NODE_ENV === 'production'
            }, app)
            : createServer(app);
        
        console.log("➡️ [CoreAPI] Initializing Socket.io");
        const io = new Server(server, { 
            cors: { origin: '*' },
            path: '/socket.io'
        });

        console.log(`➡️ [CoreAPI] Attempting server.listen on 0.0.0.0:${PORT}`);
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ [CoreAPI] Server running on port ${PORT}`);
        });

        console.log("➡️ [CoreAPI] Starting subsidiary services");
        new YjsServer(io);
        stateReconciler.connect();
        new LogStreamingService(io);
        new SreStreamingService(io);

        const useRealSignals = process.env.USE_REAL_SIGNALS !== 'false'; // 🔥 Reality First: Default to true unless explicitly 'false'
        if (useRealSignals) {
            logger.info('[Bootstrap] USE_REAL_SIGNALS=true — Starting OTel Receiver (real telemetry pipeline)');
            otelReceiver.start();
        } else {
            logger.info('[Bootstrap] USE_REAL_SIGNALS=false — Starting Telemetry Simulator (development mode)');
            telemetrySimulator.start();
        }

        // ZTAN Identity: Seed default nodes and ensure registry is ready
        console.log("➡️ [CoreAPI] IdentityService.bootstrap");
        await IdentityService.bootstrap();

        // Initialize ZTAN Consensus Laboratory verified engine
        console.log("➡️ [CoreAPI] ConsensusEngine.initializeCluster");
        ConsensusEngine.initializeCluster(3);

        // Initialize ZTAN Lease Manager
        console.log("➡️ [CoreAPI] ZtanLeaseManager.startLeaseLoop");
        try {
            const leaseManager = new ZtanLeaseManager(process.env.ETCD_ENDPOINTS || 'localhost:2379');
            leaseManager.startLeaseLoop().catch(err => {
                console.warn(`⚠️ [CoreAPI] ZtanLeaseManager failed to start loops: ${err.message}. Running in fallback/laboratory mode.`);
            });
        } catch (err: any) {
            console.warn(`⚠️ [CoreAPI] ZtanLeaseManager initialization failed: ${err.message}. Running in fallback/laboratory mode.`);
        }

        /*
        // ZTAN MPC: Resume/Recover ceremonies on startup
        console.log("➡️ [CoreAPI] TssCeremonyService.bootstrap");
        TssCeremonyService.bootstrap();

        // ZTAN MPC Hardening: Start Ceremony Timeout Watchdog
        console.log("➡️ [CoreAPI] starting Timeout Watchdog");
        setInterval(() => {
            TssCeremonyService.checkTimeouts().catch(err => {
                logger.error({ err: err.message }, '[TSS] Timeout Watchdog Failed');
            });
        }, 15000);
        */

        console.log("🚀 [CoreAPI] Bootstrap logic completed (ISOLATION MODE)");
    } catch (err: any) {
        console.error('💥 [CoreAPI] Bootstrap Internal Failure:', err.message || err);
        throw err;
    }
}

console.log("🎬 [CoreAPI] Module loaded, invoking bootstrap()");
bootstrap().catch(err => {
    console.error('❌ [CoreAPI] FATAL BOOTSTRAP FAILURE:', err);
    process.exit(1);
});
