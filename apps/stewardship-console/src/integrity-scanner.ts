import { db as prisma } from '@packages/db';
import { logger } from '@packages/observability';
import crypto from 'crypto';

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

export function startIntegrityScanner() {
    logger.info('[StewardshipConsole] Governance Integrity Scanner scheduled (every 1 minute)');

    setInterval(async () => {
        try {
            // Find all unique correlation IDs
            const distinctEvents = await prisma.governanceEvent.findMany({
                distinct: ['correlationId'],
                select: { correlationId: true }
            });

            let driftDetected = 0;

            for (const { correlationId } of distinctEvents) {
                const events = await prisma.governanceEvent.findMany({
                    where: { correlationId },
                    orderBy: { timestamp: 'asc' }
                });

                let previousHash = 'GENESIS';
                let previousEventId: string | null = null;

                for (let i = 0; i < events.length; i++) {
                    const event = events[i];

                    // 1. Lineage Linkage Check
                    if (event.parentEventId !== previousEventId) {
                        logger.error(`[IntegrityScanner] Lineage drift detected on correlationId ${correlationId}, event ${event.eventId}. Parent ID mismatch.`);
                        driftDetected++;
                        break;
                    }
                    if (event.previousEventHash !== (previousHash === 'GENESIS' ? null : previousHash)) {
                        logger.error(`[IntegrityScanner] Hash chain drift detected on correlationId ${correlationId}, event ${event.eventId}. Previous hash mismatch.`);
                        driftDetected++;
                        break;
                    }

                    // 2. Re-compute payload hash
                    let parsedPayload;
                    try {
                        parsedPayload = JSON.parse(event.payload);
                    } catch (_e) {
                        parsedPayload = event.payload; // Already string or invalid
                    }
                    
                    const canonicalPayload = stableStringify(parsedPayload);
                    const computedPayloadHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
                    if (computedPayloadHash !== event.payloadHash) {
                        logger.error(`[IntegrityScanner] Payload tampering detected on correlationId ${correlationId}, event ${event.eventId}.`);
                        driftDetected++;
                        break;
                    }

                    // 3. Re-compute event hash
                    const hashData = `${event.eventType}:${event.correlationId}:${event.parentEventId}:${event.payloadHash}:${event.previousEventHash || 'GENESIS'}`;
                    const computedEventHash = crypto.createHash('sha256').update(hashData).digest('hex');
                    if (computedEventHash !== event.currentEventHash) {
                        logger.error(`[IntegrityScanner] Event hash tampering detected on correlationId ${correlationId}, event ${event.eventId}.`);
                        driftDetected++;
                        break;
                    }

                    previousHash = event.currentEventHash;
                    previousEventId = event.eventId;
                }
            }

            if (driftDetected > 0) {
                logger.error(`[IntegrityScanner] Scan completed. 🚨 ${driftDetected} CORRELATION CHAINS COMPROMISED.`);
            } else {
                logger.info(`[IntegrityScanner] Scan completed. ${distinctEvents.length} chains verified cryptographically sound.`);
            }

        } catch (err: any) {
            logger.error(`[IntegrityScanner] Error running background job: ${err.message}`);
        }
    }, 60000).unref(); // Run every 60s
}
