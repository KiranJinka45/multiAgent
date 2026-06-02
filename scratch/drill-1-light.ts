import express from 'express';
import adminRouter from '../apps/gateway/src/routes/admin.js';
import axios from 'axios';
import * as llmModule from '../packages/utils/src/llm.js';



async function runDrill() {
    console.log('=== Drill 1: Live Gateway Request Trace ===');
    console.log('[Drill] Bootstrapping lightweight Gateway express app...');
    
    process.env.LLM_PROVIDER = 'groq';
    
    const app = express();
    app.use(express.json());
    // Mount the exact same admin router used in the real Gateway
    app.use('/api/admin', adminRouter);
    
    const server = app.listen(3102, async () => {
        console.log('[Drill] Server running on 3102. Dispatching POST /api/admin/intelligence/coordinate');
        
        try {
            const response = await axios.post('http://localhost:3102/api/admin/intelligence/coordinate?tenantId=test-tenant-123', {
                objective: "Scan database for unused indexes and drop them."
            });
            
            console.log('\n=== HTTP Response ===');
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
        server.close();
        process.exit(0);
    });
}

runDrill();
