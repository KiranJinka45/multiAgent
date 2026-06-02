import { startGatewayServer } from '../apps/gateway/src/server.js';
import axios from 'axios';

async function runDrill() {
    console.log('=== Drill 1: Live Gateway Request Trace ===');
    console.log('[Drill] Bootstrapping Gateway Server locally...');
    

    
    // Start the server
    const serverPromise = startGatewayServer();
    
    // Wait for it to boot
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('[Drill] Server should be up. Dispatching POST /api/admin/intelligence/coordinate');
    
    try {
        const response = await axios.post('http://localhost:3102/api/admin/intelligence/coordinate?tenantId=test-tenant-123', {
            objective: "Scan database for unused indexes and drop them."
        });
        
        console.log('\n=== Response ===');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (err: any) {
        console.error('\n=== Error Received ===');
        if (err.response) {
            console.error(JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message);
        }
    }
    
    console.log('\n[Drill] Shutting down.');
    process.exit(0);
}

runDrill();
