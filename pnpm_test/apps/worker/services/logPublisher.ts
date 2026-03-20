import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Publishes a log message for a specific project to Redis.
 * This will be picked up by the API gateway and broadcast to connected clients via Socket.io.
 */
export async function publishLog(projectId: string, message: string, type: 'info' | 'error' | 'success' = 'info') {
  try {
    await redis.publish(
      `logs:${projectId}`,
      JSON.stringify({
        message,
        type,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.error(`Failed to publish log for project ${projectId}:`, err);
  }
}
