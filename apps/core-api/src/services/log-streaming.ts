import { Server, Socket } from 'socket.io';
import { eventBus } from '@packages/utils';
import { logger } from '@packages/observability';

export class LogStreamingService {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
        this.setupSubscriptions();
    }

    private setupSubscriptions() {
        this.io.on('connection', (socket: Socket) => {
            socket.on('subscribe:logs', (missionId: string) => {
                if (!missionId) return;
                
                logger.info({ missionId, socketId: socket.id }, '[Socket] Client subscribed to mission logs');
                socket.join(`mission:${missionId}`);

                // Send a confirmation back to the client
                socket.emit('subscription:ready', { missionId, room: `mission:${missionId}` });

                // Start polling/reading the Redis Stream for this mission
                this.pollStream(missionId);
            });

            socket.on('disconnect', () => {
                logger.debug({ socketId: socket.id }, '[Socket] Client disconnected');
            });

            // Phase 1: REPLAY LOGIC
            socket.on('replay-events', async ({ buildId, lastId }: { buildId: string, lastId: string }) => {
                if (!buildId) return;
                
                logger.info({ buildId, lastId, socketId: socket.id }, '[Socket] Replay requested');
                
                try {
                    // Check stream bounds for gap detection
                    const streamKey = `build:stream:${buildId}`;
                    const bus = (eventBus as any).getInternalBus?.() || (await import('@packages/events')).eventBus;
                    
                    // Get the oldest available entry
                    const oldestEntries = await bus.redis.xrange(streamKey, '-', '+', 'COUNT', 1).catch(() => []);
                    const oldestId = oldestEntries?.[0]?.[0] || '0-0';

                    socket.emit('replay-summary', { 
                        buildId, 
                        oldestId
                    });

                    // Read from Redis Stream starting from lastId
                    const events = await eventBus.readBuildEvents(buildId, lastId, 50);
                    
                    if (events && events.length > 0) {
                        for (const [id, eventData] of events) {
                            const event = typeof eventData === 'string' ? { message: eventData } : { ...eventData };
                            event._sequence = id;
                            event.timestamp = event.timestamp || new Date().toISOString();
                            
                            // Send directly to the requesting socket (not the whole room)
                            socket.emit(event.type || 'progress', event);
                        }
                        logger.info({ buildId, count: events.length }, '✅ Replay delivered');
                    } else {
                        logger.info({ buildId, lastId }, 'ℹ️ No new events for replay');
                    }
                } catch (err) {
                    logger.error({ err, buildId }, '❌ Replay failed');
                }
            });
        });
    }

    private async pollStream(missionId: string) {
        let lastId = '0'; // Start from beginning for new connection
        const seenIds = new Set<string>(); // De-duplication cache
        
        // Track the interval to allow cleanup
        const intervalId = setInterval(async () => {
            try {
                const events = await eventBus.readBuildEvents(missionId, lastId, 10);
                
                if (events && events.length > 0) {
                    for (const [id, eventData] of events) {
                        if (seenIds.has(id)) continue;
                        
                        // Enrich event with distributed metadata (Phase 14)
                        const event = typeof eventData === 'string' ? { message: eventData } : { ...eventData };
                        event.eventId = id;
                        event.timestamp = event.timestamp || Date.now();
                        event.sequence = parseInt(id.split('-')[1] || '0', 10);

                        this.io.to(`mission:${missionId}`).emit('log_event', event);
                        this.io.to(`mission:${missionId}`).emit('mission:log', event);
                        
                        seenIds.add(id);
                        lastId = id;

                        // Maintain sliding window (max 1000 items)
                        if (seenIds.size > 1000) {
                            const first = seenIds.values().next().value;
                            if (first) seenIds.delete(first);
                        }
                    }
                }

                // Stop polling if mission room is empty
                const room = this.io.sockets.adapter.rooms.get(`mission:${missionId}`);
                if (!room || room.size === 0) {
                    clearInterval(intervalId);
                    logger.debug({ missionId }, '[Socket] Stopped polling: No active subscribers');
                }
            } catch (err) {
                logger.error({ err, missionId }, '[Socket] Error polling logs');
                clearInterval(intervalId);
            }
        }, 500); // 500ms for enterprise-grade responsiveness
    }
}

