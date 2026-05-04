import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';

const mocks = vi.hoisted(() => {
    class MockPrismaClient {
        $connect = vi.fn(async () => undefined);
        $disconnect = vi.fn(async () => undefined);
        user = {
            findMany: vi.fn(async () => []),
        };
    }
    return {
        apiRequestDurationSeconds: {
            startTimer: vi.fn(() => vi.fn()),
        },
        registry: {
            contentType: 'text/plain',
            metrics: vi.fn(async () => ''),
        },
        redis: {
            get: vi.fn(async () => null),
            set: vi.fn(async () => 'OK'),
        },
        db: new MockPrismaClient(),
        verifyConnection: vi.fn(async () => true),
        PrismaClient: MockPrismaClient,
    };
});

// Mock dependencies
vi.mock('@packages/utils', () => mocks);
vi.mock('@packages/db', () => mocks);

describe('API Integration Tests', () => {
    describe('GET /health', () => {
        it('should return 200 OK with service status', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(expect.objectContaining({
                status: 'ok',
                service: 'multiagent-api'
            }));
        });
    });

    describe('GET /', () => {
        it('should return the root greeting', async () => {
            const response = await request(app).get('/');
            expect(response.status).toBe(200);
            expect(response.text).toContain('MultiAgent API Running ✅');
        });
    });

    describe('GET /metrics', () => {
        it('should return metrics with correct content type', async () => {
            const response = await request(app).get('/metrics');
            expect(response.status).toBe(200);
            expect(response.header['content-type']).toContain('text/plain');
        });
    });
});

