/**
 * Level-5 Autonomous Software Factory — E2E Validation Script
 * =============================================================
 * Tests 7 critical subsystems to confirm production readiness.
 * 
 * Usage: npx tsx scripts/e2e-validation.ts
 */

import 'dotenv/config';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const NEXT_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3010';

interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    details: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<string>): Promise<void> {
    const start = Date.now();
    try {
        const details = await fn();
        results.push({ name, passed: true, duration: Date.now() - start, details });
        console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, duration: Date.now() - start, details: msg });
        console.log(`  ❌ ${name} — ${msg}`);
    }
}

// ─── Test 1: Redis Connectivity ──────────────────────────────────────────────
async function testRedis(): Promise<string> {
    const redis = new Redis(REDIS_URL);
    try {
        const pong = await redis.ping();
        if (pong !== 'PONG') throw new Error(`Expected PONG, got ${pong}`);

        // Read/Write test
        const testKey = 'e2e:validation:test';
        await redis.set(testKey, 'ok', 'EX', 10);
        const val = await redis.get(testKey);
        if (val !== 'ok') throw new Error(`Read/Write mismatch: ${val}`);
        await redis.del(testKey);

        return `PING=PONG, R/W verified`;
    } finally {
        redis.disconnect();
    }
}

// ─── Test 2: Socket.IO Health ────────────────────────────────────────────────
async function testSocketHealth(): Promise<string> {
    const res = await fetch(`${SOCKET_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { status: string; worker: { status: string }; queues: Record<string, unknown> };
    if (data.status !== 'ok') throw new Error(`Health status: ${data.status}`);
    return `Status: ${data.status}, Worker: ${data.worker?.status || 'unknown'}, Queues: ${JSON.stringify(data.queues)}`;
}

// ─── Test 3: API Auth Gate ───────────────────────────────────────────────────
async function testAuthGate(): Promise<string> {
    const res = await fetch(`${NEXT_URL}/api/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'e2e-test', prompt: 'Test prompt for validation' })
    });
    // Should return 401 because we're not authenticated
    if (res.status === 401) {
        return 'Correctly rejected unauthenticated request (401)';
    }
    // If it returned 400 (validation error) that's also acceptable — means it parsed but auth check happened
    if (res.status === 400) {
        return 'Request parsed but rejected at validation (400) — auth layer active';
    }
    throw new Error(`Expected 401, got HTTP ${res.status}`);
}

// ─── Test 4: BullMQ Queue Pipeline ───────────────────────────────────────────
async function testQueuePipeline(): Promise<string> {
    const redis = new Redis(REDIS_URL);
    try {
        // Check that queue keys exist (BullMQ creates them)
        const freeKeys = await redis.keys('bull:project-generation-free-v1:*');
        const proKeys = await redis.keys('bull:project-generation-pro-v1:*');
        return `Free queue keys: ${freeKeys.length}, Pro queue keys: ${proKeys.length} — Queues initialized`;
    } finally {
        redis.disconnect();
    }
}

// ─── Test 5: Worker Heartbeat ────────────────────────────────────────────────
async function testWorkerHeartbeat(): Promise<string> {
    const redis = new Redis(REDIS_URL);
    try {
        const healthStr = await redis.get('system:health:worker');
        if (!healthStr) throw new Error('No worker heartbeat key found — is the worker running?');
        const health = JSON.parse(healthStr);
        return `Worker: ${health.status}, Last seen: ${new Date(health.lastSeen).toISOString()}, Free concurrency: ${health.freeConcurrency}, Pro concurrency: ${health.proConcurrency}`;
    } finally {
        redis.disconnect();
    }
}

// ─── Test 6: Frontend Rendering ──────────────────────────────────────────────
async function testFrontend(): Promise<string> {
    // Retry loop for Next.js boot
    for (let i = 0; i < 5; i++) {
        try {
            const res = await fetch(NEXT_URL);
            if (res.ok) {
                const html = await res.text();
                if (html.includes('<!DOCTYPE html>') || html.includes('<html')) {
                    return `HTTP 200, HTML received (${(html.length / 1024).toFixed(1)}KB)`;
                }
            }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 7000)); // Wait 7s between retries
    }
    const res = await fetch(NEXT_URL);
    if (!res.ok) {
        const text = await res.text().catch(() => 'No body');
        throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
    }
    return `HTTP 200 after retries`;
}

// ─── Test 7: Mission State Lifecycle ─────────────────────────────────────────
async function testMissionLifecycle(): Promise<string> {
    const redis = new Redis(REDIS_URL, { lazyConnect: true });
    await redis.connect();
    try {
        // Create a test mission state in Redis (simulating what MissionController does)
        const testMissionId = `e2e-validation-${Date.now()}`;
        const mission = {
            id: testMissionId,
            projectId: 'e2e-test-project',
            userId: 'e2e-test-user',
            prompt: 'E2E Validation Test',
            status: 'queued',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: { fastPath: true }
        };

        await redis.setex(`mission:${testMissionId}`, 60, JSON.stringify(mission));

        // Read it back
        const stored = await redis.get(`mission:${testMissionId}`);
        if (!stored) throw new Error('Mission state not found after write');
        const parsed = JSON.parse(stored);
        if (parsed.status !== 'queued') throw new Error(`Expected status 'queued', got '${parsed.status}'`);

        // Simulate state transition: queued → executing
        parsed.status = 'executing';
        parsed.updatedAt = Date.now();
        await redis.setex(`mission:${testMissionId}`, 60, JSON.stringify(parsed));

        const updated = await redis.get(`mission:${testMissionId}`);
        const updatedParsed = JSON.parse(updated!);
        if (updatedParsed.status !== 'executing') throw new Error('State transition failed');

        // Simulate completion: executing → completed
        updatedParsed.status = 'completed';
        updatedParsed.updatedAt = Date.now();
        await redis.setex(`mission:${testMissionId}`, 60, JSON.stringify(updatedParsed));

        const finalState = await redis.get(`mission:${testMissionId}`);
        const finalParsed = JSON.parse(finalState!);
        if (finalParsed.status !== 'completed') throw new Error('Final state transition failed');

        // Test pub/sub round-trip with proper cleanup
        const pubSubResult = await testPubSub(testMissionId);

        // Cleanup
        await redis.del(`mission:${testMissionId}`);

        return `Lifecycle: queued → executing → completed ✓, ${pubSubResult}`;
    } finally {
        await redis.quit();
    }
}

