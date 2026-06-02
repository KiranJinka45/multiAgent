import axios from 'axios';

async function runTrace() {
    console.log('[Trace] Sending objective to gateway...');
    try {
        const response = await axios.post('http://127.0.0.1:4000/api/admin/intelligence/coordinate?tenantId=platform-admin', {
            objective: "Add additional logging to the database layer to track slow queries."
        });
        
        console.log('[Trace] Response received:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (err) {
        console.error('[Trace] Error:', err.response ? err.response.data : err.message);
    }
}

runTrace();
