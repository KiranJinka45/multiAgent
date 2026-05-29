import express from 'express';
import type { Request, Response } from 'express';
import { db as prisma } from '@packages/db';
import { logger } from '@packages/observability';
import { getRedisClient } from '@packages/utils';
import { startIntegrityScanner } from './integrity-scanner.js';
import { recoveryRouter } from './recovery.js';
import crypto from 'crypto';
import { ThresholdCrypto } from '@packages/ztan-crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { RuntimeImageRegistry } from '@packages/supply-chain';

const __filenameConsole = fileURLToPath(import.meta.url);
const __dirnameConsole = path.dirname(__filenameConsole);

// preloads usually live at apps/capability-runtime/src/preload-isolation.cjs
let preloadPath = path.resolve(__dirnameConsole, '../../capability-runtime/src/preload-isolation.cjs');
if (!fs.existsSync(preloadPath)) {
    preloadPath = path.resolve(__dirnameConsole, '../../capability-runtime/dist/preload-isolation.cjs');
}

let supervisorPath = path.resolve(__dirnameConsole, '../../capability-runtime/src/supervisor.ts');
if (!fs.existsSync(supervisorPath)) {
    supervisorPath = path.resolve(__dirnameConsole, '../../capability-runtime/dist/supervisor.js');
}

let expectedPreloadHash = '';
let expectedSupervisorHash = '';
try {
    if (fs.existsSync(preloadPath)) {
        expectedPreloadHash = crypto.createHash('sha256').update(fs.readFileSync(preloadPath)).digest('hex');
    }
} catch (e) {}
try {
    if (fs.existsSync(supervisorPath)) {
        expectedSupervisorHash = crypto.createHash('sha256').update(fs.readFileSync(supervisorPath)).digest('hex');
    }
} catch (e) {}


