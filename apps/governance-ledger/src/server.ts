import express from 'express';
import { db as prisma } from '@packages/db';
import { logger } from '@packages/observability';
import crypto from 'crypto';

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

            const payloadString = JSON.stringify(payload);
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

    const port = process.env.PORT || 3105;
    app.listen(port, () => {
        logger.info(`[GovernanceLedger] Listening on port ${port}`);
    });
}
