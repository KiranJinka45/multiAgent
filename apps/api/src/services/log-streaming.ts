import { Server } from 'socket.io';
import { eventBus } from '@libs/utils/server';
import { logger } from '@libs/observability';

/**
 * LogStreamingService
 * 
 * Bridges the Redis Stream events to Socket.io clients.
 * Allows the frontend to receive real-time updates for:
 * 1. Agent thoughts/logs
 * 2. Progress updates
 * 3. File change notifications
 */
export class LogStreamingService {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
        this.setupSubscriptions();
    }

    private setupSubscriptions() {
        this.io.on('connection', (socket) => {
            const missionId = socket.handshake.query.missionId as string;
            
            if (missionId) {
                logger.info({ missionId, socketId: socket.id }, '[Socket] Client subscribed to mission logs');
                socket.join(`mission:${missionId}`);

                // Polling the Redis Stream for this mission
                this.pollStream(missionId);
            }

            socket.on('disconnect', () => {
                logger.debug({ socketId: socket.id }, '[Socket] Client disconnected');
            });
        });
    }

    private async pollStream(missionId: string) {
        let lastId = '0'; // Start from beginning for new connection or '$' for new only
        
        const interval = setInterval(async () => {
            const events = await eventBus.readBuildEvents(missionId, lastId, 1000);
            
            if (events && events.length > 0) {
                for (const [id, event] of events) {
                    this.io.to(`mission:${missionId}`).emit('log_event', event);
                    lastId = id;
                }
            }

            // Stop polling if mission is complete or client disconnected
            const room = this.io.sockets.adapter.rooms.get(`mission:${missionId}`);
            if (!room || room.size === 0) {
                clearInterval(interval);
                logger.debug({ missionId }, '[Socket] Stopped polling: No active subscribers');
            }
        }, 1000);
    }
}
