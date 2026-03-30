import Redis from 'ioredis';
import { logger } from '@packages/utils';

export class AICache {
  private redis: Redis;
  private ttl: number = 3600; // 1 hour

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async get(message: string): Promise<string | null> {
    try {
      const key = `ai:cache:${Buffer.from(message).toString('base64').substring(0, 100)}`;
      return await this.redis.get(key);
    } catch (err) {
      logger.error('AI Cache GET failed', err);
      return null;
    }
  }

  async set(message: string, response: string): Promise<void> {
    try {
      const key = `ai:cache:${Buffer.from(message).toString('base64').substring(0, 100)}`;
      await this.redis.set(key, response, 'EX', this.ttl);
    } catch (err) {
      logger.error('AI Cache SET failed', err);
    }
  }
}

export const aiCache = new AICache();
