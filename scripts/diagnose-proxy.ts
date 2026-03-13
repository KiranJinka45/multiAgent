import { redis } from '../services/queue';
import axios from 'axios';

async function diagnose() {
    const projectId = 'diag-' + Date.now();
    console.log('--- Diagnosis Start ---');
    console.log('Project ID:', projectId);
    
    // Set mock port
    await redis.set(`preview:port:${projectId}`, '8080');
    
    console.log('Triggering proxy request...');
    try {
        await axios.get(`http://localhost:3010/preview/${projectId}/`, { timeout: 3000 });
    } catch (e) {
        console.log('Proxy request finished (expected error).');
    }

    const lastAccess = await redis.get(`preview:last_access:${projectId}`);
    console.log('Redis last_access:', lastAccess);
    
    if (lastAccess) {
        console.log('✅ SUCCESS: Proxy is updating Redis.');
    } else {
        console.log('❌ FAILURE: Proxy is NOT updating Redis.');
    }
    
    await redis.del(`preview:port:${projectId}`);
    await redis.del(`preview:last_access:${projectId}`);
    await redis.quit();
}

diagnose();