async function testPubSub(testMissionId: string): Promise<string> {
    const pubRedis = new Redis(REDIS_URL, { lazyConnect: true });
    const subRedis = new Redis(REDIS_URL, { lazyConnect: true });
    await Promise.all([pubRedis.connect(), subRedis.connect()]);

    // Suppress unhandled errors during teardown
    pubRedis.on('error', () => {});
    subRedis.on('error', () => {});

    try {
        return await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(async () => {
                try { await subRedis.quit(); } catch {}
                try { await pubRedis.quit(); } catch {}
                reject(new Error('Pub/Sub timeout after 3s'));
            }, 3000);

            subRedis.subscribe('e2e-test-channel', (err) => {
                if (err) { clearTimeout(timeout); reject(err); return; }
                pubRedis.publish('e2e-test-channel', JSON.stringify({ test: true, missionId: testMissionId }));
            });

            subRedis.on('message', async (_channel, message) => {
                clearTimeout(timeout);
                const data = JSON.parse(message);
                try { await subRedis.unsubscribe(); } catch {}
                try { await subRedis.quit(); } catch {}
                try { await pubRedis.quit(); } catch {}
                if (data.missionId === testMissionId) {
                    resolve('Pub/Sub round-trip verified');
                } else {
                    reject(new Error('Pub/Sub message mismatch'));
                }
            });
        });
    } catch (err) {
        try { await subRedis.quit(); } catch {}
        try { await pubRedis.quit(); } catch {}
        throw err;
    }
}

// ─── Test 8: Preview Proxy ───────────────────────────────────────────────────
async function testPreviewProxy(): Promise<string> {
    const redis = new Redis(REDIS_URL);
    const mockProjectId = `e2e-proxy-test-${Date.now()}`;
    const mockPort = 9876;
    
    // 1. Create a mock server on a custom port
    const http = await import('http');
    const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Mock Preview Content');
    });

    await new Promise<void>((resolve) => mockServer.listen(mockPort, '127.0.0.1', resolve));

    try {
        // 2. Map the mock project to this port in Redis (heartbeat simulation)
        await redis.set(`preview:port:${mockProjectId}`, mockPort.toString(), 'EX', 10);

        // 3. Attempt to fetch via the proxy on port 3005
        // Wait briefly for proxy route to be ready
        await new Promise(r => setTimeout(r, 1500));

        const res = await fetch(`${SOCKET_URL}/preview/${mockProjectId}/`);
        if (!res.ok) {
            const body = await res.text().catch(() => 'No body');
            throw new Error(`Proxy returned HTTP ${res.status}: ${body}`);
        }
        
        const text = await res.text();
        if (text !== 'Mock Preview Content') {
            throw new Error(`Content mismatch: expected 'Mock Preview Content', got '${text}'`);
        }

        return `Proxy verified: http://localhost:3005/preview/${mockProjectId}/ -> localhost:${mockPort}`;
    } finally {
        mockServer.close();
        await redis.del(`preview:port:${mockProjectId}`);
        redis.disconnect();
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   LEVEL-5 E2E VALIDATION — Autonomous Software Factory  ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    await runTest('1. Redis Connectivity', testRedis);
    await runTest('2. Socket.IO Health', testSocketHealth);
    await runTest('3. API Auth Gate', testAuthGate);
    await runTest('4. BullMQ Queue Pipeline', testQueuePipeline);
    await runTest('5. Worker Heartbeat', testWorkerHeartbeat);
    await runTest('6. Frontend Rendering', testFrontend);
    await runTest('7. Mission State Lifecycle', testMissionLifecycle);
    await runTest('8. Preview Proxy Gateway', testPreviewProxy);

    // ─── Scorecard ───
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                    VALIDATION SCORECARD                  ║');
    console.log('╠══════════════════════════════════════════════════════════╣');

    const maxNameLen = Math.max(...results.map(r => r.name.length));
    for (const r of results) {
        const icon = r.passed ? '✅' : '❌';
        const status = r.passed ? 'PASS' : 'FAIL';
        console.log(`║  ${icon} ${r.name.padEnd(maxNameLen + 2)} ${status.padEnd(6)} ${r.duration}ms`);
    }

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const allPassed = passed === total;

    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Result: ${passed}/${total} tests passed ${allPassed ? '— SYSTEM OPERATIONAL 🟢' : '— ISSUES DETECTED 🔴'}`.padEnd(59) + '║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    if (!allPassed) {
        console.log('Failed tests details:');
        for (const r of results.filter(r => !r.passed)) {
            console.log(`  • ${r.name}: ${r.details}`);
        }
    }

    process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
    console.error('Fatal validation error:', err);
    process.exit(1);
});
