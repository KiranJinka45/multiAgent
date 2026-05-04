import { redis } from "@packages/utils";
import { createHash } from "crypto";
import { logger } from "@packages/observability";

const SESSION_PREFIX = "session:v1:";
const DEFAULT_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export type SessionData = {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
    deviceInfo?: string;
    lastActiveAt: string;
};

export class RedisSessionStore {
    /**
     * Creates a new session in Redis. 
     * The token is hashed before storage to prevent plain-text leak from DB/Cache.
     */
    static async createSession(refreshToken: string, data: SessionData): Promise<void> {
        const tokenHash = this.hashToken(refreshToken);
        const key = `${SESSION_PREFIX}${tokenHash}`;
        
        await redis.set(
            key,
            JSON.stringify(data),
            "EX",
            DEFAULT_TTL
        );
        
        // Secondary index to allow revoking all sessions for a specific user
        await redis.sadd(`user:sessions:${data.userId}`, tokenHash);
        await redis.expire(`user:sessions:${data.userId}`, DEFAULT_TTL);

        logger.debug({ userId: data.userId }, "[SESSION] Created Redis session");
    }

    /**
     * Retrieves session data if valid.
     */
    static async getSession(refreshToken: string): Promise<SessionData | null> {
        const tokenHash = this.hashToken(refreshToken);
        const key = `${SESSION_PREFIX}${tokenHash}`;
        
        const data = await redis.get(key);
        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch (e) {
            logger.error({ key }, "[SESSION] Failed to parse session data");
            return null;
        }
    }

    /**
     * Revokes a specific session.
     */
    static async revokeSession(refreshToken: string): Promise<void> {
        const tokenHash = this.hashToken(refreshToken);
        const key = `${SESSION_PREFIX}${tokenHash}`;
        
        const dataStr = await redis.get(key);
        if (dataStr) {
            const data = JSON.parse(dataStr) as SessionData;
            await redis.srem(`user:sessions:${data.userId}`, tokenHash);
        }
        
        await redis.del(key);
        logger.info({ tokenHash }, "[SESSION] Revoked specific session");
    }

    /**
     * Revokes ALL sessions for a user (Security "Nuclear Option").
     */
    static async revokeAllUserSessions(userId: string): Promise<void> {
        const userSessionSetKey = `user:sessions:${userId}`;
        const tokenHashes = await redis.smembers(userSessionSetKey);
        
        if (tokenHashes.length > 0) {
            const keys = tokenHashes.map((hash: string) => `${SESSION_PREFIX}${hash}`);
            await redis.del(...keys);
        }
        
        await redis.del(userSessionSetKey);
        logger.warn({ userId, sessionCount: tokenHashes.length }, "[SECURITY] Revoked ALL user sessions");
    }

    /**
     * Rotates a session by revoking the old one and creating a new one.
     */
    static async rotateSession(oldToken: string, newToken: string, data: SessionData): Promise<void> {
        await this.revokeSession(oldToken);
        await this.createSession(newToken, data);
    }

    private static hashToken(token: string): string {
        return createHash("sha256").update(token).digest("hex");
    }
}
