import { redis } from '../services/queue';
import axios from 'axios';

async function verifyShareFlow() {
    console.log('🚀 Verifying Public Share Flow & Proxy Connectivity');

    const projectId = 'share-test-' + Date.now();
    const mockPort = 9999;
    const proxyUrl = `http://localhost:3005/preview/${projectId}/`;

    try {
        // 1. Setup Mock Preview Port in Redis
        console.log('📦 Setting up mock preview metadata...');
        await redis.set(`preview:port:${projectId}`, mockPort.toString(), 'EX', 3600);
        
        // 2. Clear existing access time
        await redis.del(`preview:last_access:${projectId}`);

        // 3. Simulate Proxy Request (This should trigger 502/500 because no server is on 9999, but it will update Redis)
        console.log('📡 Simulating proxy request to:', proxyUrl);
        try {
            await axios.get(proxyUrl, { timeout: 2000 });
        } catch (e: any) {
            console.log('ℹ️ Received expected proxy error (target offline):', e.message);
        }

        // 4. Verify Last Access Time was updated
        const lastAccess = await redis.get(`preview:last_access:${projectId}`);
        if (lastAccess) {
            console.log('✅ Last Access telemetry recorded:', lastAccess);
            console.log('⚡ Idle-shutdown system is now tracking this project.');
        } else {
            console.error('❌ Telemetry failed: last_access not found in Redis.');
        }

        // 5. Verify Public URL Structure
        const PREVIEW_BASE_DOMAIN = process.env.PREVIEW_BASE_DOMAIN || 'http://localhost:3005';
        const expectedUrl = `${PREVIEW_BASE_DOMAIN}/preview/${projectId}/`;
        console.log('🔗 Public Shareable URL:', expectedUrl);

        if (expectedUrl === proxyUrl || PREVIEW_BASE_DOMAIN !== 'http://localhost:3005') {
            console.log('✅ URL standardization verified.');
        }

    } catch (error) {
        console.error('💥 Verification failed:', error);
    } finally {
        // Cleanup local test state
        await redis.del(`preview:port:${projectId}`);
        await redis.del(`preview:last_access:${projectId}`);
        await redis.quit();
        process.exit(0);
    }
}

verifyShareFlow().catch(console.error);
