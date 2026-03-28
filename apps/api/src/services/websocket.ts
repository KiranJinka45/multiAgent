import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '@packages/observability';
import Redis from 'ioredis';

let io: SocketServer;

export const initWebSocket = (server: HttpServer) => {
  io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const subClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  subClient.subscribe('build-events');
  subClient.on('message', (channel, message) => {
    if (channel === 'build-events') {
      const event = JSON.parse(message);
      if (event.executionId) {
        io.to(`mission:${event.executionId}`).emit('event', event);
        // Compatibility for specific 'log' or 'status' listeners if needed
        if (event.type === 'thought') {
            io.to(`mission:${event.executionId}`).emit('log', event.message);
        }
        if (event.type === 'stage' || event.type === 'complete') {
            io.to(`mission:${event.executionId}`).emit('status', { status: event.status, stage: event.currentStage });
        }
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
