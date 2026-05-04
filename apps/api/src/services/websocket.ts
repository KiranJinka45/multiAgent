// @ts-ignore
import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

let io: SocketServer;

export const initWebSocket = (server: HttpServer) => {
  io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Dedicated subscriber client from the canonical redis proxy
  const subClient = redis.duplicate();
  subClient.subscribe('build-events');
  subClient.on('message', (channel: string, message: string) => {
    if (channel === 'build-events') {
      try {
        const event = JSON.parse(message);
        const executionId = event.executionId || event.missionId;
        
        if (executionId) {
          io.to(`mission:${executionId}`).emit('event', event);
          
          // Compatibility for specific 'log' or 'status' listeners
          if (event.type === 'thought') {
              io.to(`mission:${executionId}`).emit('log', event.message);
          }
          if (event.type === 'stage' || event.type === 'complete') {
              io.to(`mission:${executionId}`).emit('status', { 
                  status: event.status, 
                  stage: event.currentStage || event.stage 
              });
          }
        }
      } catch (err) {
        logger.error({ err }, '[WebSocket] Failed to parse build-event message');
      }
    }
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, '[WebSocket] Client connected');

    socket.on('subscribe', (missionId: string) => {
      logger.info({ socketId: socket.id, missionId }, '[WebSocket] Subscribing to mission');
      socket.join(`mission:${missionId}`);
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, '[WebSocket] Client disconnected');
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('WebSocket IO not initialized');
  }
  return io;
};

export const emitLog = (missionId: string, log: any) => {
  if (io) {
    io.to(`mission:${missionId}`).emit('log', log);
  }
};

export const emitStatus = (missionId: string, status: string, data: any = {}) => {
  if (io) {
    io.to(`mission:${missionId}`).emit('status', { status, ...data });
  }
};

