import express from 'express';
import { db as prisma } from '@packages/db';
import { logger } from '@packages/observability';
import crypto from 'crypto';
import { ThresholdCrypto } from '@packages/ztan-crypto';
import { MerkleTree } from '@packages/supply-chain';

function stableStringify(obj: any): string {
    if (obj === null) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) {
        return '[' + obj.map(stableStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    let str = '{';
    for (let i = 0; i < keys.length; i++) {
        if (i > 0) str += ',';
        str += JSON.stringify(keys[i]) + ':' + stableStringify(obj[keys[i]]);
    }
    str += '}';
    return str;
}

export async function startServer() {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json());

    app.post('/api/v1/events', async (req, res) => {
        try {
            const { eventType, correlationId, actor, service, riskLevel, payload } = req.body;

            if (!eventType || !correlationId || !payload) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Find previous event for this correlationId to link them
            const prevEvent = await prisma.governanceEvent.findFirst({
                where: { correlationId },
                orderBy: { timestamp: 'desc' }
            });

            const parentEventId = prevEvent ? prevEvent.eventId : null;
            const previousEventHash = prevEvent ? prevEvent.currentEventHash : null;

            const payloadString = stableStringify(payload);
            const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

            // Construct data to hash for currentEventHash
            // Includes previous hash to create the immutable chain
            const hashData = `${eventType}:${correlationId}:${parentEventId}:${payloadHash}:${previousEventHash || 'GENESIS'}`;
            const currentEventHash = crypto.createHash('sha256').update(hashData).digest('hex');

            const event = await prisma.governanceEvent.create({
                data: {
                    eventType,
                    correlationId,
                    parentEventId,
                    actor: actor || 'system',
                    service: service || 'unknown',
                    riskLevel,
                    payloadHash,
                    payload: payloadString,
                    previousEventHash,
                    currentEventHash,
                    signature: null // Not doing actual key signing yet
                }
            });

            logger.info(`[GovernanceLedger] Appended event ${eventType} for ${correlationId}`);
            res.status(201).json(event);
        } catch (err: any) {
            logger.error(`[GovernanceLedger] Error appending event: ${err.message}`);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/v1/events/:correlationId', async (req, res) => {
        try {
            const { correlationId } = req.params;
            const events = await prisma.governanceEvent.findMany({
                where: { correlationId },
                orderBy: { timestamp: 'asc' }
            });
            res.status(200).json({ events });
        } catch (err: any) {
            logger.error(`[GovernanceLedger] Error fetching events: ${err.message}`);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // ─── Detached Witness Attestation & BLS Aggregation ───
    app.post('/api/v1/witness/co-sign', async (req, res): Promise<any> => {
        try {
            const { receipt } = req.body;

            if (!receipt || !receipt.signature) {
                return res.status(400).json({ error: 'Missing receipt or supervisor signature' });
            }

            // 1. Independently rebuild Merkle Tree and verify root matching
            const artifacts = receipt.artifactMerkleManifest?.artifacts || [];
            const computedMerkle = MerkleTree.buildMerkleTree(artifacts);
            if (computedMerkle.rootHash !== receipt.artifactMerkleRoot) {
                logger.error('[Witness] Verification failed: Merkle root mismatch');
                return res.status(422).json({ error: 'Merkle root mismatch' });
            }

            // 2. Independently verify the supervisor's BLS signature
            const canonicalString = `${receipt.schemaVersion}:${receipt.executionId}:${receipt.sandboxTier}:${receipt.capabilityManifestHash}:${receipt.policyHash}:${receipt.resourceOutcome}:${receipt.terminationReason}:${receipt.environmentFingerprint.fingerprintHash}:${receipt.dependencyProvenance.sbomHash}:${receipt.artifactMerkleRoot}`;
            const receiptHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

            const supervisorVerified = await ThresholdCrypto.verifyPartialSignature(
                receiptHash,
                receipt.signature,
                'RUNTIME-NODE-01'
            );

            if (!supervisorVerified) {
                logger.error('[Witness] Verification failed: Invalid supervisor signature');
                return res.status(422).json({ error: 'Invalid supervisor signature' });
            }

            // 3. Detached Witness signs using identity SEC-GOV-01
            const witnessSignature = await ThresholdCrypto.signAnchor(receiptHash, 'SEC-GOV-01');

            // 4. Aggregate both signatures
            const aggregateSignature = await ThresholdCrypto.aggregateSignatures([
                receipt.signature,
                witnessSignature
            ]);

            logger.info(`[Witness] Successfully co-signed receipt for ${receipt.executionId}`);
            res.status(200).json({
                status: 'CO_SIGNED',
                aggregateSignature
            });
        } catch (err: any) {
            logger.error(`[Witness] Error during co-signing: ${err.message}`);
            res.status(500).json({ error: err.message });
        }
    });

    const port = process.env.PORT || 3105;
    app.listen(port, () => {
        logger.info(`[GovernanceLedger] Listening on port ${port}`);
    });
}
