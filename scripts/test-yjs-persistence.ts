import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import WebSocket from 'ws';
import { prisma } from '@libs/db';

// Polyfill WebSocket for node
(global as any).WebSocket = WebSocket;

async function runTest() {
    console.log('🚀 Starting Yjs Persistence Test...');
    
    const docName = `test-room-${Date.now()}`;
    const ydoc1 = new Y.Doc();
    
    // 1. Connect first client and add data
    console.log(`Connecting client 1 to room: ${docName}`);
    const provider1 = new WebsocketProvider('ws://localhost:3011', docName, ydoc1);
    
    await new Promise(r => setTimeout(r, 2000));
    
    ydoc1.getText('content').insert(0, 'Hello from Persistence Test!');
    console.log('Data inserted by client 1');
    
    await new Promise(r => setTimeout(r, 2000));
    provider1.disconnect();
    
    // 2. Verify data exists in Postgres
    console.log('Checking Postgres for persisted state...');
    const persistedDoc = await prisma.collaborativeDoc.findUnique({
        where: { name: docName }
    });
    
    if (persistedDoc && persistedDoc.updates) {
        console.log('✅ SUCCESS: Data found in Postgres.');
    } else {
        console.log('❌ FAILURE: Data NOT found in Postgres.');
        process.exit(1);
    }
    
    // 3. Connect second client and verify sync
    console.log('Connecting client 2 to verify sync from persistence...');
    const ydoc2 = new Y.Doc();
    const provider2 = new WebsocketProvider('ws://localhost:3011', docName, ydoc2);
    
    await new Promise(r => setTimeout(r, 3000));
    
    const content = ydoc2.getText('content').toString();
    if (content === 'Hello from Persistence Test!') {
        console.log('✅ SUCCESS: Client 2 synced correctly from persistence.');
    } else {
        console.log(`❌ FAILURE: Client 2 content mismatch. Got: "${content}"`);
        process.exit(1);
    }
    
    // Cleanup
    provider2.disconnect();
    await prisma.collaborativeDoc.delete({ where: { name: docName } });
    console.log('\n🏁 Yjs Persistence Test Finished Successfully.');
    process.exit(0);
}

runTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
