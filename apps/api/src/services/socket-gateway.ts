import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

/**
 * SocketGateway
 * 
 * A unified, horizontally-scalable WebSocket gateway for MultiAgent.
 * Consolidates build-event streaming, mission status, and collaborative sessions.
 * 
 * Features:
 * - Redis Adapter for multi-node/process scaling (Target: 10k users)
 * - Heartbeat logic for connection health
 * - Mission-scoped rooms for efficient event routing
 */
export class SocketGateway {
    private static instance: SocketGateway;
    private io: SocketServer | null = null;

    private constructor() { }

    public static getInstance(): SocketGateway {
        if (!SocketGateway.instance) {
            SocketGateway.instance = new SocketGateway();
        }
        return SocketGateway.instance;
    }

    public async initialize(server: HttpServer) {
        if (this.io) return this.io;

        logger.info('[SocketGateway] Initializing Cluster-aware WebSocket Server');

        this.io = new SocketServer(server, {
            path: '/socket.io',
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                credentials: true
            },
            transports: ['polling', 'websocket'], // Allow graceful upgrade
            allowEIO3: true,
            pingTimeout: 60000,
            pingInterval: 25000,
            maxHttpBufferSize: 1e7
        });

        // 1. Setup Redis Adapter for Scaling (DISABLED FOR LOCAL STABILIZATION)
        /*
        try {
            const pubClient = redis.duplicate();
            const subClient = redis.duplicate();
            
            pubClient.on('error', (err) => logger.error({ err }, '[SocketGateway] Redis PubClient Error'));
            subClient.on('error', (err) => logger.error({ err }, '[SocketGateway] Redis SubClient Error'));

            this.io.adapter(createAdapter(pubClient, subClient));
            logger.info('[SocketGateway] Redis Adapter integrated successfully');
        } catch (err) {
            logger.error({ err }, '[SocketGateway] Failed to initialize Redis Adapter. Falling back to local mode.');
        }
        */
        logger.info('[SocketGateway] Running in LOCAL mode (Redis cluster adapter bypassed for stability)');

        // 2. Setup Build Event Subscriber (Fan-out)
        try {
            const eventSubscriber = redis.duplicate();
            eventSubscriber.on('error', (err: any) => logger.error({ err }, '[SocketGateway] EventSubscriber Error'));
            
            // Timeout-protected subscription
            await Promise.race([
                eventSubscriber.subscribe('build-events'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Redis subscription timeout')), 5000))
            ]);
            
            eventSubscriber.on('message', (channel: string, message: string) => {
                if (channel === 'build-events' && this.io) {
                    try {
                        const event = JSON.parse(message);
                        const executionId = event.executionId || event.missionId;
                        if (executionId) {
                            this.io.to(`mission:${executionId}`).emit('event', event);
                            
                            // Legacy support for specific event types
                            if (event.type === 'thought' || event.message) {
                                this.io.to(`mission:${executionId}`).emit('log', event.message || event.text);
                            }
                        }
                    } catch (parseErr) {
                        logger.error({ err: parseErr }, '[SocketGateway] Build event parse error');
                    }
                }
            });
            logger.info('[SocketGateway] Build event subscriber active');
        } catch (err) {
            logger.error({ err }, '[SocketGateway] Failed to setup build event subscriber');
        }

        // 3. Connection Handling
        this.io.on('connection', (socket) => {
            const socketId = socket.id;
            logger.info({ socketId }, '[SocketGateway] Client connected');

            socket.on('subscribe', (missionId: string) => {
                const room = `mission:${missionId}`;
                logger.info({ socketId, missionId }, `[SocketGateway] Client joining room: ${room}`);
                socket.join(room);

                // Acknowledgment for load test validation with telemetry
                socket.emit('subscribed', { 
                    room,
                    ts: Date.now(),
                    socketId
                });
            });



            socket.on('broadcast', (payload: any) => {
                const { room } = payload;
                if (room) {
                    this.io?.to(room).emit('event', payload);
                }
            });

            socket.on('unsubscribe', (missionId: string) => {

                const room = `mission:${missionId}`;
                socket.leave(room);
            });

            socket.on('disconnect', (reason) => {
                logger.info({ socketId, reason }, '[SocketGateway] Client disconnected');
            });

            socket.on('error', (err) => {
                logger.error({ socketId, err }, '[SocketGateway] Socket error');
            });
        });

        return this.io;
    }

    public getIO(): SocketServer {
        if (!this.io) throw new Error('[SocketGateway] Gateway not initialized');
        return this.io;
    }

    public broadcast(room: string, event: string, data: any) {
        if (this.io) {
            this.io.to(room).emit(event, data);
        }
    }
}

export const socketGateway = SocketGateway.getInstance();