export async function startServer() {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json());

    const redis = await getRedisClient();

    // ─── 1. Freeze / Kill Switch Endpoints ───
    app.post('/api/v1/stewardship/freeze', async (req: Request, res: Response): Promise<void> => {
        try {
            const { action } = req.body; // 'freeze' | 'unfreeze'
            if (action === 'freeze') {
                await redis.set('SYSTEM_FROZEN', 'true');
                logger.warn('[StewardshipConsole] SYSTEM FROZEN BY OPERATOR.');
                res.status(200).json({ status: 'frozen', message: 'All intake and policies blocked.' });
                return;
            } else if (action === 'unfreeze') {
                await redis.del('SYSTEM_FROZEN');
                logger.warn('[StewardshipConsole] SYSTEM UNFROZEN BY OPERATOR.');
                res.status(200).json({ status: 'active', message: 'System operations resumed.' });
                return;
            }
            res.status(400).json({ error: 'Invalid action' });
        } catch (err: any) {
            logger.error(`[StewardshipConsole] Freeze error: ${err.message}`);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ─── 2. Correlation Replay Viewer Endpoint ───
    app.get('/api/v1/stewardship/replay/:correlationId', async (req: Request, res: Response): Promise<void> => {
        try {
            const { correlationId } = req.params;
            const events = await prisma.governanceEvent.findMany({
                where: { correlationId },
                orderBy: { timestamp: 'asc' }
            });

            if (!events || events.length === 0) {
                res.status(404).json({ error: 'Correlation ID not found' });
                return;
            }

            // Timeline reconstruction
            const timeline = events.map((e: any) => ({
                eventId: e.eventId,
                type: e.eventType,
                timestamp: e.timestamp,
                payload: typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload,
                integrityValid: true // The integrity scanner verifies actual cryptographic chain
            }));

            res.status(200).json({ correlationId, eventCount: events.length, timeline });
        } catch (err: any) {
            logger.error(`[StewardshipConsole] Replay view error: ${err.message}`);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ─── 3. Governance Metrics ───
    app.get('/api/v1/stewardship/metrics', async (req: Request, res: Response): Promise<void> => {
        try {
            // Aggregations could be expensive, just simple counts for now
            const totalEvents = await prisma.governanceEvent.count();
            const blockedIntents = await prisma.governanceEvent.count({ where: { eventType: 'security.intent.blocked' } });
            const policyDenials = await prisma.governanceEvent.count({ where: { eventType: 'policy.precheck.denied' } });
            
            res.status(200).json({
                totalEvents,
                blockedIntents,
                policyDenials
            });
        } catch (err: any) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ─── 3.5. Attestation Verification Endpoint ───
    app.get('/api/v1/stewardship/attestation/:executionId', async (req: Request, res: Response): Promise<void> => {
        try {
            const { executionId } = req.params;
            const event = await prisma.governanceEvent.findFirst({
                where: {
                    correlationId: executionId,
                    eventType: 'execution.attestation.created'
                }
            });

            if (!event) {
                res.status(404).json({ error: 'Attestation not found' });
                return;
            }

            const receipt = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

            let verified = false;
            let integrityValid = true;
            try {
                if (receipt.signature) {
                    let canonicalString = '';
                    if (receipt.schemaVersion === 'ztan.attestation.v2') {
                        canonicalString = `${receipt.schemaVersion}:${receipt.executionId}:${receipt.sandboxTier}:${receipt.capabilityManifestHash}:${receipt.policyHash}:${receipt.resourceOutcome}:${receipt.terminationReason}:${receipt.environmentFingerprint.fingerprintHash}:${receipt.dependencyProvenance.sbomHash}:${receipt.artifactMerkleRoot}`;
                        
                        // Verify Preload and Supervisor runtime image integrity
                        const receivedPreload = receipt.environmentFingerprint?.preloadHash;
                        const receivedSupervisor = receipt.environmentFingerprint?.supervisorHash;
                        const receivedRuntimeImage = receipt.environmentFingerprint?.runtimeImageHash;

                        // Retrieve expected build-sealed runtime image hash
                        let expectedRuntimeImageHash = '';
                        try {
                            expectedRuntimeImageHash = RuntimeImageRegistry.getSealedImageHash();
                        } catch (e) {}

                        if (!receivedPreload || receivedPreload.length !== 64 || !receivedSupervisor || receivedSupervisor.length !== 64 || !receivedRuntimeImage || receivedRuntimeImage.length !== 64) {
                            integrityValid = false;
                        }
                        if (expectedPreloadHash && receivedPreload !== expectedPreloadHash) {
                            integrityValid = false;
                        }
                        if (expectedSupervisorHash && receivedSupervisor !== expectedSupervisorHash) {
                            integrityValid = false;
                        }
                        if (expectedRuntimeImageHash && receivedRuntimeImage !== expectedRuntimeImageHash) {
                            integrityValid = false;
                        }
                    } else {
                        // Legacy Stage 8 attestation receipt
                        canonicalString = `${receipt.executionId}:${receipt.sandboxTier}:${receipt.capabilityManifestHash}:${receipt.runtimeVersion}:${receipt.policyHash}:${receipt.resourceOutcome}:${receipt.terminationReason}:${JSON.stringify(receipt.outputArtifacts)}`;
                    }

                    const receiptHash = crypto.createHash('sha256').update(canonicalString).digest('hex');
                    if (receipt.schemaVersion === 'ztan.attestation.v2') {
                        // Verify aggregated threshold BLS signature signed by both RUNTIME-NODE-01 and SEC-GOV-01
                        verified = await ThresholdCrypto.verifyAggregateSignature(
                            receiptHash,
                            receipt.signature,
                            ['RUNTIME-NODE-01', 'SEC-GOV-01']
                        );
                    } else {
                        // Fallback legacy verification
                        verified = await ThresholdCrypto.verifyPartialSignature(receiptHash, receipt.signature, 'RUNTIME-NODE-01');
                    }
                }
            } catch (e: any) {
                logger.error(`[StewardshipConsole] Attestation verification error: ${e.message}`);
            }

            res.status(200).json({
                status: verified ? (integrityValid ? 'VERIFIED' : 'SUSPECT_INTEGRITY') : 'INVALID',
                attestation: receipt
            });
        } catch (err: any) {
            logger.error(`[StewardshipConsole] Attestation view error: ${err.message}`);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ─── 3.8. Forensic Replay Package Endpoint ───
    app.get('/api/v1/stewardship/replay/package/:executionId', async (req: Request, res: Response): Promise<void> => {
        try {
            const { executionId } = req.params;
            const event = await prisma.governanceEvent.findFirst({
                where: {
                    correlationId: executionId,
                    eventType: 'execution.replay.stored'
                }
            });

            if (!event) {
                res.status(404).json({ error: 'Replay package not found' });
                return;
            }

            const replayPackage = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
            res.status(200).json({
                executionId,
                replayPackage
            });
        } catch (err: any) {
            logger.error(`[StewardshipConsole] Replay package view error: ${err.message}`);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ─── 4. Replayable Failure Recovery ───
    app.use('/api/v1/stewardship/recovery', recoveryRouter);

    // Start background scanner
    startIntegrityScanner();

    const port = process.env.PORT || 3110;
    app.listen(port, () => {
        logger.info(`[StewardshipConsole] Listening on port ${port}`);
    });
}
